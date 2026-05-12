// 디자인 토큰 - 크림 톤 통일 + 귀여운 느낌
export const colors = {
  // 배경 - 크림 톤
  bg: "linear-gradient(180deg, #FFF8F0 0%, #FFFDFA 100%)",
  bgSolid: "#FFFBF5",
  surface: "#FFFFFF",
  surface2: "#FAF5EC",
  surface3: "#F2EBDB",

  // 텍스트
  text1: "#2D2317",
  text2: "#5A4838",
  text3: "#8B7B66",
  textMuted: "#A88560",

  // 보더
  border1: "#EEE4D0",
  border2: "#D9C9A8",

  // 카드 (amber - 메인 카드)
  cardBg: "linear-gradient(180deg, #FFF4DC 0%, #FAEEDA 100%)",
  cardBgSolid: "#FAEEDA",
  cardText: "#5C3411",
  cardTextDeep: "#412402",
  cardBorder: "#D89540",
  cardBorderDeep: "#BA7517",
  cardAccent: "#FAC775",

  // 안 선택된 카드 (점선)
  skipBg: "linear-gradient(180deg, #FFFBF2 0%, #FAF5E8 100%)",
  skipBorder: "#C9A875",
  skipText: "#A88560",

  // 정답 / YES (green)
  correctBg: "linear-gradient(180deg, #E5F8EE 0%, #E1F5EE 100%)",
  correctBgSolid: "#E1F5EE",
  correctText: "#0F6E56",
  correctDeep: "#0F4F3D",
  correctFill: "#1D9E75",
  correctFillLight: "#2BBA8C",
  correctShadow: "rgba(29,158,117,0.25)",

  // 오답 / NO (red)
  wrongBg: "linear-gradient(180deg, #FFE5E5 0%, #FCE8E8 100%)",
  wrongBgSolid: "#FCE8E8",
  wrongFill: "#E24B4A",
  wrongFillLight: "#FF6B6A",
  wrongBorder: "#A32D2D",
  wrongText: "#7A1F1F",
  wrongShadow: "rgba(226,75,74,0.25)",

  // 강조 (info purple)
  accentBg: "linear-gradient(180deg, #F3EEFF 0%, #E5DBFF 100%)",
  accentBgSolid: "#EDE5FF",
  accentText: "#534AB7",
  accentDeep: "#2D2670",
  accentBorder: "#534AB7",
  accentShadow: "rgba(83,74,183,0.15)",

  // 핑크 (소울메이트)
  pinkBg: "linear-gradient(180deg, #FFEAF1 0%, #FBEAF0 100%)",
  pinkBgSolid: "#FBEAF0",
  pinkText: "#993556",
  pinkDeep: "#4B1528",
  pinkBorder: "#ED93B1",
  pinkFill: "#D4537E",

  // 방장 뱃지
  hostBg: "#FFE9B8",
  hostText: "#8B6914",
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
};

export const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.04)",
  md: "0 2px 6px rgba(0,0,0,0.06)",
  card: "0 2px 4px rgba(186,117,23,0.15)",
  cardLift: "0 3px 8px rgba(186,117,23,0.2)",
  button: "0 2px 0 #0F6E56, 0 4px 12px rgba(29,158,117,0.25)",
  buttonRed: "0 2px 0 #A32D2D, 0 4px 12px rgba(226,75,74,0.25)",
  popup: "0 8px 24px rgba(0,0,0,0.3)",
};

// 모바일 컨테이너
export const containerStyle = {
  minHeight: "100svh",
  margin: "0 auto",
  maxWidth: 420,
  background: colors.bg,
  display: "flex",
  flexDirection: "column",
};
