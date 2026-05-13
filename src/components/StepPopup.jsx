import { useEffect, useState, useRef } from "react";
import { colors, radius, shadow } from "../lib/theme";

// 단계별 질문 팝업
// open: 표시 여부
// currentStep: 현재 단계 (1부터 시작)
// totalSteps: 전체 단계
// question: 현재 질문
// previousAnswers: [{ question, answer }] (투표자 시점에서만 사용. 본인이 거쳐온 길)
// onAnswer: (answer) => void
// onClose: () => void
// targetName: 대상 이름 (선 플레이어 이름) - "광배는 어떻게 답할까요?" 의 광배
// isLead: 본인이 선 플레이어인지 (true면 이전 답변 표시 안 함, "내가 답할" 문구로 변경)
export default function StepPopup({
  open,
  currentStep,
  totalSteps,
  question,
  previousAnswers,
  onAnswer,
  targetName,
  isLead,
}) {
  const [animate, setAnimate] = useState(false);
  // 연속 클릭 방지 - 답변 직후 짧게 비활성화
  const [locked, setLocked] = useState(false);
  const lockTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setAnimate(false);
      // 새 질문이 와도 lock 상태는 건드리지 않음 (handleAnswer의 setTimeout이 풀어줌)
      // 그래야 빠른 연타 시 다음 질문에 자동 답변되는 버그 방지
      const t = setTimeout(() => setAnimate(true), 10);
      return () => clearTimeout(t);
    }
  }, [open, question]);

  // unmount 시 타이머 정리
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  function handleAnswer(answer) {
    if (locked) return;
    setLocked(true);
    onAnswer(answer);
    // 1초 후 다시 활성화 (새 팝업을 인지하고 고민할 충분한 시간)
    lockTimerRef.current = setTimeout(() => setLocked(false), 1000);
  }

  if (!open) return null;

  const stepLabel = currentStep === 1
    ? `${currentStep}단계 · 시작`
    : currentStep === totalSteps
    ? `${currentStep}단계 · 마지막`
    : `${currentStep}단계`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(40,30,20,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 280,
          padding: "24px 20px",
          borderRadius: radius.xl,
          background: colors.cardBg,
          border: `2px solid ${colors.cardBorderDeep}`,
          boxShadow: shadow.popup,
          textAlign: "center",
          transform: animate ? "scale(1)" : "scale(0.9)",
          opacity: animate ? 1 : 0,
          transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
        }}
      >
        {/* 진행 점 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isDone ? colors.correctFill : isActive ? colors.cardBorder : "#DDD",
                  transform: isActive ? "scale(1.5)" : "scale(1)",
                  transition: "all 0.2s",
                }}
              />
            );
          })}
        </div>

        {/* 단계 라벨 */}
        <div
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 100,
            background: "rgba(216,149,64,0.2)",
            color: "#8B5A14",
            fontSize: 10,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {stepLabel}
        </div>

        {/* 질문 */}
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: 16,
            color: colors.cardTextDeep,
            wordBreak: "keep-all",
          }}
        >
          {question}
        </div>

        {/* 이전 답변 표시 (투표자만) */}
        {!isLead && previousAnswers && previousAnswers.length > 0 && (
          <div
            style={{
              background: colors.surface,
              border: `1px dashed ${colors.cardBorder}`,
              borderRadius: radius.md,
              padding: "8px 10px",
              marginBottom: 14,
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 9, color: "#8B5A14", opacity: 0.75, marginBottom: 4 }}>
              📌 내가 예상한 이전 답변
            </div>
            {previousAnswers.map((pa, i) => (
              <div key={i} style={{ fontSize: 10, color: colors.cardTextDeep, lineHeight: 1.4, marginBottom: i < previousAnswers.length - 1 ? 2 : 0 }}>
                <span style={{ opacity: 0.7 }}>"{pa.question}"</span>{" → "}
                <strong style={{ color: pa.answer === "YES" ? colors.correctText : colors.wrongFill }}>
                  {pa.answer}
                </strong>
              </div>
            ))}
          </div>
        )}

        {/* 안내 문구 */}
        <p style={{ fontSize: 11, color: "#8B5A14", margin: "0 0 12px" }}>
          {isLead ? "당신의 답변은?" : `${targetName}는 어떻게 답할까요?`}
        </p>

        {/* YES/NO 버튼 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => handleAnswer("YES")}
            disabled={locked}
            style={{
              padding: "14px 6px",
              borderRadius: radius.lg,
              background: `linear-gradient(180deg, ${colors.correctFillLight} 0%, ${colors.correctFill} 100%)`,
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              boxShadow: "0 2px 0 #0F6E56, 0 3px 8px rgba(29,158,117,0.3)",
              cursor: locked ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: locked ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            YES
          </button>
          <button
            onClick={() => handleAnswer("NO")}
            disabled={locked}
            style={{
              padding: "14px 6px",
              borderRadius: radius.lg,
              background: `linear-gradient(180deg, ${colors.wrongFillLight} 0%, ${colors.wrongFill} 100%)`,
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              boxShadow: "0 2px 0 #A32D2D, 0 3px 8px rgba(226,75,74,0.3)",
              cursor: locked ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: locked ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
