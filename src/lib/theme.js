// 디자인 토큰
export const colors = {
  // 배경
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surface2: "#F2F2F2",

  // 텍스트
  text1: "#0A0A0A",
  text2: "#3A3A3A",
  text3: "#7A7A7A",

  // 보더
  border1: "#E2E2E2",
  border2: "#C4C4C4",

  // 카드 (amber)
  cardBg: "#FAEEDA",
  cardText: "#412402",
  cardTextDeep: "#633806",
  cardBorder: "#BA7517",
  cardAccent: "#FAC775",

  // 정답 (green)
  correctBg: "#E1F5EE",
  correctText: "#0F6E56",
  correctFill: "#1D9E75",
  correctDeep: "#04342C",

  // 오답 (red)
  wrongBg: "#FCE8E8",
  wrongFill: "#E24B4A",
  wrongBorder: "#A32D2D",

  // 강조 (info blue)
  accentBg: "#E5EDFF",
  accentText: "#1B4FB6",
  accentBorder: "#534AB7",

  // 핑크 (소울메이트)
  pinkBg: "#FBEAF0",
  pinkText: "#993556",
  pinkDeep: "#4B1528",
  pinkBorder: "#ED93B1",
  pinkFill: "#D4537E",
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

// 모바일 컨테이너 (한 번만 정의하고 재사용)
export const containerStyle = {
  minHeight: "100svh",
  margin: "0 auto",
  maxWidth: 420,
  background: colors.surface,
  display: "flex",
  flexDirection: "column",
};
