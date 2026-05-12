import { Card } from "./Card";
import { getCardIndexAtLevel, getCurrentQuestion } from "../lib/game";

// mode:
//   "voting"           - 모든 카드 disabled (피라미드 보면서 결정할 때 - 거의 안 씀)
//   "answering-lead"   - 선 플레이어 답할 차례 - 현재 카드 current, 지나간 길 passed
//   "answering-watch"  - 다른 사람이 답하는 걸 보는 중 (내 투표 전)
//   "watching"         - 내 투표 후 선 플레이어 답변 시청 중 - 내 예측 경로 점선 표시
//   "final-confirm"    - 본인 답변 완료, 본인 경로 강조
//   "result"           - 라운드 결과 - leadAnswers 진한 색
//
// myAnswers: 투표자의 예측 답변들 (watching, final-confirm 모드에서 사용)
export default function Pyramid({ pyramid, mode, onCardTap, myAnswers }) {
  if (!pyramid) return null;
  const depth = pyramid.depth || 3;
  const leadAnswers = pyramid.answers || [];
  const currentQ = mode === "answering-lead" || mode === "answering-watch" ? getCurrentQuestion(pyramid) : null;

  // leadPath: 선 플레이어 답변 경로 (passed 표시용)
  // myGuessPath: 내 예측 경로 (점선 표시용)
  let leadPath = [];
  let myGuessPath = [];

  if (mode === "answering-lead" || mode === "answering-watch") {
    leadPath = leadAnswers;
  } else if (mode === "watching") {
    leadPath = leadAnswers; // 선 플레이어가 답한 만큼 표시
    myGuessPath = myAnswers || [];
  } else if (mode === "final-confirm") {
    myGuessPath = myAnswers || [];
  } else if (mode === "result") {
    leadPath = leadAnswers;
  }

  function getVariant(level, cardIdx) {
    if (mode === "voting") return "disabled";

    // 현재 답할 카드 (선 플레이어용)
    if (currentQ && currentQ.level === level && currentQ.cardIndex === cardIdx) {
      return mode === "answering-lead" ? "current" : "disabled";
    }

    // 선 플레이어 답변 경로의 카드
    if (leadPath.length >= level) {
      const leadIdxAtLevel = getCardIndexAtLevel(leadPath, level);
      if (cardIdx === leadIdxAtLevel) {
        return "passed";
      }
    }

    // 내 예측 경로의 카드 (선 플레이어 답변과 일치하지 않을 때만 표시)
    // 일치하면 위에서 passed 가 우선
    if (myGuessPath.length >= level) {
      const myIdxAtLevel = getCardIndexAtLevel(myGuessPath, level);
      if (cardIdx === myIdxAtLevel) {
        return "my-guess";
      }
    }

    return "disabled";
  }

  function getPassedAnswer(level, cardIdx) {
    if (leadPath.length < level) return undefined;
    const idxAtLevel = getCardIndexAtLevel(leadPath, level);
    if (idxAtLevel !== cardIdx) return undefined;
    return leadPath[level - 1].answer;
  }

  function getMyGuessAnswer(level, cardIdx) {
    if (myGuessPath.length < level) return undefined;
    const idxAtLevel = getCardIndexAtLevel(myGuessPath, level);
    if (idxAtLevel !== cardIdx) return undefined;
    return myGuessPath[level - 1].answer;
  }

  function handleTap(level, cardIdx) {
    if (!onCardTap) return;
    if (mode !== "answering-lead") return;
    const variant = getVariant(level, cardIdx);
    if (variant !== "current") return;
    const q = pyramid.levels[level - 1][cardIdx];
    onCardTap(level, q);
  }

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
                  myGuessAnswer={getMyGuessAnswer(level, cardIdx)}
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
