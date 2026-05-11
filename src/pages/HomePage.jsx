import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/room";
import { savePlayer, saveLastNickname, loadLastNickname } from "../lib/storage";
import { colors, radius, containerStyle } from "../lib/theme";

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
      setError("방 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
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

  const cardMini = {
    width: 50,
    padding: "8px 4px",
    borderRadius: radius.md,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 500,
    background: colors.cardBg,
    color: colors.cardTextDeep,
    border: `0.5px solid ${colors.cardBorder}`,
  };

  return (
    <div style={{ ...containerStyle, padding: "40px 20px 32px" }}>
      {/* 로고 */}
      <div style={{ textAlign: "center", marginTop: 24, marginBottom: 36 }}>
        <div style={{ fontSize: 44, fontWeight: 600, color: colors.text1, letterSpacing: -1, lineHeight: 1 }}>
          오디야
        </div>
        <p style={{ fontSize: 12, color: colors.text3, margin: "8px 0 0" }}>YES or NO 추리 파티 게임</p>
      </div>

      {/* 일러스트 (피라미드) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={cardMini}>?</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2].map((i) => <div key={i} style={cardMini}>?</div>)}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3].map((i) => <div key={i} style={cardMini}>?</div>)}
          </div>
        </div>
      </div>

      {/* 닉네임 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: colors.text3, display: "block", marginBottom: 6 }}>
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
            padding: "12px 14px",
            borderRadius: radius.md,
            border: `1px solid ${colors.border1}`,
            background: colors.surface,
            outline: "none",
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: colors.wrongFill, marginBottom: 12 }}>{error}</div>
      )}

      {/* 버튼 */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          style={{
            padding: 14,
            borderRadius: radius.md,
            background: colors.correctFill,
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 500,
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "방 만드는 중..." : "+ 방 만들기"}
        </button>
        <button
          onClick={handleJoinRoom}
          disabled={creating}
          style={{
            padding: 14,
            borderRadius: radius.md,
            border: `1px solid ${colors.border2}`,
            background: colors.surface,
            color: colors.text1,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          → 방 입장하기
        </button>
      </div>
    </div>
  );
}
