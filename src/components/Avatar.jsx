import { getAvatarColor } from "../lib/game";

export default function Avatar({ nickname, size = 32, style }) {
  const color = getAvatarColor(nickname || "");
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
