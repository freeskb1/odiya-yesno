import { db, ensureSignedIn } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  serverTimestamp,
} from "firebase/database";
import {
  generateRoomCode,
  buildLeadPlayerOrder,
  calculateTotalRounds,
  buildGameQuestionPool,
  buildMachobaFromPool,
  buildNeomoyaScorePool,
  buildNeomoyaFunPool,
  buildNeomoyaScoreFromPool,
  countMachobaMatches,
} from "./game";

// ============================================
// 방 생성
// ============================================
export async function createRoom(nickname) {
  const user = await ensureSignedIn();

  let code = "";
  for (let i = 0; i < 10; i++) {
    code = generateRoomCode();
    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) break;
  }

  const playerId = user.uid;
  const roomData = {
    code,
    status: "waiting",
    gameMode: "machoba", // "machoba" | "neomoya"
    neomoyaSubMode: "score", // "score" or "fun"
    machobaCount: 5,
    neomoyaCount: 5, // 5, 10, 15
    rounds: 2, // 1, 2, 3 바퀴 (선플레이어 N번씩)
    currentRound: 0,
    totalRounds: 0,
    currentLeadPlayerId: null,
    machoba: null,
    neomoya: null,
    questionPool: null,
    usedQuestionsRoom: null, // 마쵸바 방 단위 사용 이력
    usedScenariosRoom: null, // 너모야 점수 모드 방 단위
    usedScenariosFun: null, // 너모야 재미 모드 방 단위
    playerOrder: null,
    createdAt: serverTimestamp(),
    players: {
      [playerId]: {
        nickname,
        isHost: true,
        score: 0,
        joinedAt: serverTimestamp(),
      },
    },
  };

  await set(ref(db, `rooms/${code}`), roomData);
  return { code, playerId };
}

// ============================================
// 방 입장
// ============================================
export async function joinRoom(code, nickname) {
  const user = await ensureSignedIn();

  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) {
    return { error: "존재하지 않는 방이에요" };
  }
  const room = snapshot.val();
  if (room.status !== "waiting") {
    return { error: "이미 게임이 시작된 방이에요" };
  }

  const players = room.players || {};
  for (const id in players) {
    if (players[id].nickname === nickname && id !== user.uid) {
      return { error: "이미 같은 닉네임의 플레이어가 있어요" };
    }
  }

  const playerId = user.uid;
  await set(ref(db, `rooms/${code}/players/${playerId}`), {
    nickname,
    isHost: false,
    score: 0,
    joinedAt: serverTimestamp(),
  });

  return { code, playerId };
}

// ============================================
// 방장 옵션
// ============================================
export async function updateGameMode(code, gameMode) {
  await update(ref(db, `rooms/${code}`), { gameMode });
}
export async function updateMachobaCount(code, machobaCount) {
  await update(ref(db, `rooms/${code}`), { machobaCount });
}
export async function updateNeomoyaSubMode(code, neomoyaSubMode) {
  await update(ref(db, `rooms/${code}`), { neomoyaSubMode });
}
export async function updateNeomoyaCount(code, neomoyaCount) {
  await update(ref(db, `rooms/${code}`), { neomoyaCount });
}
export async function updateRounds(code, rounds) {
  await update(ref(db, `rooms/${code}`), { rounds });
}

// ============================================
// 방 떠나기
// ============================================
export async function leaveRoom(code, playerId) {
  await remove(ref(db, `rooms/${code}/players/${playerId}`));
  const snapshot = await get(ref(db, `rooms/${code}/players`));
  if (!snapshot.exists()) {
    await remove(ref(db, `rooms/${code}`));
  }
}

// ============================================
// 방 구독
// ============================================
export function subscribeRoom(code, callback) {
  const roomRef = ref(db, `rooms/${code}`);
  const handler = (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  };
  onValue(roomRef, handler);
  return () => off(roomRef, "value", handler);
}

// ============================================
// 게임 초기화 헬퍼 (시작 / 리게임 공통)
// ============================================
function buildInitialUpdates(room, playerIds) {
  const gameMode = room.gameMode || "machoba";
  const rounds = room.rounds || 2; // 1/2/3바퀴

  // 너모야 재미 모드는 라운드 시스템 없음
  if (gameMode === "neomoya" && room.neomoyaSubMode === "fun") {
    const count = room.neomoyaCount || 5;
    const existingUsedFun = room.usedScenariosFun || [];
    const { pool, newUsed } = buildNeomoyaFunPool(count, existingUsedFun);

    return {
      status: "playing",
      currentRound: 1,
      totalRounds: 1, // 재미 모드는 단일 세션
      currentLeadPlayerId: null,
      playerOrder: null,
      questionPool: null,
      neomoya: {
        subMode: "fun",
        count,
        scenarios: pool,
      },
      usedScenariosFun: newUsed,
      machoba: null,
      votes: null,
      results: null,
      readyState: null,
      neomoyaFunAnswers: null,
      neomoyaProgress: null,
      machobaProgress: null,
      leadProgress: null,
    };
  }

  // 선플레이어 있는 모드 (마쵸바/너모야 점수)
  const order = buildLeadPlayerOrder(playerIds, rounds);
  const totalRounds = calculateTotalRounds(playerIds.length, rounds);

  const updates = {
    status: "playing",
    currentRound: 1,
    totalRounds,
    currentLeadPlayerId: order[0],
    playerOrder: order,
    machoba: null,
    neomoya: null,
    votes: null,
    results: null,
    readyState: null,
    neomoyaFunAnswers: null,
    neomoyaProgress: null,
    machobaProgress: null,
    leadProgress: null,
  };

  if (gameMode === "machoba") {
    const perRoundCount = room.machobaCount || 5;
    const existingUsed = room.usedQuestionsRoom || [];
    const { pool, newUsedQuestions } = buildGameQuestionPool(order, perRoundCount, existingUsed);
    updates.questionPool = pool;
    updates.usedQuestionsRoom = newUsedQuestions;
    updates.machoba = {
      count: perRoundCount,
      questions: buildMachobaFromPool(pool, 0, perRoundCount),
      leadAnswers: null,
    };
  } else if (gameMode === "neomoya") {
    // 점수 모드
    const perRoundCount = room.neomoyaCount || 5;
    const existingUsed = room.usedScenariosRoom || [];
    const { pool, newUsed } = buildNeomoyaScorePool(order, perRoundCount, existingUsed);
    updates.questionPool = pool;
    updates.usedScenariosRoom = newUsed;
    updates.neomoya = {
      subMode: "score",
      count: perRoundCount,
      scenarios: buildNeomoyaScoreFromPool(pool, 0, perRoundCount),
      leadAnswers: null,
    };
  }

  return updates;
}

// ============================================
// 게임 시작
// ============================================
export async function startGame(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});
  if (playerIds.length < 2) return;

  const updates = buildInitialUpdates(room, playerIds);
  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 리게임 (같은 멤버, 점수 0)
// ============================================
export async function restartGame(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});
  if (playerIds.length < 2) return;

  const updates = buildInitialUpdates(room, playerIds);
  for (const pid of playerIds) {
    updates[`players/${pid}/score`] = 0;
  }
  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 대기실 복귀
// ============================================
export async function returnToWaiting(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});

  const playerUpdates = {};
  for (const pid of playerIds) {
    playerUpdates[`players/${pid}/score`] = 0;
  }

  await update(ref(db, `rooms/${code}`), {
    ...playerUpdates,
    status: "waiting",
    currentRound: 0,
    totalRounds: 0,
    currentLeadPlayerId: null,
    machoba: null,
    neomoya: null,
    questionPool: null,
    votes: null,
    results: null,
    playerOrder: null,
    readyState: null,
    neomoyaFunAnswers: null,
    neomoyaProgress: null,
    machobaProgress: null,
    leadProgress: null,
  });
}

// ============================================
// 마쵸바: 투표자 답변
// ============================================
export async function submitMachobaVote(code, round, playerId, voteArray) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    voteArray,
    matchCount: null,
  });
}

// ============================================
// 마쵸바: 선 플레이어 답변
// ============================================
export async function submitMachobaLeadAnswers(code, leadAnswers) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  if (!room.machoba) return;

  await update(ref(db, `rooms/${code}/machoba`), {
    leadAnswers,
  });

  await set(ref(db, `rooms/${code}/results/${room.currentRound}`), {
    leadPlayerId: room.currentLeadPlayerId,
    leadAnswers,
    questions: room.machoba.questions,
  });
}

// ============================================
// 마쵸바: 정답 공개
// ============================================
export async function revealMachobaResult(code, round) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const result = room.results?.[round];
  if (!result || !result.leadAnswers) return;

  const votes = room.votes?.[round] || {};
  const updates = {};

  for (const playerId in votes) {
    const v = votes[playerId];
    const matchCount = countMachobaMatches(v.voteArray || [], result.leadAnswers);
    updates[`votes/${round}/${playerId}/matchCount`] = matchCount;

    if (matchCount > 0) {
      const player = room.players[playerId];
      if (player) {
        updates[`players/${playerId}/score`] = (player.score || 0) + matchCount;
      }
    }
  }

  updates[`results/${round}/revealed`] = true;
  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 다음 라운드 (questionPool에서 다음 슬라이스 꺼냄)
// ============================================
export async function nextRound(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();

  const nextRoundNum = room.currentRound + 1;
  if (nextRoundNum > room.totalRounds) {
    await update(ref(db, `rooms/${code}`), { status: "finished" });
    return;
  }

  const nextLead = room.playerOrder[nextRoundNum - 1];
  const gameMode = room.gameMode || "machoba";
  const pool = room.questionPool || [];

  const updates = {
    currentRound: nextRoundNum,
    currentLeadPlayerId: nextLead,
    leadProgress: null, // 새 라운드 시작 시 선플레이어 진행도 초기화
  };

  if (gameMode === "machoba") {
    const count = room.machobaCount || 5;
    updates.machoba = {
      count,
      questions: buildMachobaFromPool(pool, nextRoundNum - 1, count),
      leadAnswers: null,
    };
    updates.neomoya = null;
  } else if (gameMode === "neomoya") {
    // 너모야 점수 모드 (재미 모드는 nextRound 없음)
    const count = room.neomoyaCount || 5;
    updates.neomoya = {
      subMode: "score",
      count,
      scenarios: buildNeomoyaScoreFromPool(pool, nextRoundNum - 1, count),
      leadAnswers: null,
    };
    updates.machoba = null;
  }

  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 준비 체크 (정답자 공개 / 다음 라운드 대기)
// ============================================
// readyKey: "reveal" 또는 "next"
export async function markReady(code, round, readyKey, playerId) {
  await set(ref(db, `rooms/${code}/readyState/${round}/${readyKey}/${playerId}`), true);
}

// 준비 상태 초기화 (라운드 넘어갈 때)
export async function clearReadyState(code, round) {
  await remove(ref(db, `rooms/${code}/readyState/${round}`));
}

// ============================================
// 너모야 - 진행도 표시 (몇 번째 시나리오까지 답했는지)
// ============================================
// phase별로 분리: "fun" | "score-vote" | "score-lead"
export async function updateNeomoyaProgress(code, round, playerId, progressKey, current) {
  await set(ref(db, `rooms/${code}/neomoyaProgress/${round}/${progressKey}/${playerId}`), current);
}

// ============================================
// 마쵸바 - 진행도 표시 (몇 번째 문제까지 답했는지)
// ============================================
// progressKey: "vote" (일반 플레이어) | "lead" (선플레이어)
export async function updateMachobaProgress(code, round, playerId, progressKey, current) {
  await set(ref(db, `rooms/${code}/machobaProgress/${round}/${progressKey}/${playerId}`), current);
}

// ============================================
// 선플레이어 현재 진행 인덱스 (마쵸바+너모야 공통)
// 일반 플레이어 화면에 선플레이어가 보는 질문을 실시간 표시하기 위함
// step: 0-based (0 = 첫 문제, count = 모두 끝남)
// ============================================
export async function updateLeadProgress(code, round, step) {
  await set(ref(db, `rooms/${code}/leadProgress/${round}`), step);
}

// ============================================
// 너모야 점수 모드 - 마쵸바와 동일한 흐름
// ============================================
// 일반 플레이어 답변 (A/B 배열)
export async function submitNeomoyaScoreVote(code, round, playerId, voteArray) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    voteArray,
    matchCount: null,
  });
}

// 선플레이어 답변 (A/B 배열)
export async function submitNeomoyaScoreLeadAnswers(code, leadAnswers) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  if (!room.neomoya) return;

  await update(ref(db, `rooms/${code}/neomoya`), {
    leadAnswers,
  });

  await set(ref(db, `rooms/${code}/results/${room.currentRound}`), {
    leadPlayerId: room.currentLeadPlayerId,
    leadAnswers,
    scenarios: room.neomoya.scenarios,
  });
}

// 점수 모드 - 정답 공개 (마쵸바와 동일한 로직)
export async function revealNeomoyaScoreResult(code, round) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const result = room.results?.[round];
  if (!result || !result.leadAnswers) return;

  const votes = room.votes?.[round] || {};
  const updates = {};

  for (const playerId in votes) {
    const v = votes[playerId];
    const matchCount = countMachobaMatches(v.voteArray || [], result.leadAnswers);
    updates[`votes/${round}/${playerId}/matchCount`] = matchCount;

    if (matchCount > 0) {
      const player = room.players[playerId];
      if (player) {
        updates[`players/${playerId}/score`] = (player.score || 0) + matchCount;
      }
    }
  }

  updates[`results/${round}/revealed`] = true;
  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 너모야 재미 모드 - 동시 투표, 점수 없음
// ============================================
// 본인 답변 (A/B 배열) 제출
export async function submitNeomoyaFunAnswers(code, playerId, answers) {
  await set(ref(db, `rooms/${code}/neomoyaFunAnswers/${playerId}`), {
    answers,
    submittedAt: serverTimestamp(),
  });
}

// 재미 모드 종료 (모두 제출 완료 시 호출 - 결과 단계로)
export async function finishNeomoyaFun(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  await update(ref(db, `rooms/${code}`), {
    status: "finished",
  });
}

// ============================================
// 방 닫기
// ============================================
export async function closeRoom(code) {
  await remove(ref(db, `rooms/${code}`));
}
