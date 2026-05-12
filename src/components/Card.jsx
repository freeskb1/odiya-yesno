import { colors, radius, shadow } from "../lib/theme";

// variant:
//   "current"    - 현재 답할 카드 (반짝)
//   "passed"     - 답변 완료된 카드 (진한 색 + YES/NO 표시)
//   "my-guess"   - 내가 예측한 경로의 카드 (점선 강조, 답변 결과 보기 전 떨림 효과)
//   "disabled"   - 비활성 (회색)
//   "active"     - 일반 (탭 가능)
export function Card({ text, level, depth, variant = "active", passedAnswer, myGuessAnswer, onClick }) {
  const isCompact = depth >= 4;
  const fontSize = isCompact ? 9 : level === 1 ? 11 : 10;

  // 내 예측 경로 (점선 + 살짝 강조 + 내 예측 답변 작게 표시)
  if (variant === "my-guess") {
    const isYes = myGuessAnswer === "YES";
    const accentColor = isYes ? colors.correctFill : colors.wrongFill;
    return (
      <div
        style={{
          padding: isCompact ? "6px 3px" : "8px 4px",
          borderRadius: radius.md,
          textAlign: "center",
          background: colors.surface,
          border: `2px dashed ${accentColor}`,
          boxShadow: shadow.sm,
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 600,
            color: colors.text2,
            lineHeight: 1.25,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
        <div
          style={{
            fontSize: fontSize - 1,
            fontWeight: 700,
            color: accentColor,
            marginTop: 3,
            opacity: 0.85,
          }}
        >
          내 예측: {myGuessAnswer}
        </div>
      </div>
    );
  }

  // passed: 답변 완료한 카드
  if (variant === "passed") {
    const isYes = passedAnswer === "YES";
    return (
      <div
        style={{
          padding: isCompact ? "6px 3px" : "8px 4px",
          borderRadius: radius.md,
          textAlign: "center",
          background: isYes ? colors.correctBg : colors.wrongBg,
          border: `2px solid ${isYes ? colors.correctFill : colors.wrongFill}`,
          boxShadow: isYes
            ? "0 2px 4px rgba(29,158,117,0.15)"
            : "0 2px 4px rgba(226,75,74,0.15)",
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 600,
            color: isYes ? colors.correctDeep : colors.wrongText,
            lineHeight: 1.25,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
        <div
          style={{
            fontSize: fontSize - 0.5,
            fontWeight: 700,
            color: "#FFFFFF",
            background: isYes ? colors.correctFill : colors.wrongFill,
            borderRadius: 4,
            marginTop: 4,
            padding: "1px 0",
          }}
        >
          {passedAnswer} ✓
        </div>
      </div>
    );
  }

  // disabled
  if (variant === "disabled") {
    return (
      <div
        style={{
          padding: isCompact ? "6px 3px" : "8px 4px",
          borderRadius: radius.md,
          textAlign: "center",
          background: colors.surface2,
          border: `1px solid ${colors.border1}`,
          opacity: 0.5,
        }}
      >
        <div
          style={{
            fontSize,
            color: colors.text3,
            lineHeight: 1.25,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  // active / current
  const isCurrent = variant === "current";
  return (
    <button
      onClick={onClick}
      style={{
        padding: isCompact ? "6px 3px" : "8px 4px",
        borderRadius: radius.md,
        textAlign: "center",
        background: isCurrent ? colors.correctBg : colors.cardBg,
        border: isCurrent
          ? `2px solid ${colors.correctFill}`
          : `1.5px solid ${colors.cardBorder}`,
        boxShadow: isCurrent
          ? "0 0 0 4px rgba(29,158,117,0.15), 0 2px 6px rgba(29,158,117,0.2)"
          : shadow.card,
        cursor: "pointer",
        width: "100%",
        fontFamily: "inherit",
        animation: isCurrent ? "pulseRing 1.6s ease-in-out infinite" : undefined,
      }}
    >
      {isCurrent && (
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: colors.correctText,
            marginBottom: 2,
            letterSpacing: 0.5,
          }}
        >
          ▼ 현재
        </div>
      )}
      <div
        style={{
          fontSize,
          fontWeight: 600,
          lineHeight: 1.3,
          color: isCurrent ? colors.correctDeep : colors.cardText,
          wordBreak: "keep-all",
        }}
      >
        {text}
      </div>
    </button>
  );
}
