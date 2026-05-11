import { QUESTIONS } from "./questions";

// 3자리 방 코드 생성 (100-999)
export function generateRoomCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

// 질문 풀에서 6장 추출 + 피라미드 생성
export function createPyramid() {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  const six = shuffled.slice(0, 6);
  return {
    level1: six[0],
    level2: [six[1], six[2]],
    level3: [six[3], six[4], six[5]],
    answers: [],
  };
}

// 1층/2층 답변에 따른 3층 인덱스 (YES → 왼쪽, NO → 오른쪽)
export function getThirdLevelIndex(answers) {
  let idx = 0;
  for (const a of answers.slice(0, 2)) {
    if (a.answer === "NO") idx += 1;
  }
  return idx;
}

// 도착지 - 6개 (3층 카드 인덱스 + YES/NO)
// 형식: "0Y", "0N", "1Y", "1N", "2Y", "2N"
export function getDestination(answers) {
  if (answers.length < 3) return null;
  const thirdIdx = getThirdLevelIndex(answers.slice(0, 2));
  const thirdAns = answers[2].answer;
  return `${thirdIdx}${thirdAns === "YES" ? "Y" : "N"}`;
}

// 가능한 모든 도착지 6개 (UI에서 투표 옵션으로 사용)
export const ALL_DESTINATIONS = ["0Y", "0N", "1Y", "1N", "2Y", "2N"];

// 도착지를 사람이 읽을 수 있는 형태로
export function describeDestination(dest, pyramid) {
  if (!dest || !pyramid) return "";
  const idx = parseInt(dest[0], 10);
  const yn = dest[1] === "Y" ? "YES" : "NO";
  return `${pyramid.level3[idx]} → ${yn}`;
}

// 현재 답변할 차례의 카드
export function getCurrentQuestion(pyramid) {
  const answers = pyramid.answers || [];
  if (answers.length === 0) return { level: 1, question: pyramid.level1, cardIndex: 0 };
  if (answers.length === 1) {
    const idx = answers[0].answer === "YES" ? 0 : 1;
    return { level: 2, question: pyramid.level2[idx], cardIndex: idx };
  }
  if (answers.length === 2) {
    const idx = getThirdLevelIndex(answers);
    return { level: 3, question: pyramid.level3[idx], cardIndex: idx };
  }
  return null;
}

// 라운드 수 계산
export function calculateTotalRounds(playerCount) {
  if (playerCount >= 5) return playerCount;
  return playerCount * 2;
}

// 선 플레이어 순서 생성
export function buildLeadPlayerOrder(playerIds) {
  const totalRounds = calculateTotalRounds(playerIds.length);
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const order = [];
  for (let i = 0; i < totalRounds; i++) {
    order.push(shuffled[i % playerIds.length]);
  }
  return order;
}

// "나를 가장 잘 맞춘 사람" 계산
export function calculateSoulmate(myPlayerId, myLeadRounds, allVotes) {
  if (myLeadRounds.length === 0) {
    return { soulmateIds: [], correctCount: 0, totalCount: 0 };
  }

  const relevant = allVotes.filter(
    (v) => myLeadRounds.includes(v.round) && v.playerId !== myPlayerId
  );

  const counts = {};
  for (const v of relevant) {
    if (counts[v.playerId] === undefined) counts[v.playerId] = 0;
    if (v.isCorrect === true) counts[v.playerId] += 1;
  }

  let maxCorrect = 0;
  for (const id in counts) {
    if (counts[id] > maxCorrect) maxCorrect = counts[id];
  }

  if (maxCorrect === 0) {
    return { soulmateIds: [], correctCount: 0, totalCount: myLeadRounds.length };
  }

  const soulmateIds = Object.entries(counts)
    .filter(([, c]) => c === maxCorrect)
    .map(([id]) => id);

  return {
    soulmateIds,
    correctCount: maxCorrect,
    totalCount: myLeadRounds.length,
  };
}

// 아바타 색상
const AVATAR_COLORS = [
  "#1D9E75", "#D4537E", "#534AB7", "#BA7517",
  "#1B7AB6", "#A53FAB", "#E27D3D", "#5A8B2F",
];

export function getAvatarColor(nickname) {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash * 31 + nickname.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
