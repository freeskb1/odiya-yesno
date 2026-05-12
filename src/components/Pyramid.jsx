import { Card } from "./Card";
import { getCardIndexAtLevel, getCurrentQuestion } from "../lib/game";

// mode:
//   "voting" - 모든 카드 disabled (회색) - 본인 답변 단계가 아닐 때
//   "answering-lead" - 선 플레이어가 답할 차례 - 현재 카드 current, 지나간 길 passed, 그 외 skip/disabled
//   "answering-watch" - 다른 사람이 답하는 걸 보는 중 - 같은 표시지만 클릭 불가
//   "final-confirm" - 본인이 답변 완료, 본인 경로 강조 - passed 카드 + skip 카드
//   "result" - 라운드 결과 - leadAnswers 표시
//
// leadAnswers: pyramid.answers (선 플레이어가 답변한 결과, "result" 모드용)
// myAnswers: 투표자가 단계별로 답한 답변들 (final-confirm 모드용)
//   형식: [{ level, question, answer }]
export default function Pyramid({ pyramid, mode, onCardTap, myAnswers }) {
  if (!pyramid) return null;
  const depth = pyramid.depth || 3;
  const leadAnswers = pyramid.answers || [];
  const currentQ = mode === "answering-lead" || mode === "answering-watch" ? getCurrentQuestion(pyramid) : null;

  // 어떤 경로를 강조해야 하는지
  // - "answering-*"  : 선 플레이어의 leadAnswers 경로
  // - "final-confirm": 투표자의 myAnswers 경로
  // - "result"       : 선 플레이어의 leadAnswers 경로 (완료된)
  // - "voting"       : 경로 없음 (모든 카드 비활성)
  let pathAnswers = [];
  if (mode === "final-confirm" && myAnswers) {
    pathAnswers = myAnswers;
  } else if (mode === "result" || mode === "answering-lead" || mode === "answering-watch") {
    pathAnswers = leadAnswers;
  }

  // 각 (level, cardIdx) 좌표에 대한 variant 결정
  function getVariant(level, cardIdx) {
    // voting 모드: 모두 disabled
    if (mode === "voting") return "disabled";

    // pathAnswers를 따라가며 현재 좌표가 경로 위에 있는지 확인
    const pathIdxAtLevel = getCardIndexAtLevel(pathAnswers, level);
    const isOnPath = cardIdx === pathIdxAtLevel;

    // 이 레벨까지 답변이 있었는지
    const hasAnswerAtThisLevel = pathAnswers.length >= level;

    // 현재 답변 중인 카드
    if (currentQ && currentQ.level === level && currentQ.cardIndex === cardIdx) {
      return mode === "answering-lead" ? "current" : "disabled";
    }

    if (hasAnswerAtThisLevel && isOnPath) {
      return "passed"; // 지나간 경로의 카드
    }

    if (isOnPath) {
      // 경로 위에는 있지만 아직 답변 안 함 → 다음 차례 후보
      return "disabled";
    }

    // 경로 밖의 카드
    // - 답변이 진행되었다면 → skip (선택 안 한 길)
    // - 아직 답변 안 시작 → disabled
    if (pathAnswers.length >= level - 1 && level <= pathAnswers.length + 1) {
      return "skip";
    }
    return "disabled";
  }

  function getPassedAnswer(level, cardIdx) {
    if (pathAnswers.length < level) return undefined;
    const idxAtLevel = getCardIndexAtLevel(pathAnswers, level);
    if (idxAtLevel !== cardIdx) return undefined;
    return pathAnswers[level - 1].answer;
  }

  function handleTap(level, cardIdx) {
    if (!onCardTap) return;
    if (mode !== "answering-lead") return;
    const variant = getVariant(level, cardIdx);
    if (variant !== "current") return;
    const q = pyramid.levels[level - 1][cardIdx];
    onCardTap(level, q);
  }

  // 레벨별 카드 너비 계산
  function getRowWidth(level) {
    return (level / depth) * 100;
  }

  return (
    <div style={{ width: "100%" }}>
      {pyramid.levels.map((row, levelIdx) => {
        const level = levelIdx + 1;
        const cards = row;
        return (
          <div
            key={level}
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: `${getRowWidth(level)}%`,
                display: "grid",
                gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
                gap: 4,
              }}
            >
              {cards.map((text, cardIdx) => (
                <Card
                  key={cardIdx}
                  text={text}
                  level={level}
                  depth={depth}
                  variant={getVariant(level, cardIdx)}
                  passedAnswer={getPassedAnswer(level, cardIdx)}
                  onClick={() => handleTap(level, cardIdx)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
