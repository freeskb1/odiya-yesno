import { QUESTIONS } from "./questions";

// ============================================
// 피라미드 구조
// ============================================
// depth=3: 1+2+3 = 6장, 도착지 6개
// depth=4: 1+2+3+4 = 10장, 도착지 8개
// depth=5: 1+2+3+4+5 = 15장, 도착지 10개
//
// 피라미드 형태:
// { depth: 3, levels: [[q], [q,q], [q,q,q]], answers: [] }

export function generateRoomCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

// 필요한 카드 수
export function getCardCountForDepth(depth) {
  let total = 0;
  for (let i = 1; i <= depth; i++) total += i;
  return total;
}

// 피라미드 생성
export function createPyramid(depth = 3) {
  const totalCards = getCardCountForDepth(depth);
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  const cards = shuffled.slice(0, totalCards);

  const levels = [];
  let idx = 0;
  for (let lv = 1; lv <= depth; lv++) {
    const levelCards = [];
    for (let i = 0; i < lv; i++) {
      levelCards.push(cards[idx++]);
    }
    levels.push(levelCards);
  }

  return {
    depth,
    levels,
    answers: [],
  };
}

// 특정 레벨의 카드 인덱스 계산
// 이전 답변들을 거쳐서 현재 어느 카드까지 왔는지
// YES → 왼쪽(인덱스 그대로), NO → 오른쪽(인덱스 +1)
export function getCardIndexAtLevel(answers, targetLevel) {
  if (targetLevel === 1) return 0;
  let idx = 0;
  for (let i = 0; i < targetLevel - 1; i++) {
    if (answers[i] && answers[i].answer === "NO") idx += 1;
  }
  return idx;
}

// 현재 답변할 차례의 카드
export function getCurrentQuestion(pyramid) {
  const answers = pyramid.answers || [];
  if (answers.length >= pyramid.depth) return null;

  const targetLevel = answers.length + 1;
  const cardIdx = getCardIndexAtLevel(answers, targetLevel);
  return {
    level: targetLevel,
    cardIndex: cardIdx,
    question: pyramid.levels[targetLevel - 1][cardIdx],
  };
}

// 도착지 - "{최종층인덱스}{Y/N}"
// 예: depth=3 → 도착지 6개 ("0Y", "0N", "1Y", "1N", "2Y", "2N")
// 예: depth=4 → 도착지 8개 ("0Y" ~ "3N")
export function getDestination(answers) {
  if (!answers || answers.length === 0) return null;
  const depth = answers.length;
  const finalIdx = getCardIndexAtLevel(answers, depth);
  const finalAns = answers[depth - 1].answer;
  return `${finalIdx}${finalAns === "Y" || finalAns === "YES" ? "Y" : "N"}`;
}

// 답변 경로로부터 모든 (level, cardIdx) 좌표 반환
// 시각화에 사용
export function getPathFromAnswers(answers) {
  const path = [];
  for (let lv = 1; lv <= answers.length; lv++) {
    const cardIdx = getCardIndexAtLevel(answers, lv);
    path.push({
      level: lv,
      cardIndex: cardIdx,
      answer: answers[lv - 1].answer,
    });
  }
  return path;
}

// 답변 시퀀스만 추출: ["YES", "NO", "NO"] 형태
export function getAnswerSequence(answers) {
  return (answers || []).map((a) => a.answer);
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
