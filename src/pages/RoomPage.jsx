import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  subscribeRoom,
  startGame,
  leaveRoom,
  closeRoom,
  updateDepth,
} from "../lib/room";
import { loadPlayer, clearPlayer } from "../lib/storage";
import Avatar from "../components/Avatar";
import GamePlay from "./GamePlay";
import { colors, radius, shadow, containerStyle } from "../lib/theme";
import { calculateTotalRounds } from "../lib/game";

export default function RoomPage() {
  const navigate = useNavigate();
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = loadPlayer();
    if (!stored || stored.roomCode !== code) {
      navigate("/");
      return;
    }
    setMe(stored);
  }, [code, navigate]);

  useEffect(() => {
    if (!me) return;
    const unsub = subscribeRoom(code, (roomData) => {
      if (!roomData) {
        setClosed(true);
        setLoading(false);
        return;
      }
      if (roomData.players && !roomData.players[me.playerId]) {
        if (roomData.status === "waiting") {
          setClosed(true);
          setLoading(false);
          return;
        }
      }
      setRoom(roomData);
      setLoading(false);
    });
    return unsub;
  }, [code, me]);

  useEffect(() => {
    if (typeof window === "undefined" || !code) return;
    const url = `${window.location.origin}/join?code=${code}`;
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#2D2317", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [code]);

  async function handleStartGame() {
    await startGame(code);
  }

  async function handleLeave() {
    if (!me) return;
    const ok = confirm("방을 나가시겠어요? 점수가 사라집니다.");
    if (!ok) return;
    await leaveRoom(code, me.playerId);
    clearPlayer();
    navigate("/");
  }

  async function handleCloseRoom() {
    if (!confirm("방을 닫으시겠어요?")) return;
    await closeRoom(code);
    clearPlayer();
    navigate("/");
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleSelectDepth(d) {
    await updateDepth(code, d);
  }

  if (closed) {
    return <RoomClosed onHome={() => { clearPlayer(); navigate("/"); }} />;
  }

  if (loading || !room || !me) {
    return (
      <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.text3, fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }

  if (room.status === "playing" || room.status === "finished") {
    return <GamePlay room={room} code={code} myPlayerId={me.playerId} />;
  }

  const players = playerListFromRoom(room);
  const isHost = (room.players?.[me.playerId] || {}).isHost;

  return isHost ? (
    <HostWaitingRoom
      room={room}
      players={players}
      qrDataUrl={qrDataUrl}
      copied={copied}
      onCopy={handleCopyCode}
      onStart={handleStartGame}
      onClose={handleCloseRoom}
      onSelectDepth={handleSelectDepth}
    />
  ) : (
    <GuestWaitingRoom
      room={room}
      players={players}
      myPlayerId={me.playerId}
      onLeave={handleLeave}
    />
  );
}

function playerListFromRoom(room) {
  const players = room.players || {};
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

// =================== 방장 대기실 ===================
function HostWaitingRoom({ room, players, qrDataUrl, copied, onCopy, onStart, onClose, onSelectDepth }) {
  const canStart = players.length >= 2;
  const depth = room.depth || 3;

  const depthOptions = [
    { value: 3, label: "3단계", subtitle: "⭐ 기본", desc: "6장 / 도착지 6개" },
    { value: 4, label: "4단계", subtitle: "⭐⭐ 중급", desc: "10장 / 도착지 8개" },
    { value: 5, label: "5단계", subtitle: "⭐⭐⭐ 상급", desc: "15장 / 가로 권장" },
  ];

  return (
    <div style={{ ...containerStyle, padding: "16px 16px 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button
          onClick={onClose}
          style={{
            fontSize: 11,
            color: colors.text3,
            padding: "4px 10px",
            borderRadius: radius.md,
            border: `1px solid ${colors.border1}`,
            background: colors.surface,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          방 닫기
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: colors.text3, letterSpacing: 2, margin: "0 0 2px", fontWeight: 600 }}>
          ROOM
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: colors.text1, margin: 0 }}>
          친구들을 초대하세요 🎉
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR"
              style={{
                width: 130,
                height: 130,
                borderRadius: radius.md,
                border: `1px solid ${colors.border1}`,
                background: colors.surface,
                padding: 4,
                boxShadow: shadow.sm,
              }}
            />
          ) : (
            <div style={{ width: 130, height: 130, borderRadius: radius.md, background: colors.surface2 }} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 10, color: colors.text3, letterSpacing: 0.5, margin: "0 0 6px", fontWeight: 600 }}>
            방 코드
          </p>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {room.code.split("").map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  aspectRatio: "1",
                  borderRadius: radius.md,
                  background: colors.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors.correctFill,
                  boxShadow: `${shadow.sm}, inset 0 0 0 1.5px ${colors.border1}`,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <button
            onClick={onCopy}
            style={{
              fontSize: 11,
              padding: "7px",
              borderRadius: radius.md,
              border: `1px solid ${colors.border1}`,
              background: colors.surface,
              color: colors.text2,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          >
            {copied ? "✓ 복사됨" : "📋 복사"}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 10, color: colors.text3, textAlign: "center", margin: "0 0 16px" }}>
        📱 QR 스캔 또는 3자리 코드로 입장
      </p>

      {/* 단계 선택 */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
          🎯 게임 난이도
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {depthOptions.map((opt) => {
            const selected = depth === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSelectDepth(opt.value)}
                style={{
                  padding: "10px 4px",
                  borderRadius: radius.md,
                  border: selected ? `2px solid ${colors.correctFill}` : `1.5px solid ${colors.border1}`,
                  background: selected ? colors.correctBg : colors.surface,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: selected ? "0 2px 6px rgba(29,158,117,0.15)" : shadow.sm,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: selected ? colors.correctText : colors.text1 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 9, color: selected ? colors.correctText : colors.text3, opacity: 0.85, marginTop: 1 }}>
                  {opt.subtitle}
                </div>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 9, color: colors.text3, margin: "5px 0 0", textAlign: "center" }}>
          {depthOptions.find((o) => o.value === depth)?.desc}
        </p>
      </div>

      <PlayerList players={players} myPlayerId={null} showWaitingSlot />

      <div style={{ marginTop: "auto" }}>
        <button
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: radius.lg,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: canStart ? "pointer" : "default",
            ...(canStart
              ? {
                  background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
                  color: "#FFFFFF",
                  border: "none",
                  boxShadow: shadow.button,
                }
              : {
                  background: colors.surface2,
                  color: colors.text3,
                  border: `1.5px solid ${colors.border1}`,
                }),
          }}
        >
          {canStart ? `🚀 게임 시작 (${players.length}명)` : "최소 2명이 필요해요"}
        </button>
        <p style={{ fontSize: 10, color: colors.text3, textAlign: "center", marginTop: 6 }}>
          시작 후 입장 불가 · {calculateTotalRounds(players.length)}라운드
        </p>
      </div>
    </div>
  );
}

// =================== 참여자 대기실 ===================
function GuestWaitingRoom({ room, players, myPlayerId, onLeave }) {
  const depth = room.depth || 3;
  return (
    <div style={{ ...containerStyle, padding: "20px 16px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px", fontWeight: 600 }}>
          ROOM {room.code}
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: colors.text1, margin: 0 }}>
          방장이 시작하기를 기다리는 중
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 200, 400].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: colors.correctFill,
                animation: `dotPulse 1.4s ease-in-out infinite`,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 100,
            background: colors.surface,
            border: `1px solid ${colors.border1}`,
            fontSize: 11,
            color: colors.text2,
            fontWeight: 600,
          }}
        >
          🎯 {depth}단계 피라미드
        </span>
      </div>

      <PlayerList players={players} myPlayerId={myPlayerId} />

      <div
        style={{
          marginTop: "auto",
          padding: 12,
          borderRadius: radius.md,
          background: colors.surface,
          border: `1px solid ${colors.border1}`,
          marginBottom: 8,
        }}
      >
        <p style={{ fontSize: 11, color: colors.text2, fontWeight: 700, margin: "0 0 4px" }}>
          💡 게임 방법
        </p>
        <p style={{ fontSize: 11, color: colors.text2, margin: 0, lineHeight: 1.5 }}>
          선 플레이어가 어떻게 답할지 예상해서 투표해요. 잘 맞출수록 점수가 올라가요!
        </p>
      </div>

      <button
        onClick={onLeave}
        style={{
          width: "100%",
          padding: 11,
          borderRadius: radius.md,
          border: `1px solid ${colors.border1}`,
          background: colors.surface,
          color: colors.text3,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        방 나가기
      </button>
    </div>
  );
}

// =================== 플레이어 목록 ===================
function PlayerList({ players, myPlayerId, showWaitingSlot }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text2 }}>
          👥 {showWaitingSlot ? "참여자" : "함께 플레이할 사람"}
        </span>
        <span style={{ fontSize: 10, color: colors.text3 }}>{players.length}명</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {players.map((p) => {
          const isMe = p.id === myPlayerId;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: radius.md,
                gap: 8,
                background: colors.surface,
                border: isMe ? `1.5px solid ${colors.accentBorder}` : `1px solid ${colors.border1}`,
                boxShadow: shadow.sm,
              }}
            >
              <Avatar nickname={p.nickname} size={26} style={{ border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: 13, color: colors.text1, flex: 1, fontWeight: isMe ? 700 : 500 }}>
                {p.nickname}
              </span>
              {p.isHost && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 100,
                    background: colors.hostBg,
                    color: colors.hostText,
                    fontWeight: 700,
                  }}
                >
                  👑 방장
                </span>
              )}
              {isMe && !p.isHost && (
                <span style={{ fontSize: 10, color: colors.accentText, fontWeight: 700 }}>나</span>
              )}
              {!p.isHost && !isMe && (
                <span style={{ color: colors.correctFill, fontSize: 14 }}>✓</span>
              )}
            </div>
          );
        })}
        {showWaitingSlot && players.length < 8 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: radius.md,
              border: `1px dashed ${colors.border2}`,
              gap: 8,
              background: colors.surface2,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: colors.surface3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text3,
                fontSize: 12,
              }}
            >
              ⋯
            </div>
            <span style={{ fontSize: 12, color: colors.text3, fontStyle: "italic", flex: 1 }}>
              대기 중...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =================== 방 폐쇄 ===================
function RoomClosed({ onHome }) {
  return (
    <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚪</div>
      <p style={{ fontSize: 17, fontWeight: 700, color: colors.text1, margin: "0 0 6px" }}>
        방이 사라졌어요
      </p>
      <p style={{ fontSize: 12, color: colors.text3, textAlign: "center", margin: "0 0 28px", lineHeight: 1.5 }}>
        모두가 나가서 방이 닫혔어요<br />새로 만들거나 다른 방에 입장해보세요
      </p>
      <button
        onClick={onHome}
        style={{
          width: "100%",
          maxWidth: 280,
          padding: 13,
          borderRadius: radius.lg,
          background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          boxShadow: shadow.button,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        🏠 홈으로
      </button>
    </div>
  );
}
