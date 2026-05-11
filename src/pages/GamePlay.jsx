import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { submitVote, submitAnswer, revealResult, nextRound, leaveRoom } from "../lib/room";
import { calculateSoulmate, describeDestination } from "../lib/game";
import { clearPlayer } from "../lib/storage";
import Avatar from "../components/Avatar";
import Pyramid from "../components/Pyramid";
import VoteBoxes from "../components/VoteBoxes";
import { CardPopup } from "../components/Card";
import { colors, radius, containerStyle } from "../lib/theme";

export default function GamePlay({ room, code, myPlayerId }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("intro");
  const [popup, setPopup] = useState({ open: false, level: 1, text: "", isCurrent: false });

  const players = useMemo(() => {
    return Object.entries(room.players || {})
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  }, [room.players]);

  const me = players.find((p) => p.id === myPlayerId);
  const leadPlayer = players.find((p) => p.id === room.currentLeadPlayerId);
  const isLead = room.currentLeadPlayerId === myPlayerId;

  const currentVotes = useMemo(() => {
    const v = (room.votes || {})[room.currentRound] || {};
    return Object.entries(v).map(([pid, data]) => ({
      playerId: pid,
      vote: data.vote,
      isCorrect: data.isCorrect,
    }));
  }, [room.votes, room.currentRound]);

  const allVotes = useMemo(() => {
    const out = [];
    const v = room.votes || {};
    for (const round in v) {
      const r = parseInt(round, 10);
      for (const pid in v[round]) {
        out.push({
          round: r,
          playerId: pid,
          vote: v[round][pid].vote,
          isCorrect: v[round][pid].isCorrect,
        });
      }
    }
    return out;
  }, [room.votes]);

  const currentResult = (room.results || {})[room.currentRound];
  const myVote = currentVotes.find((v) => v.playerId === myPlayerId);
  const nonLeadCount = players.length - 1;
  const submittedVotesCount = currentVotes.length;

  // Phase 전환
  useEffect(() => {
    if (room.status === "finished") setPhase("final");
  }, [room.status]);

  useEffect(() => {
    if (room.status !== "playing") return;
    setPhase("intro");
    const t = setTimeout(() => {
      const answersLen = (room.pyramid?.answers || []).length;
      if (answersLen > 0) setPhase("answering");
      else setPhase(isLead ? "lead-waiting" : "voting");
    }, 2500);
    return () => clearTimeout(t);
  }, [room.currentRound, room.status]); // eslint-disable-line

  useEffect(() => {
    if (room.status !== "playing") return;
    if (
      (phase === "voting" || phase === "lead-waiting") &&
      submittedVotesCount >= nonLeadCount &&
      nonLeadCount > 0
    ) {
      setPhase("answering");
    }
  }, [submittedVotesCount, nonLeadCount, phase, room.status]);

  const answersLen = (room.pyramid?.answers || []).length;
  useEffect(() => {
    if (
      answersLen === 3 &&
      (phase === "answering" || phase === "voting" || phase === "lead-waiting")
    ) {
      setPhase("result");
    }
  }, [answersLen, phase]);

  useEffect(() => {
    if (currentResult?.revealed && phase === "result") {
      setPhase("reveal");
    }
  }, [currentResult?.revealed, phase]);

  // 액션
  async function handleVote(option) {
    if (myVote || isLead) return;
    await submitVote(code, room.currentRound, myPlayerId, option);
  }

  function handleCardTap(level, text, isCurrent) {
    setPopup({ open: true, level, text, isCurrent });
  }

  async function handleAnswer(answer) {
    if (!isLead) return;
    setPopup({ ...popup, open: false });
    await submitAnswer(code, answer);
  }

  async function handleReveal() {
    await revealResult(code, room.currentRound);
  }

  async function handleNextRound() {
    await nextRound(code);
  }

  async function handleLeaveFinal() {
    if (me) await leaveRoom(code, myPlayerId);
    clearPlayer();
    navigate("/");
  }

  // 렌더링
  if (phase === "final" || room.status === "finished") {
    return (
      <FinalResult
        players={players}
        myPlayerId={myPlayerId}
        results={room.results || {}}
        allVotes={allVotes}
        totalRounds={room.totalRounds}
        onLeave={handleLeaveFinal}
      />
    );
  }

  if (phase === "intro") {
    return <RoundIntro round={room.currentRound} totalRounds={room.totalRounds} leadPlayer={leadPlayer} />;
  }

  if (phase === "lead-waiting" && isLead) {
    return (
      <LeadWaitingScreen
        round={room.currentRound}
        totalRounds={room.totalRounds}
        votedCount={submittedVotesCount}
        totalCount={nonLeadCount}
      />
    );
  }

  if (phase === "voting" && !isLead) {
    return (
      <>
        <VotingView
          room={room}
          leadPlayer={leadPlayer}
          myVote={myVote?.vote}
          totalVoters={nonLeadCount}
          submittedCount={submittedVotesCount}
          onVote={handleVote}
          onCardTap={handleCardTap}
        />
        <CardPopup
          open={popup.open}
          text={popup.text}
          level={popup.level}
          showAnswerButtons={false}
          onClose={() => setPopup({ ...popup, open: false })}
        />
      </>
    );
  }

  if (phase === "answering" || (phase === "voting" && isLead) || phase === "lead-waiting") {
    return (
      <>
        <AnsweringView
          room={room}
          leadPlayer={leadPlayer}
          isLead={isLead}
          onCardTap={handleCardTap}
        />
        <CardPopup
          open={popup.open}
          text={popup.text}
          level={popup.level}
          showAnswerButtons={isLead && popup.isCurrent}
          onAnswer={handleAnswer}
          onClose={() => setPopup({ ...popup, open: false })}
        />
      </>
    );
  }

  if (phase === "result") {
    return (
      <ResultView
        room={room}
        leadPlayer={leadPlayer}
        result={currentResult}
        onNext={handleReveal}
      />
    );
  }

  if (phase === "reveal") {
    return (
      <RevealView
        room={room}
        players={players}
        leadPlayer={leadPlayer}
        result={currentResult}
        votes={currentVotes}
        isLastRound={room.currentRound >= room.totalRounds}
        onNext={handleNextRound}
      />
    );
  }

  return null;
}

// ============================================
// 라운드 인트로
// ============================================
function RoundIntro({ round, totalRounds, leadPlayer }) {
  if (!leadPlayer) return null;
  return (
    <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center", padding: 20 }}>
      <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 6px" }}>
        ROUND {round} / {totalRounds}
      </p>
      <p style={{ fontSize: 14, color: colors.text3, margin: "0 0 24px" }}>이번 차례는</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "28px 36px",
          borderRadius: radius.lg,
          background: colors.accentBg,
          border: `2px solid ${colors.accentBorder}`,
          marginBottom: 24,
        }}
      >
        <Avatar nickname={leadPlayer.nickname} size={72} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 22, fontWeight: 500, color: colors.accentText, marginBottom: 4 }}>
          {leadPlayer.nickname}
        </div>
        <div style={{ fontSize: 12, color: colors.accentText, opacity: 0.8 }}>선 플레이어</div>
      </div>

      <p
        style={{
          fontSize: 13,
          color: colors.text3,
          textAlign: "center",
          lineHeight: 1.5,
          margin: "0 0 24px",
          maxWidth: 240,
        }}
      >
        {leadPlayer.nickname}이(가) 어떤 답을 할지<br />모두 함께 맞춰봐요
      </p>
      <div style={{ fontSize: 11, color: colors.text3 }}>잠시 후 시작합니다...</div>
    </div>
  );
}

// ============================================
// 선 플레이어 대기 (다크)
// ============================================
function LeadWaitingScreen({ round, totalRounds, votedCount, totalCount }) {
  const percent = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;
  return (
    <div
      style={{
        ...containerStyle,
        background: "#1A1A1A",
        color: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 24px", letterSpacing: 1.2 }}>
        ROUND {round} / {totalRounds} · 당신은 선 플레이어
      </p>

      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 48 }}>🙈</span>
        <div
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.wrongFill,
            border: "3px solid #1A1A1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ✕
        </div>
      </div>

      <p style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px", textAlign: "center", lineHeight: 1.4 }}>
        옆 사람 화면<br />훔쳐보지 마세요!
      </p>
      <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center", lineHeight: 1.5, margin: "0 0 32px", maxWidth: 260 }}>
        친구들이 당신이 어떤 답을 할지<br />몰래 투표하고 있어요
      </p>

      <div style={{ width: "100%", maxWidth: 220, padding: "14px 16px", borderRadius: radius.md, background: "rgba(255,255,255,0.08)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>투표 진행</span>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.95 }}>
            {votedCount} / {totalCount}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${percent}%`, background: colors.correctFill, borderRadius: 100, transition: "width 0.5s" }} />
        </div>
      </div>

      <p style={{ fontSize: 11, opacity: 0.4, textAlign: "center" }}>
        투표가 끝나면 자동으로<br />다음 화면으로 넘어갑니다
      </p>
    </div>
  );
}

// ============================================
// 투표 화면 (일반 플레이어)
// ============================================
function VotingView({ room, leadPlayer, myVote, totalVoters, submittedCount, onVote, onCardTap }) {
  if (!room.pyramid || !leadPlayer) return null;
  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span>Round {room.currentRound} / {room.totalRounds}</span>
        <span style={{ color: colors.accentText, fontWeight: 500 }}>🙈 선: {leadPlayer.nickname}</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
          {leadPlayer.nickname}이(가) 어디서 YES/NO를 할까?
        </p>
        <p style={{ fontSize: 11, color: colors.text3, margin: "2px 0 0" }}>
          3층 카드 아래 YES/NO 중 하나 선택
        </p>
      </div>

      <Pyramid pyramid={room.pyramid} mode="voting" onCardTap={onCardTap} />

      <VoteBoxes selected={myVote} disabled={!!myVote} onSelect={onVote} />

      <div style={{ marginTop: 12, padding: 8, borderRadius: radius.md, background: colors.surface2, fontSize: 11, color: colors.text3, textAlign: "center" }}>
        👥 투표 완료 {submittedCount} / {totalVoters}
      </div>
    </div>
  );
}

// ============================================
// 답변 화면
// ============================================
function AnsweringView({ room, leadPlayer, isLead, onCardTap }) {
  if (!room.pyramid || !leadPlayer) return null;
  const answersLen = (room.pyramid.answers || []).length;
  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span>Round {room.currentRound} / {room.totalRounds}</span>
        <span style={{ color: colors.correctText, fontWeight: 500 }}>
          ▶ {isLead ? "내 차례" : `${leadPlayer.nickname} 답변 중`}
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
          {answersLen + 1}번째 질문에 답하세요
        </p>
        {isLead && (
          <p style={{ fontSize: 11, color: colors.text3, margin: "2px 0 0" }}>
            반짝이는 카드를 탭하세요
          </p>
        )}
      </div>

      <Pyramid pyramid={room.pyramid} mode={isLead ? "answering-lead" : "answering-watch"} onCardTap={onCardTap} />
    </div>
  );
}

// ============================================
// 결과 정리
// ============================================
function ResultView({ room, leadPlayer, result, onNext }) {
  if (!room.pyramid || !leadPlayer) return null;
  const answers = room.pyramid.answers || [];
  const finalAnswer = answers[2];
  const finalQuestion = finalAnswer?.question || "";

  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span>Round {room.currentRound} / {room.totalRounds}</span>
        <span style={{ color: colors.correctText, fontWeight: 500 }}>✓ 답변 완료</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: colors.text1, margin: 0 }}>
          {leadPlayer.nickname}의 답변 결과
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {answers.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderRadius: radius.md, background: colors.surface2 }}>
            <span style={{ fontSize: 11, color: colors.text3, width: 22 }}>{a.level}층</span>
            <span style={{ fontSize: 13, color: colors.text1, flex: 1, wordBreak: "keep-all" }}>{a.question}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 100,
                color: "#FFFFFF",
                background: a.answer === "YES" ? colors.correctFill : colors.wrongFill,
              }}
            >
              {a.answer}
            </span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: colors.text3, margin: "0 0 8px" }}>최종 도착지</p>
        {result && (
          <div
            style={{
              display: "inline-block",
              padding: "16px 24px",
              borderRadius: radius.lg,
              background: colors.accentBg,
              border: `2px solid ${colors.accentBorder}`,
              maxWidth: "100%",
            }}
          >
            <div style={{ fontSize: 13, color: colors.accentText, opacity: 0.85, marginBottom: 6, wordBreak: "keep-all" }}>
              {finalQuestion}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: colors.accentText, lineHeight: 1 }}>
              {finalAnswer?.answer}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          marginTop: "auto",
          width: "100%",
          padding: 12,
          borderRadius: radius.md,
          border: `1px solid ${colors.border2}`,
          background: colors.surface,
          fontSize: 14,
          fontWeight: 500,
          color: colors.text1,
        }}
      >
        정답자 공개 →
      </button>
    </div>
  );
}

// ============================================
// 정답 공개 - 6개 도착지별 그룹화
// ============================================
function RevealView({ room, players, leadPlayer, result, votes, isLastRound, onNext }) {
  if (!result || !leadPlayer || !room.pyramid) return null;

  // 6개 도착지 표시: 3층 카드 × YES/NO
  const destinations = [];
  for (let idx = 0; idx < 3; idx++) {
    for (const yn of ["Y", "N"]) {
      destinations.push({
        key: `${idx}${yn}`,
        cardIdx: idx,
        answer: yn === "Y" ? "YES" : "NO",
        question: room.pyramid.level3[idx],
      });
    }
  }

  const correctDest = result.destination;

  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span>Round {room.currentRound} / {room.totalRounds}</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: colors.text1, margin: 0 }}>
          {leadPlayer.nickname}의 답변은
        </p>
        <p style={{ fontSize: 13, color: colors.text3, margin: "4px 0 0", wordBreak: "keep-all" }}>
          "{room.pyramid.level3[parseInt(correctDest[0], 10)]}" → <strong style={{ color: correctDest[1] === "Y" ? colors.correctFill : colors.wrongFill }}>{correctDest[1] === "Y" ? "YES" : "NO"}</strong>
        </p>
        <p style={{ fontSize: 11, color: colors.text3, margin: "4px 0 0" }}>
          정답자에게 +1점
        </p>
      </div>

      {/* 도착지별 결과 - 카드별로 묶어서 표시 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {[0, 1, 2].map((cardIdx) => {
          const cardQuestion = room.pyramid.level3[cardIdx];
          const yesDest = `${cardIdx}Y`;
          const noDest = `${cardIdx}N`;
          const yesVoters = votes.filter((v) => v.vote === yesDest);
          const noVoters = votes.filter((v) => v.vote === noDest);
          const yesNicknames = yesVoters.map((v) => players.find((p) => p.id === v.playerId)?.nickname).filter(Boolean);
          const noNicknames = noVoters.map((v) => players.find((p) => p.id === v.playerId)?.nickname).filter(Boolean);

          const hasYesVoters = yesVoters.length > 0;
          const hasNoVoters = noVoters.length > 0;
          if (!hasYesVoters && !hasNoVoters) return null;

          return (
            <div key={cardIdx} style={{ padding: "8px 10px", borderRadius: radius.md, background: colors.surface2, border: `0.5px solid ${colors.border1}` }}>
              <div style={{ fontSize: 11, color: colors.text3, marginBottom: 6, wordBreak: "keep-all" }}>
                {cardQuestion}
              </div>
              {hasYesVoters && (
                <DestRow
                  label="YES"
                  type="yes"
                  isCorrect={correctDest === yesDest}
                  voters={yesNicknames}
                />
              )}
              {hasNoVoters && (
                <DestRow
                  label="NO"
                  type="no"
                  isCorrect={correctDest === noDest}
                  voters={noNicknames}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 점수 미리보기 */}
      <div style={{ padding: "10px 12px", borderRadius: radius.md, background: colors.surface2, marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: colors.text3, margin: "0 0 6px" }}>현재 점수</p>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", rowGap: 4, fontSize: 12, color: colors.text1 }}>
          {[...players]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((p) => (
              <span key={p.id} style={{ marginRight: 8 }}>
                {p.nickname} <strong style={{ fontWeight: 500 }}>{p.score || 0}</strong>
              </span>
            ))}
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          marginTop: "auto",
          width: "100%",
          padding: 12,
          borderRadius: radius.md,
          fontSize: 14,
          fontWeight: 500,
          border: `1px solid ${colors.border2}`,
          background: colors.accentBg,
          color: colors.accentText,
        }}
      >
        {isLastRound ? "최종 결과 보기 →" : "다음 라운드 →"}
      </button>
    </div>
  );
}

function DestRow({ label, type, isCorrect, voters }) {
  const fillColor = type === "yes" ? colors.correctFill : colors.wrongFill;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 8px",
        borderRadius: radius.sm,
        background: isCorrect ? (type === "yes" ? colors.correctBg : colors.wrongBg) : "transparent",
        border: isCorrect ? `1.5px solid ${fillColor}` : "none",
        marginTop: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 100,
          color: "#FFFFFF",
          background: fillColor,
          marginRight: 8,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, fontSize: 12, color: colors.text1, display: "flex", flexWrap: "wrap", gap: 4 }}>
        {voters.map((n, i) => (
          <span key={i}>
            {n}
            {i < voters.length - 1 && <span style={{ opacity: 0.4, marginLeft: 4 }}>·</span>}
          </span>
        ))}
      </div>
      {isCorrect && (
        <span style={{ fontSize: 11, fontWeight: 500, color: colors.correctText, marginLeft: 4 }}>
          +1점
        </span>
      )}
    </div>
  );
}

// ============================================
// 최종 결과
// ============================================
function FinalResult({ players, myPlayerId, results, allVotes, totalRounds, onLeave }) {
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
    <div style={{ ...containerStyle, padding: "16px 12px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px" }}>GAME OVER</p>
        <p style={{ fontSize: 18, fontWeight: 500, color: colors.text1, margin: 0 }}>
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
          border: `2px solid ${colors.cardBorder}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "3px 10px",
            borderRadius: 100,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 0.5,
            background: colors.cardAccent,
            color: colors.cardTextDeep,
          }}
        >
          WINNER
        </div>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🏆</div>
        <div style={{ fontSize: 20, fontWeight: 500, color: colors.cardText, marginBottom: 2 }}>
          {winner?.nickname || "?"}
        </div>
        <div style={{ fontSize: 13, color: colors.cardTextDeep }}>{winner?.score || 0}점 획득</div>
      </div>

      {/* 나를 가장 잘 맞춘 사람 */}
      {soulmatePlayers.length > 0 ? (
        <div
          style={{
            padding: "14px",
            borderRadius: radius.lg,
            marginBottom: 14,
            background: colors.pinkBg,
            border: `1px solid ${colors.pinkBorder}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>💝</span>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.3, color: colors.pinkText }}>
              나를 가장 잘 맞춘 사람
            </span>
            {soulmatePlayers.length > 1 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 100,
                  background: colors.pinkBorder,
                  color: colors.pinkDeep,
                }}
              >
                동률 {soulmatePlayers.length}명
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {soulmatePlayers.map((sp) => (
              <div key={sp.id} style={{ display: "flex", alignItems: "center" }}>
                <Avatar nickname={sp.nickname} size={36} style={{ marginRight: 12 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.pinkDeep }}>
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
        <div
          style={{
            padding: "18px 14px",
            borderRadius: radius.lg,
            marginBottom: 14,
            background: colors.surface2,
            border: `1px dashed ${colors.border2}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>🌀</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text1, marginBottom: 2 }}>
            나를 맞춘 사람이 없네요
          </div>
          <div style={{ fontSize: 11, color: colors.text3 }}>당신은 미스터리한 사람!</div>
        </div>
      ) : null}

      {/* 순위 */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: colors.text3, margin: "0 0 8px", paddingLeft: 4, letterSpacing: 0.3 }}>
          전체 순위
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sortedPlayers.map((p, idx) => {
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: radius.md,
                  ...(isMe
                    ? { background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }
                    : { background: colors.surface2 }),
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    width: 22,
                    color: isMe ? colors.accentText : colors.text3,
                  }}
                >
                  {idx + 1}
                </span>
                <Avatar nickname={p.nickname} size={28} style={{ marginRight: 10, marginLeft: 4 }} />
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: colors.text1,
                    fontWeight: isMe ? 500 : 400,
                  }}
                >
                  {p.nickname}
                  {isMe && <span style={{ fontSize: 10, color: colors.accentText, marginLeft: 4 }}>나</span>}
                </div>
                <span style={{ fontSize: 13, color: colors.text1, fontWeight: isMe ? 500 : 400 }}>
                  {p.score || 0}점
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
        <button
          onClick={onLeave}
          style={{
            padding: 12,
            borderRadius: radius.md,
            border: `1px solid ${colors.border2}`,
            background: colors.surface,
            fontSize: 13,
            fontWeight: 500,
            color: colors.text3,
          }}
        >
          나가기
        </button>
        <button
          onClick={onLeave}
          style={{
            padding: 12,
            borderRadius: radius.md,
            border: `1px solid ${colors.border2}`,
            background: colors.accentBg,
            fontSize: 13,
            fontWeight: 500,
            color: colors.accentText,
          }}
        >
          홈으로 →
        </button>
      </div>
    </div>
  );
}
