import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { leaveRoom, restartGame, returnToWaiting } from "../lib/room";
import { calculateSoulmate } from "../lib/game";
import { clearPlayer } from "../lib/storage";
import Avatar from "../components/Avatar";
import OdiyaPlay from "./OdiyaPlay";
import MachobaPlay from "./MachobaPlay";
import { colors, radius, shadow, containerStyle } from "../lib/theme";

export default function GamePlay({ room, code, myPlayerId }) {
  const navigate = useNavigate();

  const players = useMemo(() => {
    return Object.entries(room.players || {})
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  }, [room.players]);

  const leadPlayer = players.find((p) => p.id === room.currentLeadPlayerId);
  const isHost = (room.players?.[myPlayerId] || {}).isHost;

  // 모든 votes 수집 (소울메이트 계산용)
  const allVotes = useMemo(() => {
    const out = [];
    const v = room.votes || {};
    for (const round in v) {
      const r = parseInt(round, 10);
      for (const pid in v[round]) {
        const voteData = v[round][pid];
        out.push({
          round: r,
          playerId: pid,
          // 오디야 모드는 isCorrect, 마쵸바 모드는 matchCount > 0 로 판단
          isCorrect: voteData.isCorrect === true || (voteData.matchCount > 0),
        });
      }
    }
    return out;
  }, [room.votes]);

  async function handleLeaveFinal() {
    if (players.find((p) => p.id === myPlayerId)) {
      await leaveRoom(code, myPlayerId);
    }
    clearPlayer();
    navigate("/");
  }

  async function handleRestart() {
    await restartGame(code);
  }

  async function handleReturnToWaiting() {
    await returnToWaiting(code);
  }

  // 게임 종료 → 최종 결과
  if (room.status === "finished") {
    return (
      <FinalResult
        players={players}
        myPlayerId={myPlayerId}
        results={room.results || {}}
        allVotes={allVotes}
        totalRounds={room.totalRounds}
        isHost={isHost}
        onLeave={handleLeaveFinal}
        onRestart={handleRestart}
        onReturnToWaiting={handleReturnToWaiting}
      />
    );
  }

  // 모드별 분기
  const gameMode = room.gameMode || "odiya";
  if (gameMode === "machoba") {
    return (
      <MachobaPlay
        room={room}
        code={code}
        myPlayerId={myPlayerId}
        leadPlayer={leadPlayer}
        players={players}
      />
    );
  }

  return (
    <OdiyaPlay
      room={room}
      code={code}
      myPlayerId={myPlayerId}
      leadPlayer={leadPlayer}
      players={players}
    />
  );
}

// ============================================
// 최종 결과 (모드 공통)
// ============================================
function FinalResult({ players, myPlayerId, results, allVotes, totalRounds, isHost, onLeave, onRestart, onReturnToWaiting }) {
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedPlayers[0];

  const myLeadRounds = Object.entries(results)
    .filter(([, r]) => r.leadPlayerId === myPlayerId)
    .map(([round]) => parseInt(round, 10));

  const soulmate = calculateSoulmate(myPlayerId, myLeadRounds, allVotes);
  const soulmatePlayers = soulmate.soulmateIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div style={{ ...containerStyle, padding: "16px 12px 16px", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🎊</div>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px", fontWeight: 600 }}>GAME OVER</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: colors.text1, margin: 0 }}>
          전체 {totalRounds}라운드 완료
        </p>
      </div>

      {/* 우승자 */}
      <div
        style={{
          position: "relative",
          padding: "20px 16px",
          borderRadius: radius.lg,
          textAlign: "center",
          marginBottom: 14,
          background: colors.cardBg,
          border: `2px solid ${colors.cardBorderDeep}`,
          boxShadow: shadow.cardLift,
        }}
      >
        <div style={{
          position: "absolute", top: -10, left: "50%",
          transform: "translateX(-50%)",
          padding: "3px 12px", borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          background: colors.cardAccent, color: colors.cardTextDeep,
        }}>
          👑 WINNER
        </div>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🏆</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.cardTextDeep, marginBottom: 2 }}>
          {winner?.nickname || "?"}
        </div>
        <div style={{ fontSize: 13, color: colors.cardText, fontWeight: 600 }}>{winner?.score || 0}점 획득</div>
      </div>

      {/* 소울메이트 */}
      {soulmatePlayers.length > 0 ? (
        <div style={{
          padding: "14px", borderRadius: radius.lg, marginBottom: 14,
          background: colors.pinkBg, border: `1px solid ${colors.pinkBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>💝</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: colors.pinkText }}>
              나를 가장 잘 맞춘 사람
            </span>
            {soulmatePlayers.length > 1 && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 100,
                background: colors.pinkBorder, color: colors.pinkDeep, fontWeight: 600,
              }}>
                동률 {soulmatePlayers.length}명
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {soulmatePlayers.map((sp) => (
              <div key={sp.id} style={{ display: "flex", alignItems: "center" }}>
                <Avatar nickname={sp.nickname} size={36} style={{ marginRight: 12 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.pinkDeep }}>
                    {sp.nickname}
                  </div>
                  <div style={{ fontSize: 11, color: colors.pinkText }}>
                    {soulmate.totalCount}번 중 {soulmate.correctCount}번 정답 ·{" "}
                    {Math.round((soulmate.correctCount / soulmate.totalCount) * 100)}%
                  </div>
                </div>
                <div style={{ fontSize: 22 }}>💞</div>
              </div>
            ))}
          </div>
        </div>
      ) : myLeadRounds.length > 0 ? (
        <div style={{
          padding: "18px 14px", borderRadius: radius.lg, marginBottom: 14,
          background: colors.surface, border: `1px dashed ${colors.border2}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🌀</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1, marginBottom: 2 }}>
            나를 맞춘 사람이 없네요
          </div>
          <div style={{ fontSize: 11, color: colors.text3 }}>당신은 미스터리한 사람!</div>
        </div>
      ) : null}

      {/* 순위 */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: colors.text3, margin: "0 0 8px", paddingLeft: 4, letterSpacing: 0.3, fontWeight: 600 }}>
          🏅 전체 순위
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sortedPlayers.map((p, idx) => {
            const isMe = p.id === myPlayerId;
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center",
                padding: "10px 12px", borderRadius: radius.md,
                ...(isMe
                  ? { background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }
                  : { background: colors.surface, border: `1px solid ${colors.border1}` }),
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, width: 22,
                  color: isMe ? colors.accentText : colors.text3,
                }}>
                  {idx + 1}
                </span>
                <Avatar nickname={p.nickname} size={28} style={{ marginRight: 10, marginLeft: 4 }} />
                <div style={{
                  flex: 1, fontSize: 13, color: colors.text1,
                  fontWeight: isMe ? 700 : 500,
                }}>
                  {p.nickname}
                  {isMe && <span style={{ fontSize: 10, color: colors.accentText, marginLeft: 4 }}>나</span>}
                </div>
                <span style={{ fontSize: 13, color: colors.text1, fontWeight: 700 }}>
                  {p.score || 0}점
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isHost && (
          <button
            onClick={onRestart}
            style={{
              padding: 13, borderRadius: radius.lg,
              background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
              color: "#FFFFFF", fontSize: 14, fontWeight: 700,
              border: "none", boxShadow: shadow.button,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🔄 같은 멤버로 다시 한판
          </button>
        )}
        {isHost && (
          <button
            onClick={onReturnToWaiting}
            style={{
              padding: 12, borderRadius: radius.lg,
              background: colors.surface,
              color: colors.text2, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${colors.border2}`,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: shadow.sm,
            }}
          >
            ⚙️ 모드 바꿔서 다시하기
          </button>
        )}
        <button
          onClick={onLeave}
          style={{
            padding: 11, borderRadius: radius.lg,
            background: "transparent",
            color: colors.text3, fontSize: 12, fontWeight: 500,
            border: `1px solid ${colors.border1}`,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {isHost ? "방 나가기" : "🏠 홈으로"}
        </button>
        {!isHost && (
          <p style={{ fontSize: 10, color: colors.text3, textAlign: "center", margin: 0 }}>
            방장이 다시 시작하면 자동으로 참여돼요
          </p>
        )}
      </div>
    </div>
  );
}
