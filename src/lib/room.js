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
  createPyramid,
  createMachobaQuestions,
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
    gameMode: "odiya", // 'odiya' | 'machoba'
    depth: 3,
    machobaCount: 5,
    currentRound: 0,
    totalRounds: 0,
    currentLeadPlayerId: null,
    pyramid: null,
    machoba: null,
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
// 게임 시작
// ============================================
export async function startGame(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});
  if (playerIds.length < 2) return;

  const gameMode = room.gameMode || "odiya";
  const order = buildLeadPlayerOrder(playerIds);
  const totalRounds = calculateTotalRounds(playerIds.length);

  const updates = {
    status: "playing",
    currentRound: 1,
    totalRounds,
    currentLeadPlayerId: order[0],
    playerOrder: order,
    pyramid: null,
    machoba: null,
    votes: null,
    results: null,
  };

  if (gameMode === "odiya") {
    updates.pyramid = createPyramid(room.depth || 3);
  } else {
    // machoba 모드
    const count = room.machobaCount || 5;
    updates.machoba = {
      count,
      questions: createMachobaQuestions(count),
      leadAnswers: null, // 선 플레이어가 나중에 입력
    };
  }

  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 리게임 - 같은 멤버로 점수 초기화하고 다시 시작
// ============================================
export async function restartGame(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});
  if (playerIds.length < 2) return;

  const gameMode = room.gameMode || "odiya";
  const order = buildLeadPlayerOrder(playerIds);
  const totalRounds = calculateTotalRounds(playerIds.length);

  // 점수 초기화
  const playerUpdates = {};
  for (const pid of playerIds) {
    playerUpdates[`players/${pid}/score`] = 0;
  }

  const updates = {
    ...playerUpdates,
    status: "playing",
    currentRound: 1,
    totalRounds,
    currentLeadPlayerId: order[0],
    playerOrder: order,
    pyramid: null,
    machoba: null,
    votes: null,
    results: null,
  };

  if (gameMode === "odiya") {
    updates.pyramid = createPyramid(room.depth || 3);
  } else {
    const count = room.machobaCount || 5;
    updates.machoba = {
      count,
      questions: createMachobaQuestions(count),
      leadAnswers: null,
    };
  }

  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 대기실로 돌아가기 - 모드 변경 등을 위해
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
    votes: null,
    results: null,
    playerOrder: null,
  });
}

// ============================================
// 오디야 모드: 투표 (vote = "0Y", "0N" 등)
// ============================================
export async function submitVote(code, round, playerId, vote) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    vote,
    isCorrect: null,
  });
}

// ============================================
// 오디야 모드: 선 플레이어 답변
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
// 오디야 모드: 정답 공개
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
// 마쵸바: 투표자 답변 (배열 통째로)
// vote = ["YES", "NO", "YES", ...] (count 길이)
// ============================================
export async function submitMachobaVote(code, round, playerId, voteArray) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    voteArray,
    matchCount: null,
  });
}

// ============================================
// 마쵸바: 선 플레이어 답변 (배열 통째로)
// ============================================
export async function submitMachobaLeadAnswers(code, leadAnswers) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val();
  if (!room.machoba) return;

  await update(ref(db, `rooms/${code}/machoba`), {
    leadAnswers,
  });

  // 결과 기록
  await set(ref(db, `rooms/${code}/results/${room.currentRound}`), {
    leadPlayerId: room.currentLeadPlayerId,
    leadAnswers,
    questions: room.machoba.questions,
  });
}

// ============================================
// 마쵸바: 정답 공개 (matchCount 계산 + 점수)
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
// 다음 라운드
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

  const updates = {
    currentRound: nextRoundNum,
    currentLeadPlayerId: nextLead,
  };

  if (gameMode === "odiya") {
    updates.pyramid = createPyramid(room.depth || 3);
    updates.machoba = null;
  } else {
    const count = room.machobaCount || 5;
    updates.machoba = {
      count,
      questions: createMachobaQuestions(count),
      leadAnswers: null,
    };
    updates.pyramid = null;
  }

  await update(ref(db, `rooms/${code}`), updates);
}

// ============================================
// 방 닫기
// ============================================
export async function closeRoom(code) {
  await remove(ref(db, `rooms/${code}`));
}
