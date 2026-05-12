import { colors, radius } from "../lib/theme";

// 답변 시퀀스를 알약 형태로 표시
// answers: ["YES", "NO", "NO"] 같은 배열
// targetName: 대상 이름 (예: "광배")
export default function AnswerSequence({ answers, targetName, hint }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: radius.lg,
        background: colors.accentBg,
        border: `2px solid ${colors.accentBorder}`,
        textAlign: "center",
        boxShadow: "0 3px 8px rgba(83,74,183,0.15)",
      }}
    >
      <div style={{ fontSize: 10, color: colors.accentText, marginBottom: 8, fontWeight: 600 }}>
        🎯 {targetName}의 답변 경로 예상
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {answers.map((ans, i) => (
          <Fragment key={i}>
            <div
              style={{
                padding: "4px 11px",
                background: ans === "YES" ? colors.correctFill : colors.wrongFill,
                color: "#FFFFFF",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {ans}
            </div>
            {i < answers.length - 1 && (
              <span style={{ color: colors.accentText, fontSize: 14 }}>→</span>
            )}
          </Fragment>
        ))}
      </div>
      <div style={{ fontSize: 9, color: colors.accentText, opacity: 0.7, marginTop: 6 }}>
        {hint || "모두 맞추면 +1점"}
      </div>
    </div>
  );
}

// Fragment helper
function Fragment({ children }) {
  return <>{children}</>;
}
