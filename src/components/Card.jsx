import { colors, radius, shadow } from "../lib/theme";

// variant: "current" | "active" | "passed" | "skip" | "disabled"
// passedAnswer: "YES" | "NO" (passed인 경우)
export function Card({ text, level, depth, variant = "active", passedAnswer, onClick }) {
  // depth에 따라 폰트/패딩 조정
  const isCompact = depth >= 4;
  const fontSize = isCompact ? 9 : level === 1 ? 11 : 10;

  // skip: 안 선택한 길에 있는 카드 (점선 + 살짝 흐림)
  if (variant === "skip") {
    return (
      <div
        style={{
          padding: isCompact ? "6px 3px" : "7px 4px",
          borderRadius: radius.md,
          textAlign: "center",
          background: colors.skipBg,
          border: `1px dashed ${colors.skipBorder}`,
          opacity: 0.8,
        }}
      >
        <div
          style={{
            fontSize: fontSize - 0.5,
            color: colors.skipText,
            lineHeight: 1.25,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  // passed: 답변 완료한 카드 (강조)
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

  // disabled: 아예 닫힌 길의 카드
  if (variant === "disabled") {
    return (
      <div
        style={{
          padding: isCompact ? "6px 3px" : "8px 4px",
          borderRadius: radius.md,
          textAlign: "center",
          background: colors.surface3,
          border: `1px solid ${colors.border1}`,
          opacity: 0.4,
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

  // active / current: 일반 카드 (탭 가능)
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
