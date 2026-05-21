import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  subscribeRoom,
  startGame,
  leaveRoom,
  closeRoom,
  updateGameMode,
  updateMachobaCount,
  updateNeomoyaSubMode,
  updateNeomoyaCount,
  updateRounds,
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
    if (!confirm("방을 나가시겠어요?")) return;
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
  async function handleSelectMode(m) {
    await updateGameMode(code, m);
  }
  async function handleSelectMachobaCount(c) {
    await updateMachobaCount(code, c);
  }
  async function handleSelectNeomoyaSubMode(s) {
    await updateNeomoyaSubMode(code, s);
  }
  async function handleSelectNeomoyaCount(c) {
    await updateNeomoyaCount(code, c);
  }
  async function handleSelectRounds(r) {
    await updateRounds(code, r);
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
      onSelectMode={handleSelectMode}
      onSelectMachobaCount={handleSelectMachobaCount}
      onSelectNeomoyaSubMode={handleSelectNeomoyaSubMode}
      onSelectNeomoyaCount={handleSelectNeomoyaCount}
      onSelectRounds={handleSelectRounds}
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
function HostWaitingRoom({ room, players, qrDataUrl, copied, onCopy, onStart, onClose, onSelectMode, onSelectMachobaCount, onSelectNeomoyaSubMode, onSelectNeomoyaCount, onSelectRounds }) {
  const canStart = players.length >= 2;
  const gameMode = room.gameMode || "machoba";
  const machobaCount = room.machobaCount || 5;
  const neomoyaSubMode = room.neomoyaSubMode || "score";
  const neomoyaCount = room.neomoyaCount || 5;
  const rounds = room.rounds || 2;

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
                width: 120,
                height: 120,
                borderRadius: radius.md,
                border: `1px solid ${colors.border1}`,
                background: colors.surface,
                padding: 4,
                boxShadow: shadow.sm,
              }}
            />
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: radius.md, background: colors.surface2 }} />
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
                  fontSize: 22,
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
              padding: "6px",
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

      {/* 게임 모드 선택 */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
          🎮 게임 모드
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <ModeButton
            selected={gameMode === "machoba"}
            onClick={() => onSelectMode("machoba")}
            emoji="🎯"
            title="마쵸바"
            subtitle="다중 퀴즈"
          />
          <ModeButton
            selected={gameMode === "neomoya"}
            onClick={() => onSelectMode("neomoya")}
            emoji="🎭"
            title="너모야"
            subtitle="시나리오"
          />
        </div>
      </div>

      {/* 모드별 옵션 */}
      {gameMode === "machoba" && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
            ❓ 문제 개수
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { value: 3, label: "3문제", subtitle: "⚡ 짧게" },
              { value: 5, label: "5문제", subtitle: "⭐ 기본" },
              { value: 7, label: "7문제", subtitle: "🔥 길게" },
            ].map((opt) => (
              <OptionButton
                key={opt.value}
                selected={machobaCount === opt.value}
                onClick={() => onSelectMachobaCount(opt.value)}
                label={opt.label}
                subtitle={opt.subtitle}
              />
            ))}
          </div>
          <p style={{ fontSize: 9, color: colors.text3, margin: "5px 0 0", textAlign: "center" }}>
            맞춘 개수만큼 점수가 올라가요
          </p>
        </div>
      )}

      {gameMode === "neomoya" && (
        <>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
              🎭 너모야 유형
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <OptionButton
                selected={neomoyaSubMode === "score"}
                onClick={() => onSelectNeomoyaSubMode("score")}
                label="점수 모드"
                subtitle="🏆 선플 답 맞추기"
              />
              <OptionButton
                selected={neomoyaSubMode === "fun"}
                onClick={() => onSelectNeomoyaSubMode("fun")}
                label="재미 모드"
                subtitle="✨ 통계로 보기"
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
              ❓ 시나리오 개수
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { value: 5, label: "5개", subtitle: "⚡ 짧게" },
                { value: 10, label: "10개", subtitle: "⭐ 기본" },
                { value: 15, label: "15개", subtitle: "🔥 길게" },
              ].map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={neomoyaCount === opt.value}
                  onClick={() => onSelectNeomoyaCount(opt.value)}
                  label={opt.label}
                  subtitle={opt.subtitle}
                />
              ))}
            </div>
            <p style={{ fontSize: 9, color: colors.text3, margin: "5px 0 0", textAlign: "center" }}>
              {neomoyaSubMode === "fun" ? "선플레이어 없이 모두 동시 투표 (4명+)" : "선플레이어 답 맞춘 개수만큼 점수"}
            </p>
          </div>
        </>
      )}

      {/* 라운드 바퀴 (마쵸바/너모야 점수) */}
      {(gameMode !== "neomoya" || neomoyaSubMode === "score") && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: colors.text2, margin: "0 0 6px", fontWeight: 700 }}>
            🔄 바퀴 수 (선플레이어 N번씩)
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { value: 1, label: "1바퀴", subtitle: "⚡ 짧게" },
              { value: 2, label: "2바퀴", subtitle: "⭐ 기본" },
              { value: 3, label: "3바퀴", subtitle: "🔥 길게" },
            ].map((opt) => (
              <OptionButton
                key={opt.value}
                selected={rounds === opt.value}
                onClick={() => onSelectRounds(opt.value)}
                label={opt.label}
                subtitle={opt.subtitle}
              />
            ))}
          </div>
        </div>
      )}

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

function ModeButton({ selected, onClick, emoji, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 6px",
        borderRadius: radius.md,
        border: selected ? `2px solid ${colors.correctFill}` : `1.5px solid ${colors.border1}`,
        background: selected ? colors.correctBg : colors.surface,
        cursor: "pointer",
        fontFamily: "inherit",
        boxShadow: selected ? "0 2px 6px rgba(29,158,117,0.15)" : shadow.sm,
        transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 2 }}>{emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? colors.correctText : colors.text1 }}>
        {title}
      </div>
      <div style={{ fontSize: 9, color: selected ? colors.correctText : colors.text3, opacity: 0.85 }}>
        {subtitle}
      </div>
    </button>
  );
}

function OptionButton({ selected, onClick, label, subtitle }) {
  return (
    <button
      onClick={onClick}
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
        {label}
      </div>
      <div style={{ fontSize: 9, color: selected ? colors.correctText : colors.text3, opacity: 0.85, marginTop: 1 }}>
        {subtitle}
      </div>
    </button>
  );
}

// =================== 참여자 대기실 ===================
function GuestWaitingRoom({ room, players, myPlayerId, onLeave }) {
  const gameMode = room.gameMode || "machoba";
  const machobaCount = room.machobaCount || 5;
  const neomoyaSubMode = room.neomoyaSubMode || "score";
  const neomoyaCount = room.neomoyaCount || 5;

  function modeLabel() {
    if (gameMode === "machoba") return `🎯 마쵸바 · ${machobaCount}문제`;
    if (gameMode === "neomoya") return `🎭 너모야 · ${neomoyaCount}개 (${neomoyaSubMode === "fun" ? "재미" : "점수"})`;
    return "";
  }

  function modeDesc() {
    if (gameMode === "machoba") return `선플레이어를 향한 ${machobaCount}개 질문에 답을 예측해요. 맞춘 개수만큼 점수!`;
    if (gameMode === "neomoya") {
      if (neomoyaSubMode === "fun") return `${neomoyaCount}개 시나리오에 각자 답해요. 영혼의 단짝과 정반대 영혼이 누구일까요?`;
      return `선플레이어가 ${neomoyaCount}개 시나리오에 어떻게 답할지 예측해요!`;
    }
    return "";
  }

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
            padding: "5px 14px",
            borderRadius: 100,
            background: colors.surface,
            border: `1px solid ${colors.border1}`,
            fontSize: 11,
            color: colors.text2,
            fontWeight: 700,
          }}
        >
          {modeLabel()}
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
          {modeDesc()}
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
        {players.map((p, idx) => {
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
              <Avatar nickname={p.nickname} colorIndex={idx} size={26} style={{ border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
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
