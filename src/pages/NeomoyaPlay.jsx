import { useState, useEffect, useMemo, useRef } from "react";
import {
  submitNeomoyaScoreVote,
  submitNeomoyaScoreLeadAnswers,
  revealNeomoyaScoreResult,
  submitNeomoyaFunAnswers,
  finishNeomoyaFun,
  nextRound,
  markReady,
} from "../lib/room";
import { josa, calculateFunModeStats } from "../lib/game";
import Avatar from "../components/Avatar";
import ScenarioPopup from "../components/ScenarioPopup";
import { colors, radius, shadow, containerStyle } from "../lib/theme";

// 너모야 모드 게임 진행
// subMode: "score" (점수, 선플레이어 있음) | "fun" (재미, 선플레이어 없음)
export default function NeomoyaPlay({ room, code, myPlayerId, leadPlayer, players, onFinish }) {
  const subMode = room.neomoya?.subMode || "score";
  const scenarios = room.neomoya?.scenarios || [];
  const count = room.neomoya?.count || 5;
  const leadAnswers = room.neomoya?.leadAnswers || null;
  const isLead = subMode === "score" && leadPlayer?.id === myPlayerId;

  const [phase, setPhase] = useState("intro"); // intro / voting-popup / voting-confirm / lead-answering / lead-confirm / voted-waiting / lead-waiting / result / reveal / fun-result
  const [myStepAnswers, setMyStepAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // 점수 모드 - 현재 라운드 투표 집계
  const currentVotes = useMemo(() => {
    const v = room.votes?.[room.currentRound] || {};
    return Object.entries(v).map(([pid, data]) => ({ playerId: pid, ...data }));
  }, [room.votes, room.currentRound]);

  const submittedVotesCount = currentVotes.length;
  const nonLeadCount = subMode === "score" ? players.length - 1 : 0;
  const currentResult = room.results?.[room.currentRound];

  // 재미 모드 - 답변 집계
  const funAnswers = useMemo(() => {
    if (subMode !== "fun") return [];
    const data = room.neomoyaFunAnswers || {};
    return Object.entries(data).map(([pid, d]) => ({ playerId: pid, answers: d.answers || [] }));
  }, [room.neomoyaFunAnswers, subMode]);

  const funSubmittedCount = funAnswers.length;
  const myFunAnswer = funAnswers.find((a) => a.playerId === myPlayerId);

  // ============ Phase 전환 ============
  function computeNextPhase() {
    if (subMode === "fun") {
      // 재미 모드: 답 입력 → 확인 → 모두 완료까지 대기 → 결과
      if (room.status === "finished") return "fun-result";
      if (myFunAnswer) return "fun-waiting";
      return "voting-popup";
    }

    // 점수 모드
    if (currentResult?.revealed) return "reveal";
    if (isLead) {
      if (!leadAnswers) {
        if (submittedVotesCount >= nonLeadCount && nonLeadCount > 0) {
          return "lead-answering";
        }
        return "lead-waiting";
      }
      return "result";
    }
    const myVote = currentVotes.find((v) => v.playerId === myPlayerId);
    if (myVote) {
      if (leadAnswers) return "result";
      return "voted-waiting";
    }
    return "voting-popup";
  }

  // 라운드 시작 인트로
  useEffect(() => {
    if (room.status !== "playing" && room.status !== "finished") return;
    if (subMode === "fun") {
      if (room.status === "finished") {
        setPhase("fun-result");
        return;
      }
      // 이미 답변했으면 인트로 스킵하고 바로 대기 화면
      if (myFunAnswer) {
        setPhase("fun-waiting");
        return;
      }
      // 첫 진입 - 인트로 보여주고 2.5초 후 투표 화면
      if (phase === "intro") {
        const t = setTimeout(() => setPhase(computeNextPhase()), 2500);
        return () => clearTimeout(t);
      }
      return;
    }
    // 점수 모드 - 라운드 변경 시
    if (!leadAnswers && currentVotes.length === 0) {
      setPhase("intro");
      setMyStepAnswers([]);
      const t = setTimeout(() => setPhase(computeNextPhase()), 2500);
      return () => clearTimeout(t);
    }
  }, [room.currentRound, room.status, subMode]); // eslint-disable-line

  // 통합 phase
  useEffect(() => {
    if (room.status !== "playing" && room.status !== "finished") return;
    if (phase === "intro") return;
    if (phase === "voting-confirm" || phase === "lead-confirm") return;
    const next = computeNextPhase();
    if (next !== phase) setPhase(next);
  }, [
    phase, room.status, subMode, isLead, leadAnswers,
    submittedVotesCount, nonLeadCount, currentResult?.revealed,
    myFunAnswer, funSubmittedCount,
  ]); // eslint-disable-line

  // ============ 액션 ============
  function handleStepAnswer(answer) {
    if (myStepAnswers.length >= count) return;
    const newAnswers = [...myStepAnswers, answer];
    setMyStepAnswers(newAnswers);
    if (newAnswers.length === count) {
      setPhase(isLead ? "lead-confirm" : "voting-confirm");
    }
  }

  async function handleVoteConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (subMode === "fun") {
        await submitNeomoyaFunAnswers(code, myPlayerId, myStepAnswers);
      } else {
        await submitNeomoyaScoreVote(code, room.currentRound, myPlayerId, myStepAnswers);
      }
      setPhase(subMode === "fun" ? "fun-waiting" : "voted-waiting");
    } catch (e) {
      console.error(e);
      alert("전송 실패");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  async function handleLeadConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitNeomoyaScoreLeadAnswers(code, myStepAnswers);
      setPhase("result");
    } catch (e) {
      console.error(e);
      alert("전송 실패");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  // ============ 준비 체크 ============
  async function handleMarkReadyReveal() {
    await markReady(code, room.currentRound, "reveal", myPlayerId);
  }

  async function handleMarkReadyNext() {
    await markReady(code, room.currentRound, "next", myPlayerId);
  }

  const isHost = (room.players?.[myPlayerId] || {}).isHost;
  const readyReveal = room.readyState?.[room.currentRound]?.reveal || {};
  const readyNext = room.readyState?.[room.currentRound]?.next || {};
  const activePlayerIds = players.map((p) => p.id);
  const readyRevealCount = activePlayerIds.filter((id) => readyReveal[id]).length;
  const readyNextCount = activePlayerIds.filter((id) => readyNext[id]).length;
  const totalPlayerCount = players.length;
  const myReadyReveal = !!readyReveal[myPlayerId];
  const myReadyNext = !!readyNext[myPlayerId];

  // 점수 모드 자동 트리거
  useEffect(() => {
    if (subMode !== "score") return;
    if (!isHost) return;
    if (phase !== "result") return;
    if (currentResult?.revealed) return;
    if (readyRevealCount === totalPlayerCount && totalPlayerCount > 0) {
      revealNeomoyaScoreResult(code, room.currentRound);
    }
  }, [subMode, isHost, phase, readyRevealCount, totalPlayerCount, currentResult?.revealed]); // eslint-disable-line

  const nextTriggeredRef = useRef({});
  useEffect(() => {
    if (subMode !== "score") return;
    if (!isHost) return;
    if (phase !== "reveal") return;
    if (readyNextCount === totalPlayerCount && totalPlayerCount > 0) {
      const key = `${room.currentRound}`;
      if (nextTriggeredRef.current[key]) return;
      nextTriggeredRef.current[key] = true;
      nextRound(code);
    }
  }, [subMode, isHost, phase, readyNextCount, totalPlayerCount]); // eslint-disable-line

  // 재미 모드: 모두 답변 완료 → 방장이 자동 finish
  const funFinishTriggeredRef = useRef(false);
  useEffect(() => {
    if (subMode !== "fun") return;
    if (!isHost) return;
    if (room.status === "finished") return;
    if (funSubmittedCount === totalPlayerCount && totalPlayerCount > 0) {
      if (funFinishTriggeredRef.current) return;
      funFinishTriggeredRef.current = true;
      finishNeomoyaFun(code);
    }
  }, [subMode, isHost, funSubmittedCount, totalPlayerCount, room.status]); // eslint-disable-line

  // ============ 렌더 ============
  if (phase === "intro") {
    return <IntroScreen subMode={subMode} round={room.currentRound} totalRounds={room.totalRounds} leadPlayer={leadPlayer} players={players} count={count} />;
  }

  // 재미 모드: 답변 대기
  if (subMode === "fun" && phase === "fun-waiting") {
    return <FunWaitingView submittedCount={funSubmittedCount} totalCount={totalPlayerCount} />;
  }

  // 재미 모드: 최종 결과
  if (subMode === "fun" && phase === "fun-result") {
    return <FunResultView funAnswers={funAnswers} scenarios={scenarios} players={players} myPlayerId={myPlayerId} onFinish={onFinish} />;
  }

  // 점수 모드 - 선플레이어 대기
  if (phase === "lead-waiting" && isLead) {
    return <WaitingDark round={room.currentRound} totalRounds={room.totalRounds} votedCount={submittedVotesCount} totalCount={nonLeadCount} />;
  }

  // 투표/답변 입력 팝업
  if (phase === "voting-popup" || phase === "lead-answering") {
    const step = myStepAnswers.length;
    const scenario = scenarios[step];
    return (
      <PopupBackground room={room} leadPlayer={leadPlayer} subMode={subMode} step={step + 1} total={count} isLead={isLead}>
        <ScenarioPopup
          open={true}
          currentStep={step + 1}
          totalSteps={count}
          scenario={scenario}
          onAnswer={handleStepAnswer}
        />
      </PopupBackground>
    );
  }

  // 최종 확인
  if (phase === "voting-confirm" || phase === "lead-confirm") {
    return (
      <ConfirmView
        round={room.currentRound}
        totalRounds={room.totalRounds}
        leadPlayer={leadPlayer}
        scenarios={scenarios}
        myAnswers={myStepAnswers}
        isLead={isLead}
        subMode={subMode}
        onConfirm={isLead ? handleLeadConfirm : handleVoteConfirm}
        submitting={submitting}
      />
    );
  }

  // 점수 모드: 투표 완료 후 선플 답 대기
  if (phase === "voted-waiting" && !isLead) {
    return (
      <div style={{ ...containerStyle, justifyContent: "center", alignItems: "center", padding: "0 12px" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: colors.text1, margin: "0 0 4px" }}>
          예측 완료!
        </p>
        <p style={{ fontSize: 12, color: colors.text3, margin: 0 }}>
          {josa(leadPlayer?.nickname || "", "이/가")} 답변 중...
        </p>
      </div>
    );
  }

  // 점수 모드: 결과 (정답자 공개 전)
  if (phase === "result") {
    return (
      <ResultView
        room={room}
        leadPlayer={leadPlayer}
        scenarios={scenarios}
        leadAnswers={leadAnswers || []}
        myAnswers={isLead ? leadAnswers || [] : myStepAnswers}
        isLead={isLead}
        onMarkReady={handleMarkReadyReveal}
        isReady={myReadyReveal}
        readyCount={readyRevealCount}
        totalCount={totalPlayerCount}
      />
    );
  }

  // 점수 모드: 정답 공개
  if (phase === "reveal") {
    return (
      <RevealView
        room={room}
        players={players}
        leadPlayer={leadPlayer}
        scenarios={scenarios}
        leadAnswers={leadAnswers || []}
        votes={currentVotes}
        myPlayerId={myPlayerId}
        myAnswers={myStepAnswers}
        isLead={isLead}
        isLastRound={room.currentRound >= room.totalRounds}
        onMarkReady={handleMarkReadyNext}
        isReady={myReadyNext}
        readyCount={readyNextCount}
        totalCount={totalPlayerCount}
      />
    );
  }

  return null;
}

// ============================================
// 인트로
// ============================================
function IntroScreen({ subMode, round, totalRounds, leadPlayer, players, count }) {
  return (
    <div style={{ ...containerStyle, justifyContent: "center", alignItems: "center", padding: "20px 12px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 4px", fontWeight: 600 }}>
          {subMode === "fun" ? "FUN MODE" : `ROUND ${round} / ${totalRounds}`}
        </p>
        <p style={{ fontSize: 17, fontWeight: 700, color: colors.text1, margin: 0 }}>
          🎭 너모야 시작!
        </p>
      </div>

      {subMode === "score" && leadPlayer && (
        <div style={{
          padding: "24px 20px", borderRadius: radius.xl, textAlign: "center",
          background: colors.cardBg, border: `2px solid ${colors.cardBorderDeep}`,
          marginBottom: 20, boxShadow: shadow.cardLift,
        }}>
          <Avatar nickname={leadPlayer.nickname} colorIndex={(players || []).findIndex((p) => p.id === leadPlayer.id)} size={72} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.accentDeep, marginBottom: 4 }}>
            {leadPlayer.nickname}
          </div>
          <div style={{ fontSize: 12, color: colors.accentText, fontWeight: 600 }}>
            오늘의 주인공 🎯
          </div>
        </div>
      )}

      <p style={{ fontSize: 13, color: colors.text2, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
        {subMode === "fun" ? (
          <>
            <strong>{count}개</strong> 시나리오에<br />각자 답해보세요 💭
          </>
        ) : (
          <>
            {josa(leadPlayer?.nickname || "", "을/를")} 향한 <strong>{count}개</strong>의 시나리오!<br />
            어떻게 답할지 맞춰보세요 🎯
          </>
        )}
      </p>
    </div>
  );
}

// ============================================
// 팝업 배경
// ============================================
function PopupBackground({ room, leadPlayer, subMode, step, total, isLead, children }) {
  return (
    <div style={{ ...containerStyle, position: "relative", padding: "14px 12px 16px", justifyContent: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11, color: colors.text3 }}>
        <span style={{ fontWeight: 600 }}>
          {subMode === "fun" ? "너모야 (재미)" : `Round ${room.currentRound} / ${room.totalRounds}`}
        </span>
        <span style={{ color: subMode === "fun" ? colors.accentText : (isLead ? colors.correctText : colors.accentText), fontWeight: 600 }}>
          {subMode === "fun" ? "🎭 각자 답하기" : (isLead ? "🙈 내가 주인공" : `🙈 주인공: ${leadPlayer?.nickname || ""}`)}
        </span>
      </div>
      <p style={{ fontSize: 11, color: colors.text3, textAlign: "center", margin: "8px 0 16px" }}>
        {subMode === "fun" ? "솔직하게 답해주세요" : (isLead ? "내 답변 입력 중..." : `${josa(leadPlayer?.nickname || "", "이/가")} 어떻게 답할지 예측 중...`)}
      </p>
      {children}
    </div>
  );
}

// ============================================
// 선플레이어 대기 (점수 모드)
// ============================================
function WaitingDark({ round, totalRounds, votedCount, totalCount }) {
  return (
    <div style={{ ...containerStyle, background: "#2a2520", color: "#FFF8F0", justifyContent: "center", alignItems: "center", padding: "0 12px" }}>
      <p style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1, margin: 0 }}>ROUND {round} / {totalRounds}</p>
      <div style={{ fontSize: 36, margin: "12px 0 6px" }}>👀</div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>친구들이 예측 중...</p>
      <div style={{ marginTop: 14, padding: "4px 14px", borderRadius: 100, background: "rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 700 }}>
        {votedCount} / {totalCount}
      </div>
      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 10 }}>모두 끝나면 내 차례</p>
    </div>
  );
}

// ============================================
// 최종 확인 화면
// ============================================
function ConfirmView({ round, totalRounds, leadPlayer, scenarios, myAnswers, isLead, subMode, onConfirm, submitting }) {
  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px", justifyContent: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span style={{ fontWeight: 600 }}>
          {subMode === "fun" ? "너모야 (재미)" : `Round ${round} / ${totalRounds}`}
        </span>
        <span style={{ color: subMode === "fun" ? colors.accentText : (isLead ? colors.correctText : colors.accentText), fontWeight: 600 }}>
          {subMode === "fun" ? "🎭 내 답변" : (isLead ? "🙈 내가 주인공" : `🙈 주인공: ${leadPlayer?.nickname}`)}
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: colors.text1 }}>
          {subMode === "fun" ? "💭 내가 고른 답" : (isLead ? "🎯 나의 답변 확인" : `💭 내가 예상한 ${leadPlayer?.nickname}의 답변`)}
        </p>
        <p style={{ fontSize: 10, color: colors.text3, margin: "4px 0 0" }}>
          맞다면 확정해주세요
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {scenarios.map((s, i) => (
          <ScenarioAnswerRow key={i} index={i + 1} scenario={s} answer={myAnswers[i]} />
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={submitting}
        style={{
          padding: 13, borderRadius: radius.lg,
          background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
          color: "#FFFFFF", fontSize: 14, fontWeight: 700,
          border: "none", boxShadow: shadow.button,
          cursor: submitting ? "default" : "pointer",
          fontFamily: "inherit", opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "전송 중..." : "✨ 답변 확정"}
      </button>
    </div>
  );
}

// 시나리오 + 내 답변 1행 (펼침 가능)
function ScenarioAnswerRow({ index, scenario, answer }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = scenario.scenario.length > 30;
  const displayText = !expanded && truncated ? scenario.scenario.substring(0, 30) + "..." : scenario.scenario;
  const myChoice = answer === "A" ? scenario.optionA : scenario.optionB;
  const myColor = answer === "A" ? colors.correctFill : colors.wrongFill;

  return (
    <div
      onClick={() => truncated && setExpanded(!expanded)}
      style={{
        padding: "8px 10px",
        borderRadius: radius.md,
        background: colors.surface,
        border: `1px solid ${colors.border1}`,
        cursor: truncated ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: colors.text3, fontWeight: 700, minWidth: 14, marginTop: 2 }}>{index}</span>
        <span style={{ fontSize: 12, color: colors.text1, flex: 1, wordBreak: "keep-all", fontWeight: 500, lineHeight: 1.4 }}>
          {displayText}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 20 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100,
          background: myColor, color: "#FFFFFF",
        }}>
          {answer}
        </span>
        <span style={{ fontSize: 11, color: colors.text1, fontWeight: 600 }}>
          {myChoice}
        </span>
      </div>
    </div>
  );
}

// ============================================
// 점수 모드 - 결과 (정답자 공개 직전)
// ============================================
function ResultView({ room, leadPlayer, scenarios, leadAnswers, myAnswers, isLead, onMarkReady, isReady, readyCount, totalCount }) {
  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px", justifyContent: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span style={{ fontWeight: 600 }}>Round {room.currentRound} / {room.totalRounds}</span>
        <span style={{ color: isLead ? colors.correctText : colors.accentText, fontWeight: 600 }}>
          🙈 {isLead ? "내가 주인공" : `주인공: ${leadPlayer?.nickname}`}
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: colors.text1 }}>
          {isLead ? "✓ 내 답변 완료" : `✓ ${leadPlayer?.nickname}의 답변 완료`}
        </p>
        <p style={{ fontSize: 11, color: colors.text3, margin: "4px 0 0" }}>
          {isLead ? "친구들의 예측을 확인해보세요" : "내 예측이 얼마나 맞았을까?"}
        </p>
      </div>

      {isLead && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
          {scenarios.map((s, i) => (
            <ScenarioAnswerRow key={i} index={i + 1} scenario={s} answer={leadAnswers[i]} />
          ))}
        </div>
      )}

      <ReadyButton
        isReady={isReady}
        readyCount={readyCount}
        totalCount={totalCount}
        onClick={onMarkReady}
        actionLabel="🎉 정답자 공개"
      />
    </div>
  );
}

// ============================================
// 점수 모드 - 정답 공개
// ============================================
function RevealView({ room, players, leadPlayer, scenarios, leadAnswers, votes, myPlayerId, isLead, isLastRound, onMarkReady, isReady, readyCount, totalCount }) {
  const myVote = votes.find((v) => v.playerId === myPlayerId);
  const myMatchCount = myVote?.matchCount ?? 0;
  const count = scenarios.length;

  function getVotersForScenario(qIdx, answer) {
    return votes
      .filter((v) => v.voteArray && v.voteArray[qIdx] === answer)
      .map((v) => players.find((p) => p.id === v.playerId))
      .filter(Boolean);
  }

  const voterResults = [...votes]
    .map((v) => ({ ...v, player: players.find((p) => p.id === v.playerId) }))
    .filter((v) => v.player)
    .sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0));

  return (
    <div style={{ ...containerStyle, padding: "14px 12px 16px", justifyContent: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 11, color: colors.text3 }}>
        <span style={{ fontWeight: 600 }}>Round {room.currentRound} / {room.totalRounds}</span>
        <span style={{ color: isLead ? colors.correctText : colors.accentText, fontWeight: 600 }}>
          🙈 {isLead ? "내가 주인공" : `주인공: ${leadPlayer?.nickname}`}
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: colors.text1 }}>
          정답 공개!
        </p>
        {!isLead && (
          <p style={{ fontSize: 12, color: colors.accentText, margin: "4px 0 0", fontWeight: 700 }}>
            나는 {myMatchCount} / {count} 맞췄어요!
          </p>
        )}
      </div>

      {/* 시나리오별 분포 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {scenarios.map((s, i) => {
          const correctAns = leadAnswers[i];
          const aVoters = getVotersForScenario(i, "A");
          const bVoters = getVotersForScenario(i, "B");
          return (
            <ScenarioRevealRow
              key={i}
              index={i + 1}
              scenario={s}
              correctAns={correctAns}
              aVoters={aVoters}
              bVoters={bVoters}
              myPlayerId={myPlayerId}
            />
          );
        })}
      </div>

      {/* 점수 표 */}
      <div style={{ padding: "10px 12px", borderRadius: radius.md, background: colors.surface, border: `1px solid ${colors.border1}`, marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: colors.text3, margin: "0 0 8px", fontWeight: 700 }}>
          🏆 이번 라운드 점수
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {voterResults.map((v) => (
            <div key={v.playerId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Avatar nickname={v.player.nickname} colorIndex={players.findIndex((p) => p.id === v.playerId)} size={20} />
              <span style={{ flex: 1, color: colors.text1 }}>{v.player.nickname}</span>
              <span style={{ fontWeight: 700, color: colors.correctText }}>
                +{v.matchCount || 0}점
              </span>
              <span style={{ fontSize: 10, color: colors.text3 }}>
                ({v.matchCount || 0}/{count})
              </span>
            </div>
          ))}
        </div>
      </div>

      <ReadyButton
        isReady={isReady}
        readyCount={readyCount}
        totalCount={totalCount}
        onClick={onMarkReady}
        actionLabel={isLastRound ? "🎊 최종 결과 보기" : "▶ 다음 라운드"}
      />
    </div>
  );
}

// 시나리오 1개 + 정답 + 양쪽 투표자
function ScenarioRevealRow({ index, scenario, correctAns, aVoters, bVoters, myPlayerId }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = scenario.scenario.length > 35;
  const displayText = !expanded && truncated ? scenario.scenario.substring(0, 35) + "..." : scenario.scenario;

  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: radius.md,
      background: colors.surface,
      border: `1px solid ${colors.border1}`,
    }}>
      <div
        onClick={() => truncated && setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, cursor: truncated ? "pointer" : "default" }}
      >
        <span style={{ fontSize: 10, color: colors.text3, fontWeight: 700, minWidth: 14, marginTop: 2 }}>{index}</span>
        <span style={{ fontSize: 12, color: colors.text1, flex: 1, wordBreak: "keep-all", fontWeight: 600, lineHeight: 1.4 }}>{displayText}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
          background: correctAns === "A" ? colors.correctFill : colors.wrongFill, color: "#FFFFFF",
          flexShrink: 0,
        }}>
          정답 {correctAns}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <VoterLineNeomoya label="A" optionText={scenario.optionA} type="a" voters={aVoters} myPlayerId={myPlayerId} isCorrect={correctAns === "A"} />
        <VoterLineNeomoya label="B" optionText={scenario.optionB} type="b" voters={bVoters} myPlayerId={myPlayerId} isCorrect={correctAns === "B"} />
      </div>
    </div>
  );
}

function VoterLineNeomoya({ label, optionText, type, voters, myPlayerId, isCorrect }) {
  const color = type === "a" ? colors.correctFill : colors.wrongFill;
  const bg = isCorrect ? (type === "a" ? colors.correctBg : colors.wrongBg) : colors.surface2;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "6px 8px",
      borderRadius: radius.sm,
      background: bg,
      border: isCorrect ? `1.5px solid ${color}` : "none",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        padding: "2px 8px", borderRadius: 100,
        background: color, color: "#FFFFFF",
        minWidth: 22, textAlign: "center", flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 10, color: colors.text2, fontWeight: 500, lineHeight: 1.3 }}>
          {optionText}
        </span>
        {voters.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {voters.map((v, i) => {
              const isMe = v.id === myPlayerId;
              return (
                <span key={v.id} style={{
                  fontSize: 10,
                  color: isMe ? color : colors.text3,
                  fontWeight: isMe ? 700 : 500,
                }}>
                  {v.nickname}{isMe && " (나)"}{i < voters.length - 1 && <span style={{ opacity: 0.3, marginLeft: 4 }}>·</span>}
                </span>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: 9, color: colors.text3, fontStyle: "italic" }}>
            선택자 없음
          </span>
        )}
      </div>
      {isCorrect && voters.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, color: type === "a" ? colors.correctText : colors.wrongFill, flexShrink: 0 }}>
          +{voters.length}
        </span>
      )}
    </div>
  );
}

// ============================================
// 재미 모드 - 답변 후 대기
// ============================================
function FunWaitingView({ submittedCount, totalCount }) {
  return (
    <div style={{ ...containerStyle, justifyContent: "center", alignItems: "center", padding: "0 12px" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      <p style={{ fontSize: 14, fontWeight: 700, color: colors.text1, margin: "0 0 4px" }}>
        답변 완료!
      </p>
      <p style={{ fontSize: 12, color: colors.text3, margin: "0 0 12px" }}>
        다른 친구들을 기다리는 중
      </p>
      <div style={{ padding: "4px 14px", borderRadius: 100, background: colors.accentBg, fontSize: 13, fontWeight: 700, color: colors.accentDeep }}>
        {submittedCount} / {totalCount}
      </div>
    </div>
  );
}

// ============================================
// 재미 모드 - 최종 결과
// ============================================
function FunResultView({ funAnswers, scenarios, players, myPlayerId, onFinish }) {
  const stats = useMemo(() => calculateFunModeStats(funAnswers, scenarios), [funAnswers, scenarios]);
  const playerById = useMemo(() => {
    const m = {};
    for (const p of players) m[p.id] = p;
    return m;
  }, [players]);

  function nick(pid) {
    return playerById[pid]?.nickname || "?";
  }

  function colorIdx(pid) {
    return players.findIndex((p) => p.id === pid);
  }

  return (
    <div style={{ ...containerStyle, padding: "16px 12px 16px", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🎊</div>
        <p style={{ fontSize: 11, color: colors.text3, letterSpacing: 1.2, margin: "0 0 2px", fontWeight: 600 }}>GAME OVER</p>
        <p style={{ fontSize: 17, fontWeight: 700, color: colors.text1, margin: 0 }}>
          너모야 종료!
        </p>
      </div>

      {/* 영혼의 단짝 톱3 */}
      <div style={{
        padding: "12px 14px", borderRadius: radius.lg, marginBottom: 12,
        background: colors.pinkBg, border: `1px solid ${colors.pinkBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>👯</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.pinkText }}>
            오늘의 영혼의 단짝
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stats.soulmatePairs.map((pair, idx) => {
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={`${pair.p1}-${pair.p2}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{medals[idx]}</span>
                <Avatar nickname={nick(pair.p1)} colorIndex={colorIdx(pair.p1)} size={24} />
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.pinkDeep }}>{nick(pair.p1)}</span>
                <span style={{ fontSize: 10, color: colors.text3 }}>,</span>
                <Avatar nickname={nick(pair.p2)} colorIndex={colorIdx(pair.p2)} size={24} />
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.pinkDeep }}>{nick(pair.p2)}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: colors.pinkText, fontWeight: 600 }}>
                  {pair.total}개 중 {pair.matchCount}개
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 가장 독특한 사람 */}
      {stats.mostUnique && (
        <div style={{
          padding: "10px 14px", borderRadius: radius.lg, marginBottom: 12,
          background: colors.surface, border: `1px solid ${colors.border1}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>🦄</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.text3 }}>
              가장 독특한 사람
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar nickname={nick(stats.mostUnique.playerId)} colorIndex={colorIdx(stats.mostUnique.playerId)} size={26} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.text1 }}>{nick(stats.mostUnique.playerId)}</span>
            <span style={{ fontSize: 11, color: colors.text3 }}>
              — {stats.mostUnique.count}번이나 혼자 다른 답!
            </span>
          </div>
        </div>
      )}

      {/* 정반대 영혼 톱3 */}
      <div style={{
        padding: "12px 14px", borderRadius: radius.lg, marginBottom: 12,
        background: colors.surface2, border: `1px solid ${colors.border1}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🌗</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.text3 }}>
            정반대 영혼
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats.oppositePairs.map((pair) => (
            <div key={`${pair.p1}-${pair.p2}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar nickname={nick(pair.p1)} colorIndex={colorIdx(pair.p1)} size={20} />
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.text1 }}>{nick(pair.p1)}</span>
              <span style={{ fontSize: 10, color: colors.text3 }}>↔</span>
              <Avatar nickname={nick(pair.p2)} colorIndex={colorIdx(pair.p2)} size={20} />
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.text1 }}>{nick(pair.p2)}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: colors.text3 }}>
                {pair.total}개 중 {pair.matchCount}개
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 호불호 갈린 시나리오 톱3 */}
      <div style={{
        padding: "12px 14px", borderRadius: radius.lg, marginBottom: 16,
        background: colors.surface, border: `1px solid ${colors.border1}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>💝</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.text3 }}>
            가장 호불호 갈린 시나리오
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stats.divisiveQuestions.map((q, idx) => (
            <DivisiveScenarioRow key={idx} scenario={scenarios[q.scenarioIdx]} aCount={q.aCount} bCount={q.bCount} />
          ))}
        </div>
      </div>

      <button
        onClick={onFinish}
        style={{
          padding: 13, borderRadius: radius.lg,
          background: colors.accentBg, color: colors.accentDeep,
          fontSize: 14, fontWeight: 700,
          border: "none", boxShadow: "0 2px 4px rgba(83,74,183,0.15)",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        🏠 홈으로
      </button>
    </div>
  );
}

function DivisiveScenarioRow({ scenario, aCount, bCount }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = scenario.scenario.length > 35;
  const displayText = !expanded && truncated ? scenario.scenario.substring(0, 35) + "..." : scenario.scenario;
  return (
    <div
      onClick={() => truncated && setExpanded(!expanded)}
      style={{
        padding: "6px 8px", borderRadius: radius.sm,
        background: colors.surface2,
        cursor: truncated ? "pointer" : "default",
      }}
    >
      <p style={{ fontSize: 11, color: colors.text1, margin: "0 0 4px", lineHeight: 1.4, fontWeight: 500 }}>
        "{displayText}"
      </p>
      <p style={{ fontSize: 10, color: colors.text3, margin: 0 }}>
        → A {aCount}명 / B {bCount}명
      </p>
    </div>
  );
}

// ============================================
// 준비 버튼
// ============================================
function ReadyButton({ isReady, readyCount, totalCount, onClick, actionLabel }) {
  const percent = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;

  if (isReady) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: radius.lg,
        background: colors.surface, border: `1.5px solid ${colors.border1}`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: colors.text2, fontWeight: 600, marginBottom: 8 }}>
          ⏳ 다른 친구들을 기다리는 중 · {readyCount}/{totalCount}
        </div>
        <div style={{ height: 4, borderRadius: 100, background: colors.surface2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", width: `${percent}%`,
              background: colors.correctFill, borderRadius: 100,
              transition: "width 0.4s",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: colors.text3, marginTop: 6 }}>
          모두 준비되면 자동으로 넘어가요
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onClick}
        style={{
          width: "100%", padding: 13, borderRadius: radius.lg,
          background: colors.accentBg, color: colors.accentDeep,
          fontSize: 14, fontWeight: 700,
          border: "none", boxShadow: "0 2px 4px rgba(83,74,183,0.15)",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        {actionLabel} →
      </button>
      {readyCount > 0 && (
        <div style={{ fontSize: 10, color: colors.text3, textAlign: "center", marginTop: 6 }}>
          {readyCount}명이 먼저 준비됨 · 모두 준비되면 자동 진행
        </div>
      )}
    </div>
  );
}
