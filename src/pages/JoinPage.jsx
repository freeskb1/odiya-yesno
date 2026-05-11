import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { joinRoom } from "../lib/room";
import { savePlayer, saveLastNickname, loadLastNickname } from "../lib/storage";
import { colors, radius, containerStyle } from "../lib/theme";

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setNickname(loadLastNickname());
    const queryCode = searchParams.get("code");
    if (queryCode && /^\d{3}$/.test(queryCode)) setCode(queryCode);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 100);
  }, [searchParams]);

  function handleCodeChange(value) {
    const numeric = value.replace(/\D/g, "").slice(0, 3);
    setCode(numeric);
    setError("");
  }

  async function handleJoin() {
    if (code.length !== 3) {
      setError("3자리 코드를 모두 입력해주세요");
      return;
    }
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요");
      return;
    }
    if (nickname.length > 8) {
      setError("닉네임은 8자 이내로 입력해주세요");
      return;
    }

    setJoining(true);
    setError("");

    try {
      const result = await joinRoom(code, nickname.trim());
      if (result.error) {
        setError(result.error);
        setJoining(false);
        return;
      }
      saveLastNickname(nickname.trim());
      savePlayer({ playerId: result.playerId, roomCode: result.code, nickname: nickname.trim() });
      navigate(`/room/${result.code}`);
    } catch (e) {
      console.error(e);
      setError("입장에 실패했어요");
      setJoining(false);
    }
  }

  const isError = !!error && error.includes("존재");

  function digitStyle(digit, isActive) {
    const base = {
      width: 56,
      height: 64,
      borderRadius: radius.md,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28,
      fontWeight: 500,
      background: digit ? colors.surface : colors.surface2,
    };
    if (isError) {
      return {
        ...base,
        background: colors.surface,
        border: `1.5px solid ${colors.wrongFill}`,
        color: colors.wrongFill,
        animation: "shake 0.4s ease-in-out",
      };
    }
    if (digit) {
      return { ...base, border: `1px solid ${colors.border2}`, color: colors.text1 };
    }
    if (isActive) {
      return { ...base, border: `2px solid ${colors.accentBorder}`, color: colors.text3 };
    }
    return { ...base, border: `1px solid ${colors.border1}`, color: colors.text3 };
  }

  return (
    <div style={{ ...containerStyle, padding: "20px 16px 32px" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.md,
            border: `1px solid ${colors.border1}`,
            background: colors.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: colors.text1,
            margin: "0 auto",
            paddingRight: 32,
          }}
        >
          방 입장
        </p>
      </div>

      {/* 코드 입력 */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: colors.text3, margin: "0 0 14px" }}>
          3자리 방 코드를 입력하세요
        </p>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          maxLength={3}
          autoFocus
          style={{
            opacity: 0,
            position: "absolute",
            pointerEvents: "none",
            width: 1,
            height: 1,
          }}
          aria-label="방 코드"
        />
        <div
          onClick={() => inputRef.current && inputRef.current.focus()}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            cursor: "text",
          }}
        >
          {[0, 1, 2].map((i) => {
            const digit = code[i] || "";
            const isActive = code.length === i;
            return (
              <div key={i} style={digitStyle(digit, isActive)}>
                {digit || "_"}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          style={{
            margin: "0 auto 16px",
            padding: "8px 12px",
            borderRadius: radius.md,
            background: colors.wrongBg,
            border: `1px solid ${colors.wrongFill}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "fit-content",
          }}
        >
          <span style={{ color: colors.wrongFill, fontSize: 14 }}>⚠</span>
          <span style={{ fontSize: 12, color: colors.wrongFill, fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* 닉네임 */}
      <div style={{ marginBottom: 20 }}>
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

      <button
        onClick={handleJoin}
        disabled={code.length !== 3 || !nickname.trim() || joining}
        style={{
          marginTop: "auto",
          padding: 14,
          borderRadius: radius.md,
          fontSize: 15,
          fontWeight: 500,
          ...(code.length === 3 && nickname.trim() && !joining
            ? { background: colors.correctFill, color: "#FFFFFF" }
            : {
                background: colors.surface2,
                color: colors.text3,
                border: `1px solid ${colors.border1}`,
                cursor: "not-allowed",
              }),
        }}
      >
        {joining ? "입장하는 중..." : "입장하기"}
      </button>
    </div>
  );
}
