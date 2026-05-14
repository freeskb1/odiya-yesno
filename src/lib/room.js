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
  getCardCountForDepth,
  buildGameQuestionPool,
  buildPyramidFromPool,
  buildMachobaFromPool,
  buildNeomoyaScorePool,
  buildNeomoyaFunPool,
  buildNeomoyaScoreFromPool,
  countMachobaMatches,
  getDestination,
  getCurrentQuestion,
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
    gameMode: "odiya",
    neomoyaSubMode: "score", // "score" or "fun"
    depth: 3,
    machobaCount: 5,
    neomoyaCount: 5, // 5, 10, 15
    rounds: 2, // 1, 2, 3 바퀴 (오디야/마쵸바/너모야점수 모드)
    currentRound: 0,
    totalRounds: 0,
    currentLeadPlayerId: null,
    pyramid: null,
    machoba: null,
    neomoya: null,
    questionPool: null,
    usedQuestionsByPlayer: null,
    usedScenariosByPlayer: null, // 너모야 점수 모드용
    usedScenariosFun: null, // 너모야 재미 모드용 (방 단위)
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
export async function updateDepth(code, depth) {
  await update(ref(db, `rooms/${code}`), { depth });
}
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
  const gameMode = room.gameMode || "odiya";
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
        scenarios: pool, // 한 번에 모든 시나리오 노출 (인덱스별)
      },
      usedScenariosFun: newUsed,
      pyramid: null,
      machoba: null,
      votes: null,
      results: null,
      readyState: null,
      neomoyaFunAnswers: null,
    neomoyaProgress: null,
      neomoyaProgress: null,
    };
  }

  // 선플레이어 있는 모드 (오디야/마쵸바/너모야 점수)
  const order = buildLeadPlayerOrder(playerIds, rounds);
  const totalRounds = calculateTotalRounds(playerIds.length, rounds);

  const updates = {
    status: "playing",
    currentRound: 1,
    totalRounds,
    currentLeadPlayerId: order[0],
    playerOrder: order,
    pyramid: null,
    machoba: null,
    neomoya: null,
    votes: null,
    results: null,
    readyState: null,
    neomoyaFunAnswers: null,
    neomoyaProgress: null,
  };

  if (gameMode === "odiya") {
    const perRoundCount = getCardCountForDepth(room.depth || 3);
    const existingUsed = room.usedQuestionsByPlayer || {};
    const { pool, newUsedQuestions } = buildGameQuestionPool(order, perRoundCount, existingUsed);
    updates.questionPool = pool;
    updates.usedQuestionsByPlayer = newUsedQuestions;
    updates.pyramid = buildPyramidFromPool(pool, 0, room.depth || 3);
  } else if (gameMode === "machoba") {
    const perRoundCount = room.machobaCount || 5;
    const existingUsed = room.usedQuestionsByPlayer || {};
    const { pool, newUsedQuestions } = buildGameQuestionPool(order, perRoundCount, existingUsed);
    updates.questionPool = pool;
    updates.usedQuestionsByPlayer = newUsedQuestions;
    updates.machoba = {
      count: perRoundCount,
      questions: buildMachobaFromPool(pool, 0, perRoundCount),
      leadAnswers: null,
    };
  } else if (gameMode === "neomoya") {
    // 점수 모드
    const perRoundCount = room.neomoyaCount || 5;
    const existingUsed = room.usedScenariosByPlayer || {};
    const { pool, newUsed } = buildNeomoyaScorePool(order, perRoundCount, existingUsed);
    updates.questionPool = pool;
    updates.usedScenariosByPlayer = newUsed;
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
    pyramid: null,
    machoba: null,
    neomoya: null,
    questionPool: null,
    votes: null,
    results: null,
    playerOrder: null,
    readyState: null,
    neomoyaFunAnswers: null,
    neomoyaProgress: null,
  });
}

// ============================================
// 오디야: 투표
// ============================================
export async function submitVote(code, round, playerId, vote) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    vote,
    isCorrect: null,
  });
}

// ============================================
// 오디야: 선 플레이어 답변
// ============================================
export async function submitAnswer(code, answer) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  if (!room.pyramid) return;

  const currentQ = getCurrentQuestion(room.pyramid);
  if (!currentQ) return;

  const newAnswers = [
    ...(room.pyramid.answers || []),
    { level: currentQ.level, question: currentQ.question, answer },
  ];

  await update(ref(db, `rooms/${code}/pyramid`), {
    answers: newAnswers,
  });

  if (newAnswers.length === room.pyramid.depth) {
    const destination = getDestination(newAnswers);
    if (destination) {
      await set(ref(db, `rooms/${code}/results/${room.currentRound}`), {
        leadPlayerId: room.currentLeadPlayerId,
        answers: newAnswers,
        destination,
      });
    }
  }
}

// ============================================
// 오디야: 정답 공개
// ============================================
export async function revealResult(code, round) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const result = room.results?.[round];
  if (!result) return;

  const votes = room.votes?.[round] || {};
  const updates = {};

  for (const playerId in votes) {
    const v = votes[playerId];
    const isCorrect = v.vote === result.destination;
    updates[`votes/${round}/${playerId}/isCorrect`] = isCorrect;

    if (isCorrect) {
      const player = room.players[playerId];
      if (player) {
        updates[`players/${playerId}/score`] = (player.score || 0) + 1;
      }
    }
  }

  updates[`results/${round}/revealed`] = true;
  await update(ref(db, `rooms/${code}`), updates);
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
  const gameMode = room.gameMode || "odiya";
  const pool = room.questionPool || [];

  const updates = {
    currentRound: nextRoundNum,
    currentLeadPlayerId: nextLead,
  };

  if (gameMode === "odiya") {
    updates.pyramid = buildPyramidFromPool(pool, nextRoundNum - 1, room.depth || 3);
    updates.machoba = null;
    updates.neomoya = null;
  } else if (gameMode === "machoba") {
    const count = room.machobaCount || 5;
    updates.machoba = {
      count,
      questions: buildMachobaFromPool(pool, nextRoundNum - 1, count),
      leadAnswers: null,
    };
    updates.pyramid = null;
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
    updates.pyramid = null;
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
