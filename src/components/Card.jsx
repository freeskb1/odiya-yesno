import { useEffect, useState } from "react";
import { colors, radius } from "../lib/theme";

export function Card({ text, level, onClick, variant = "active", passedAnswer, showDirection = true }) {
  const baseStyle = {
    position: "relative",
    borderRadius: radius.md,
    textAlign: "center",
    width: "100%",
    padding: "8px 5px",
    transition: "transform 0.15s",
    fontFamily: "inherit",
  };

  if (variant === "passed") {
    return (
      <div
        style={{
          ...baseStyle,
          border: `0.5px solid ${colors.border1}`,
          background: colors.surface2,
          opacity: 0.55,
          padding: "7px 5px",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: colors.text3,
            textDecoration: "line-through",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
        {passedAnswer && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              marginTop: 2,
              color: passedAnswer === "YES" ? colors.correctText : colors.wrongFill,
            }}
          >
            {passedAnswer} ✓
          </div>
        )}
      </div>
    );
  }

  if (variant === "disabled") {
    return (
      <div
        style={{
          ...baseStyle,
          border: `0.5px solid ${colors.border1}`,
          background: colors.surface2,
          opacity: 0.4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            lineHeight: 1.25,
            color: colors.text3,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
        {showDirection && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              padding: "0 1px",
              fontSize: 7,
              color: colors.text3,
            }}
          >
            <span>◀YES</span>
            <span>NO▶</span>
          </div>
        )}
      </div>
    );
  }

  const isCurrent = variant === "current";

  return (
    <button
      onClick={onClick}
      style={{
        ...baseStyle,
        border: isCurrent ? `2px solid ${colors.correctFill}` : `0.5px solid ${colors.cardBorder}`,
        background: isCurrent ? colors.correctBg : colors.cardBg,
        animation: isCurrent ? "pulseRing 1.6s ease-in-out infinite" : undefined,
        cursor: "pointer",
      }}
      onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
      onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* 탭 가능 표시 */}
      <div
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: isCurrent ? colors.correctText : colors.cardText,
          opacity: 0.3,
        }}
      />

      {isCurrent && (
        <div
          style={{
            fontSize: 8,
            fontWeight: 500,
            opacity: 0.75,
            marginBottom: 2,
            color: colors.correctText,
          }}
        >
          ▼ 현재
        </div>
      )}
      <div
        style={{
          fontSize: level === 1 ? 11 : 10,
          fontWeight: 500,
          lineHeight: 1.3,
          color: isCurrent ? colors.correctText : colors.cardText,
          wordBreak: "keep-all",
        }}
      >
        {text}
      </div>
      {showDirection && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            padding: "0 1px",
            fontSize: 7,
            opacity: 0.7,
            color: isCurrent ? colors.correctText : colors.cardText,
          }}
        >
          <span>◀YES</span>
          <span>NO▶</span>
        </div>
      )}
    </button>
  );
}

// ============================================
// 카드 팝업 모달
// ============================================
export function CardPopup({ open, text, level, showAnswerButtons, onAnswer, onClose }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setAnimate(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
    }
  }, [open]);

  if (!open) return null;

  const levelText =
    level === 3 ? "3층 질문 · 마지막 단계" : level === 2 ? "2층 질문" : "1층 질문 · 시작";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(20,20,20,0.92)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 280,
          padding: "28px 22px",
          borderRadius: radius.lg,
          textAlign: "center",
          background: colors.cardBg,
          color: colors.cardText,
          border: `1px solid ${colors.cardBorder}`,
          transform: animate ? "scale(1)" : "scale(0.9)",
          opacity: animate ? 1 : 0,
          transition: "transform 0.15s ease-out, opacity 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>{levelText}</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            lineHeight: 1.4,
            marginBottom: 18,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>

        {showAnswerButtons ? (
          <>
            <p style={{ fontSize: 12, opacity: 0.75, margin: "14px 0 12px" }}>당신의 답변은?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => onAnswer("YES")}
                style={{
                  padding: "14px 8px",
                  borderRadius: radius.md,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#FFFFFF",
                  background: colors.correctFill,
                  border: `1px solid ${colors.correctText}`,
                }}
              >
                YES
              </button>
              <button
                onClick={() => onAnswer("NO")}
                style={{
                  padding: "14px 8px",
                  borderRadius: radius.md,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#FFFFFF",
                  background: colors.wrongFill,
                  border: `1px solid ${colors.wrongBorder}`,
                }}
              >
                NO
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 12,
                padding: "8px 18px",
                borderRadius: radius.md,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.cardText,
                fontSize: 12,
              }}
            >
              닫기
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 8px",
                fontSize: 13,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              <span>◀ YES</span>
              <span>NO ▶</span>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 18,
                padding: "10px 20px",
                borderRadius: radius.md,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.cardText,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
