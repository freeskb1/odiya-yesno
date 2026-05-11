import { colors, radius } from "../lib/theme";

// selected: "0Y", "0N", "1Y", "1N", "2Y", "2N" 또는 null
// onSelect(dest): dest = "0Y" 등
export default function VoteBoxes({ selected, disabled, onSelect, showLabels = true }) {
  // 3층 카드 3개 아래에 각각 YES / NO 버튼
  // 0번 카드: 0Y, 0N
  // 1번 카드: 1Y, 1N
  // 2번 카드: 2Y, 2N

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
      {[0, 1, 2].map((idx) => (
        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <VoteButton
            value={`${idx}Y`}
            label="YES"
            selected={selected === `${idx}Y`}
            disabled={disabled}
            onSelect={onSelect}
            type="yes"
          />
          <VoteButton
            value={`${idx}N`}
            label="NO"
            selected={selected === `${idx}N`}
            disabled={disabled}
            onSelect={onSelect}
            type="no"
          />
        </div>
      ))}
    </div>
  );
}

function VoteButton({ value, label, selected, disabled, onSelect, type }) {
  const baseColor = type === "yes" ? colors.correctFill : colors.wrongFill;
  const baseBg = type === "yes" ? colors.correctBg : colors.wrongBg;
  const baseText = type === "yes" ? colors.correctText : colors.wrongFill;

  return (
    <button
      disabled={disabled}
      onClick={() => onSelect && onSelect(value)}
      style={{
        padding: "10px 4px",
        borderRadius: radius.md,
        textAlign: "center",
        border: selected ? `2px solid ${baseColor}` : `0.5px solid ${colors.border1}`,
        background: selected ? baseColor : baseBg,
        opacity: disabled && !selected ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        transition: "transform 0.15s",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: selected ? "#FFFFFF" : baseText,
        }}
      >
        {label}
      </div>
    </button>
  );
}
