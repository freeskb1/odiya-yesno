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
    depth: 3, // 기본 3단계
    currentRound: 0,
    totalRounds: 0,
    currentLeadPlayerId: null,
    pyramid: null,
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
// 방장: 단계 변경
// ============================================
export async function updateDepth(code, depth) {
  await update(ref(db, `rooms/${code}`), { depth });
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

  const depth = room.depth || 3;
  const order = buildLeadPlayerOrder(playerIds);
  const totalRounds = calculateTotalRounds(playerIds.length);
  const pyramid = createPyramid(depth);

  await update(ref(db, `rooms/${code}`), {
    status: "playing",
    currentRound: 1,
    totalRounds,
    currentLeadPlayerId: order[0],
    playerOrder: order,
    pyramid,
  });
}

// ============================================
// 투표 (vote = "0Y", "0N", "1Y" 등)
// ============================================
export async function submitVote(code, round, playerId, vote) {
  await set(ref(db, `rooms/${code}/votes/${round}/${playerId}`), {
    vote,
    isCorrect: null,
  });
}

// ============================================
// 선 플레이어 답변
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

  // depth 답변 완료 시 → 라운드 결과 기록
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
// 정답 공개
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
  const newPyramid = createPyramid(room.depth || 3);

  await update(ref(db, `rooms/${code}`), {
    currentRound: nextRoundNum,
    currentLeadPlayerId: nextLead,
    pyramid: newPyramid,
  });
}

// ============================================
// 방 닫기
// ============================================
export async function closeRoom(code) {
  await remove(ref(db, `rooms/${code}`));
}
