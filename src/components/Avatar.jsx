import { getAvatarColor, getAvatarColorByIndex } from "../lib/game";

export default function Avatar({ nickname, colorIndex, size = 32, style }) {
  // colorIndex가 주어지면 그 인덱스로 색상 결정, 없으면 nickname 해시
  const color = typeof colorIndex === "number"
    ? getAvatarColorByIndex(colorIndex)
    : getAvatarColor(nickname || "");
  const initial = (nickname || "?")[0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 500,
        fontSize: size * 0.42,
        flexShrink: 0,
        ...(style || {}),
      }}
    >
      {initial}
    </div>
  );
}
