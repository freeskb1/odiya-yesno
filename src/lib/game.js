import { QUESTIONS } from "./questions";

// ============================================
// 한국어 조사 처리 유틸
// ============================================
export function hasJongseong(str) {
  if (!str || typeof str !== "string") return false;
  const lastChar = str[str.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

export function josa(name, pair) {
  if (!name) return "";
  const [withJong, withoutJong] = pair.split("/");
  return name + (hasJongseong(name) ? withJong : withoutJong);
}

// ============================================
// 게임 룸 코드
// ============================================
export function generateRoomCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

// ============================================
// 피라미드
// ============================================
export function getCardCountForDepth(depth) {
  let total = 0;
  for (let i = 1; i <= depth; i++) total += i;
  return total;
}

// 배열 셔플 (Fisher-Yates - sort 보다 균등)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================
// 전체 게임 질문 풀 생성 (라운드 순서 + 플레이어 순서 고려)
// ============================================
//
// playerOrder: [pid1, pid2, pid1, pid2] (라운드별 선플레이어)
// perRoundCount: 라운드당 필요 질문 수
// usedQuestionsByPlayer: { [playerId]: [질문문자열, ...] } - 이전에 사용한 질문들
//
// 반환:
//   pool: [질문, 질문, ...] (라운드 순서대로 평탄화된 배열, 전체 길이 = totalRounds * perRoundCount)
//   newUsedQuestions: { [playerId]: [...] } - 갱신된 사용 질문 (기존 + 이번 게임)
//
// 각 라운드의 perRoundCount 만큼 질문은:
// 1. 그 라운드의 선플레이어가 이전 게임에서 받았던 질문 제외
// 2. 그 라운드의 선플레이어가 이번 게임의 이전 라운드에서 받은 질문도 제외
// 3. 남은 질문 중에서 무작위로 perRoundCount 개 선택
//
export function buildGameQuestionPool(playerOrder, perRoundCount, usedQuestionsByPlayer = {}) {
  const totalRounds = playerOrder.length;
  const pool = [];

  // 누적 사용 질문 (기존 + 이번 게임 진행 중에 추가)
  const cumulativeUsed = {};
  for (const pid in usedQuestionsByPlayer) {
    cumulativeUsed[pid] = new Set(usedQuestionsByPlayer[pid] || []);
  }
  // playerOrder 의 모든 플레이어에 대해 초기화
  for (const pid of playerOrder) {
    if (!cumulativeUsed[pid]) cumulativeUsed[pid] = new Set();
  }

  for (let r = 0; r < totalRounds; r++) {
    const leadPid = playerOrder[r];
    const usedSet = cumulativeUsed[leadPid];

    // 사용 가능한 질문 = 전체 질문 - 이 사람이 받은 적 있는 질문
    let available = QUESTIONS.filter((q) => !usedSet.has(q));

    // 만약 부족하면 (이 사람이 거의 모든 질문을 다 받음) → 사용 이력 초기화 (안전장치)
    if (available.length < perRoundCount) {
      cumulativeUsed[leadPid] = new Set();
      available = [...QUESTIONS];
    }

    // 셔플 후 perRoundCount 개 추출
    const shuffled = shuffle(available);
    const chosen = shuffled.slice(0, perRoundCount);

    // 풀에 추가
    pool.push(...chosen);

    // 누적 사용 질문에 기록
    for (const q of chosen) {
      cumulativeUsed[leadPid].add(q);
    }
  }

  // Set → Array 로 변환해서 반환 (Firebase 저장용)
  const newUsedQuestions = {};
  for (const pid in cumulativeUsed) {
    newUsedQuestions[pid] = Array.from(cumulativeUsed[pid]);
  }

  return { pool, newUsedQuestions };
}

// 라운드별 카드 추출
export function buildPyramidFromPool(pool, roundIdx, depth) {
  const cardCount = getCardCountForDepth(depth);
  const start = roundIdx * cardCount;
  const cards = pool.slice(start, start + cardCount);

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

export function buildMachobaFromPool(pool, roundIdx, count) {
  const start = roundIdx * count;
  return pool.slice(start, start + count);
}

// ============================================
// 게임 진행 유틸 (피라미드)
// ============================================
export function getCardIndexAtLevel(answers, targetLevel) {
  if (targetLevel === 1) return 0;
  let idx = 0;
  for (let i = 0; i < targetLevel - 1; i++) {
    if (answers[i] && answers[i].answer === "NO") idx += 1;
  }
  return idx;
}

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

export function getDestination(answers) {
  if (!answers || answers.length === 0) return null;
  const depth = answers.length;
  const finalIdx = getCardIndexAtLevel(answers, depth);
  const finalAns = answers[depth - 1].answer;
  return `${finalIdx}${finalAns === "Y" || finalAns === "YES" ? "Y" : "N"}`;
}

export function getAnswerSequence(answers) {
  return (answers || []).map((a) => a.answer);
}

// ============================================
// 라운드 / 플레이어 순서
// ============================================
export function calculateTotalRounds(playerCount) {
  if (playerCount >= 5) return playerCount;
  return playerCount * 2;
}

export function buildLeadPlayerOrder(playerIds) {
  const totalRounds = calculateTotalRounds(playerIds.length);
  const shuffled = shuffle(playerIds);
  const order = [];
  for (let i = 0; i < totalRounds; i++) {
    order.push(shuffled[i % playerIds.length]);
  }
  return order;
}

// ============================================
// 소울메이트
// ============================================
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

// ============================================
// 마쵸바
// ============================================
export function countMachobaMatches(myVote, leadAnswers) {
  if (!myVote || !leadAnswers) return 0;
  let count = 0;
  for (let i = 0; i < Math.min(myVote.length, leadAnswers.length); i++) {
    if (myVote[i] === leadAnswers[i]) count += 1;
  }
  return count;
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
