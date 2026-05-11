import { Card } from "./Card";
import { getCurrentQuestion, getThirdLevelIndex } from "../lib/game";

export default function Pyramid({ pyramid, mode, onCardTap }) {
  const answers = pyramid.answers || [];
  const currentQ = getCurrentQuestion(pyramid);

  // 현재 어느 2층/3층 카드를 향해 가고 있는지 (answers 길이에 따라)
  // answers.length === 0: 1층 답변 전 - 2층/3층 모두 disabled
  // answers.length === 1: 1층 답변 완료 - 2층 한쪽이 current
  // answers.length === 2: 2층까지 답변 - 3층 하나가 current
  // answers.length === 3: 모두 답변 완료

  const currentLevel2Idx = answers.length >= 1 ? (answers[0].answer === "YES" ? 0 : 1) : -1;
  const currentLevel3Idx = answers.length >= 2 ? getThirdLevelIndex(answers.slice(0, 2)) : -1;

  function getCardVariant(level, idx) {
    if (mode === "voting") return "active";

    const isCurrent = currentQ?.level === level && currentQ.cardIndex === idx;

    if (level === 1) {
      if (answers.length >= 1) return "passed";
      if (isCurrent) return mode === "answering-lead" ? "current" : "disabled";
      return "disabled";
    }
    if (level === 2) {
      if (answers.length === 0) return "disabled";
      if (idx !== currentLevel2Idx) return "disabled"; // 다른 분기는 비활성
      if (answers.length === 1) return mode === "answering-lead" ? "current" : "disabled";
      return "passed"; // answers.length >= 2
    }
    // level 3
    if (answers.length < 2) return "disabled";
    if (idx !== currentLevel3Idx) return "disabled";
    if (answers.length === 2) return mode === "answering-lead" ? "current" : "disabled";
    return "passed"; // answers.length >= 3
  }

  function getPassedAnswer(level, idx) {
    if (level === 1 && answers.length >= 1) return answers[0].answer;
    if (level === 2 && answers.length >= 2 && idx === currentLevel2Idx) return answers[1].answer;
    if (level === 3 && answers.length >= 3 && idx === currentLevel3Idx) return answers[2].answer;
    return undefined;
  }

  function handleTap(level, idx, text) {
    if (!onCardTap) return;
    const variant = getCardVariant(level, idx);
    if (variant === "passed" || variant === "disabled") return;
    const isCurrent = variant === "current";
    onCardTap(level, text, isCurrent);
  }

  return (
    <div>
      {/* 1층 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <div style={{ width: "33%" }}>
          <Card
            text={pyramid.level1}
            level={1}
            variant={getCardVariant(1, 0)}
            passedAnswer={getPassedAnswer(1, 0)}
            onClick={() => handleTap(1, 0, pyramid.level1)}
          />
        </div>
      </div>

      {/* 2층 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <div style={{ width: "66%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {pyramid.level2.map((q, i) => (
            <Card
              key={i}
              text={q}
              level={2}
              variant={getCardVariant(2, i)}
              passedAnswer={getPassedAnswer(2, i)}
              onClick={() => handleTap(2, i, q)}
            />
          ))}
        </div>
      </div>

      {/* 3층 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 4 }}>
        {pyramid.level3.map((q, i) => (
          <Card
            key={i}
            text={q}
            level={3}
            variant={getCardVariant(3, i)}
            passedAnswer={getPassedAnswer(3, i)}
            onClick={() => handleTap(3, i, q)}
          />
        ))}
      </div>
    </div>
  );
}
