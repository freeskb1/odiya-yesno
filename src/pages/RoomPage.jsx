import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  subscribeRoom,
  startGame,
  leaveRoom,
  closeRoom,
} from "../lib/room";
import { loadPlayer, clearPlayer } from "../lib/storage";
import Avatar from "../components/Avatar";
import GamePlay from "./GamePlay";
import { colors, radius, containerStyle } from "../lib/theme";
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

  // 1. 내 정보 로드
  useEffect(() => {
    const stored = loadPlayer();
    if (!stored || stored.roomCode !== code) {
      navigate("/");
      return;
    }
    setMe(stored);
  }, [code, navigate]);

  // 2. 방 구독
  useEffect(() => {
    if (!me) return;
    const unsub = subscribeRoom(code, (roomData) => {
      if (!roomData) {
        // 방이 사라짐
        setClosed(true);
        setLoading(false);
        return;
      }
      // 본인이 강퇴됐는지 (방장이 닫은 경우 등)
      if (roomData.players && !roomData.players[me.playerId]) {
        // 게임 시작 전이라면 강퇴 처리, 게임 후라면 자연스러운 종료
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

  // 3. QR 생성
  useEffect(() => {
    if (typeof window === "undefined" || !code) return;
    const url = `${window.location.origin}/join?code=${code}`;
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#1A1A1A", light: "#FFFFFF" },
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
    } catch {
      // ignore
    }
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

  // 게임 진행 중
  if (room.status === "playing" || room.status === "finished") {
    return <GamePlay room={room} code={code} myPlayerId={me.playerId} />;
  }

  // 대기 중
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
function HostWaitingRoom({ room, players, qrDataUrl, copied, onCopy, onStart, onClose }) {
  const canStart = players.length >= 2;
  return (
    <div style={{ ...containerStyle, padding: "20px 16px 32px" }}>
      {/* 우상단 닫기 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: colors.text3, padding: "4px 8px" }}
        >
          방 닫기
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px" }}>
          ROOM
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
          친구들을 초대하세요
        </p>
      </div>

      {/* QR + 코드 */}
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
              }}
            />
          ) : (
            <div style={{ width: 130, height: 130, borderRadius: radius.md, background: colors.surface2 }} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 0.5, margin: "0 0 6px" }}>
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
                  background: colors.surface2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 500,
                  color: colors.text1,
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
              padding: "6px",
              borderRadius: radius.md,
              border: `1px solid ${colors.border1}`,
              background: "transparent",
              color: colors.text3,
            }}
          >
            {copied ? "✓ 복사됨" : "📋 복사"}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, color: colors.text3, textAlign: "center", margin: "0 0 16px" }}>
        QR 스캔 또는 3자리 코드로 입장
      </p>

      <PlayerList players={players} myPlayerId={null} showWaitingSlot />

      {/* 시작 버튼 */}
      <div style={{ marginTop: "auto" }}>
        <button
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: radius.md,
            fontSize: 15,
            fontWeight: 500,
            ...(canStart
              ? { background: colors.correctFill, color: "#FFFFFF" }
              : {
                  background: colors.surface2,
                  color: colors.text3,
                  border: `1px solid ${colors.border1}`,
                  cursor: "not-allowed",
                }),
          }}
        >
          {canStart ? `게임 시작 (${players.length}명) →` : "최소 2명이 필요해요"}
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
  return (
    <div style={{ ...containerStyle, padding: "20px 16px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px" }}>
          ROOM {room.code}
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
          방장이 시작하기를 기다리는 중
        </p>
      </div>

      {/* 점 애니메이션 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 200, 400].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: i === 0 ? colors.text3 : i === 1 ? colors.text2 : colors.text1,
                opacity: i === 0 ? 0.4 : i === 1 ? 0.7 : 1,
                animation: `dotPulse 1.4s ease-in-out infinite`,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <PlayerList players={players} myPlayerId={myPlayerId} />

      <div
        style={{
          marginTop: "auto",
          padding: 12,
          borderRadius: radius.md,
          background: colors.surface2,
          marginBottom: 8,
        }}
      >
        <p style={{ fontSize: 11, color: colors.text2, fontWeight: 500, margin: "0 0 4px" }}>
          게임 방법
        </p>
        <p style={{ fontSize: 11, color: colors.text2, margin: 0, lineHeight: 1.5 }}>
          선 플레이어가 어디 도착할지 예상해서 투표해요. 잘 맞출수록 점수가 올라가요!
        </p>
      </div>

      <button
        onClick={onLeave}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: radius.md,
          border: `1px solid ${colors.border1}`,
          background: "transparent",
          color: colors.text3,
          fontSize: 12,
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
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: colors.text1 }}>
          {showWaitingSlot ? "참여자" : "함께 플레이할 사람"}
        </span>
        <span style={{ fontSize: 11, color: colors.text3 }}>{players.length}명{showWaitingSlot ? " 접속" : ""}</span>
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
                background: isMe ? colors.accentBg : colors.surface2,
                border: isMe ? `1px solid ${colors.accentBorder}` : "none",
              }}
            >
              <Avatar nickname={p.nickname} size={26} />
              <span style={{ fontSize: 13, color: colors.text1, flex: 1, fontWeight: isMe ? 500 : 400 }}>
                {p.nickname}
              </span>
              {p.isHost && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 100,
                    background: colors.accentBg,
                    color: colors.accentText,
                    fontWeight: 500,
                  }}
                >
                  방장
                </span>
              )}
              {isMe && (
                <span style={{ fontSize: 10, color: colors.accentText, fontWeight: 500 }}>나</span>
              )}
              {!p.isHost && !isMe && (
                <span style={{ color: colors.correctFill, fontSize: 14 }}>✓</span>
              )}
            </div>
          );
        })}
        {showWaitingSlot && players.length < 6 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: radius.md,
              border: `1px dashed ${colors.border2}`,
              gap: 8,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: colors.surface2,
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

// =================== 방 폐쇄 화면 ===================
function RoomClosed({ onHome }) {
  return (
    <div
      style={{
        ...containerStyle,
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: colors.surface2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 36,
        }}
      >
        🚪
      </div>
      <p style={{ fontSize: 17, fontWeight: 500, color: colors.text1, margin: "0 0 6px" }}>
        방이 사라졌어요
      </p>
      <p
        style={{
          fontSize: 12,
          color: colors.text3,
          textAlign: "center",
          margin: "0 0 28px",
          lineHeight: 1.5,
        }}
      >
        모두가 나가서 방이 닫혔어요
        <br />
        새로 만들거나 다른 방에 입장해보세요
      </p>
      <button
        onClick={onHome}
        style={{
          width: "100%",
          maxWidth: 280,
          padding: 12,
          borderRadius: radius.md,
          background: colors.correctFill,
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        홈으로
      </button>
    </div>
  );
}
