import { colors, radius } from "../lib/theme";

export default function VoteBoxes({ selected, disabled, onSelect }) {
  const options = ["A", "B", "C"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            disabled={disabled}
            onClick={() => onSelect && onSelect(opt)}
            style={{
              padding: "12px 4px",
              borderRadius: radius.md,
              textAlign: "center",
              border: isSelected ? `2px solid ${colors.accentBorder}` : `0.5px solid ${colors.border1}`,
              background: isSelected ? colors.accentBg : colors.surface,
              opacity: disabled ? 0.45 : 1,
              cursor: disabled ? "default" : "pointer",
              transition: "transform 0.15s",
              fontFamily: "inherit",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: isSelected ? colors.accentText : colors.text1,
              }}
            >
              {opt}
            </div>
            <div
              style={{
                fontSize: 9,
                marginTop: 2,
                color: isSelected ? colors.accentText : colors.text3,
              }}
            >
              {isSelected ? "선택됨 ✓" : "투표함"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
