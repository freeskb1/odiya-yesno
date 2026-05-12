import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/room";
import { savePlayer, saveLastNickname, loadLastNickname } from "../lib/storage";
import { colors, radius, shadow, containerStyle } from "../lib/theme";

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNickname(loadLastNickname());
  }, []);

  async function handleCreateRoom() {
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요");
      return;
    }
    if (nickname.length > 8) {
      setError("닉네임은 8자 이내로 입력해주세요");
      return;
    }

    setCreating(true);
    setError("");
    saveLastNickname(nickname.trim());

    try {
      const { code, playerId } = await createRoom(nickname.trim());
      savePlayer({ playerId, roomCode: code, nickname: nickname.trim() });
      navigate(`/room/${code}`);
    } catch (e) {
      console.error(e);
      setError("방 생성에 실패했어요");
      setCreating(false);
    }
  }

  function handleJoinRoom() {
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요");
      return;
    }
    saveLastNickname(nickname.trim());
    navigate("/join");
  }

  return (
    <div style={{ ...containerStyle, padding: "40px 24px 28px" }}>
      {/* 로고 */}
      <div style={{ textAlign: "center", marginTop: 24, marginBottom: 24 }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            background: "linear-gradient(135deg, #FF8B5C 0%, #E24B4A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          오디야
        </div>
        <p style={{ fontSize: 12, color: colors.text3, margin: "8px 0 0" }}>
          친구를 얼마나 알고 있나요?
        </p>
      </div>

      {/* 카드 일러스트 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <div style={{ position: "relative", width: 200, height: 130 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 18,
              width: 80,
              height: 100,
              transform: "rotate(-12deg)",
              borderRadius: radius.md,
              background: colors.cardBg,
              border: `1.5px solid ${colors.cardBorder}`,
              boxShadow: shadow.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🙊
          </div>
          <div
            style={{
              position: "absolute",
              left: 60,
              top: 5,
              width: 80,
              height: 105,
              borderRadius: radius.md,
              background: colors.cardBg,
              border: `1.5px solid ${colors.cardBorder}`,
              boxShadow: shadow.cardLift,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🙈
          </div>
          <div
            style={{
              position: "absolute",
              left: 120,
              top: 18,
              width: 80,
              height: 100,
              transform: "rotate(12deg)",
              borderRadius: radius.md,
              background: colors.cardBg,
              border: `1.5px solid ${colors.cardBorder}`,
              boxShadow: shadow.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🙉
          </div>
        </div>
      </div>

      {/* 닉네임 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: colors.text3, display: "block", marginBottom: 6, fontWeight: 500 }}>
          닉네임
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={8}
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: radius.lg,
            border: `1.5px solid ${colors.border1}`,
            background: colors.surface,
            outline: "none",
            boxShadow: shadow.sm,
            fontSize: 14,
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: colors.wrongFill, marginBottom: 12, fontWeight: 500 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          style={{
            padding: 14,
            borderRadius: radius.lg,
            background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            boxShadow: shadow.button,
            opacity: creating ? 0.6 : 1,
            cursor: creating ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {creating ? "방 만드는 중..." : "✨ 방 만들기"}
        </button>
        <button
          onClick={handleJoinRoom}
          disabled={creating}
          style={{
            padding: 14,
            borderRadius: radius.lg,
            border: `1.5px solid ${colors.border2}`,
            background: colors.surface,
            color: colors.text1,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: shadow.sm,
          }}
        >
          🚪 방 입장하기
        </button>
      </div>
    </div>
  );
}
