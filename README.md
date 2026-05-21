# 너모야 (Odiya) 🎴

YES or NO 추리 파티 게임의 모바일 웹 버전. 친구들과 한자리에 모여 각자 핸드폰으로 접속해 즐기는 멀티플레이어 게임입니다.

## 게임 설명

선 플레이어가 어디에 도착할지 다른 사람들이 미리 투표하고, 선 플레이어가 1-2-3 피라미드 형태의 질문에 YES/NO로 답변하며 도착지를 결정합니다. 잘 맞춘 사람은 점수를 얻습니다.

- 2명 이상 플레이 가능
- 2~4인: 각자 선 플레이어 2번씩
- 5인 이상: 각자 선 플레이어 1번씩
- 게임 종료 시 우승자 + "나를 가장 잘 맞춘 사람" 발표

## 🛠 기술 스택

- **React 18 + Vite 5**
- **Firebase Realtime Database** + **Anonymous Auth**
- **inline style** (CSS-in-JS, 별도 라이브러리 없음)
- **GitHub → Vercel** 자동 배포

---

## 🚀 시작하기

### 1단계 - Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com) 에서 새 프로젝트 생성
2. 프로젝트 생성 후 **웹 앱 추가** (`</>`아이콘) → 아무 닉네임 입력 → 호스팅 체크박스는 비워둠
3. 표시되는 `firebaseConfig` 값 메모 (나중에 .env에 입력)

#### Realtime Database 활성화

1. 좌측 메뉴 **Build → Realtime Database** → **데이터베이스 만들기**
2. 위치 선택 (예: 아시아 - asia-southeast1) → **잠금 모드**로 시작
3. **규칙(Rules) 탭**으로 이동 → `firebase-rules.json` 파일 내용 복사 붙여넣기 → 게시

#### Anonymous Auth 활성화

1. 좌측 메뉴 **Build → Authentication** → **시작하기**
2. **Sign-in method** 탭 → **익명** → **사용 설정** → 저장

### 2단계 - 로컬 개발 환경

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 Firebase config 값 입력

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:5173 접속

> **모바일에서 같이 테스트하려면**: 같은 Wi-Fi에 연결한 폰에서 `http://[PC_IP]:5173` 접속.
> Vite 가 시작될 때 콘솔에 표시되는 `Network: http://192.168.x.x:5173` 주소를 사용하세요.

### 3단계 - GitHub 푸시

```bash
git init
git add .
git commit -m "Initial commit: Odiya game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/odiya.git
git push -u origin main
```

### 4단계 - Vercel 배포

1. [vercel.com](https://vercel.com) 가입 (GitHub 연동)
2. **New Project** → GitHub 저장소 선택
3. **Framework Preset**: Vite (자동 인식)
4. **Environment Variables** 에 다음 7개 추가:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. **Deploy** 클릭

배포된 URL 로 접속 가능. QR 코드는 자동으로 이 URL 기반으로 생성됩니다.

#### Firebase에 Vercel 도메인 추가

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Vercel에서 받은 도메인 추가 (예: `odiya.vercel.app`)

---

## 📁 프로젝트 구조

```
odiya/
├── index.html              # Vite 진입점
├── src/
│   ├── main.jsx            # React 진입점
│   ├── App.jsx             # 라우터
│   ├── pages/
│   │   ├── HomePage.jsx    # 시작 화면
│   │   ├── JoinPage.jsx    # 방 입장 (코드 입력)
│   │   ├── RoomPage.jsx    # 방 페이지 (대기실)
│   │   └── GamePlay.jsx    # 게임 진행 (모든 phase)
│   ├── components/
│   │   ├── Avatar.jsx
│   │   ├── Card.jsx        # 카드 + 팝업 모달
│   │   ├── Pyramid.jsx     # 피라미드 레이아웃
│   │   └── VoteBoxes.jsx   # A/B/C 투표함
│   └── lib/
│       ├── firebase.js     # Firebase 클라이언트 + Auth
│       ├── room.js         # 방/게임 액션 (DB 쓰기)
│       ├── game.js         # 게임 로직 (피라미드, 점수, 도착지)
│       ├── questions.js    # 질문 카드 풀 (130+ 개)
│       ├── storage.js      # 로컬 스토리지 (플레이어 ID)
│       └── theme.js        # 디자인 토큰 (색상, radius)
├── firebase-rules.json     # Firebase DB 보안 규칙
├── vercel.json             # Vercel SPA 라우팅
└── .env.example            # 환경변수 예시
```

---

## 🎮 게임 흐름

1. 방장이 **방 만들기** → 3자리 코드 + QR 자동 생성
2. 친구들이 **코드 입력 또는 QR 스캔**으로 입장 (폰 기본 카메라로 QR 찍으면 URL 자동 열림)
3. 방장이 **게임 시작** 클릭
4. 매 라운드마다:
   - 선 플레이어 발표 (랜덤 → 순차적)
   - 선 플레이어는 "옆 사람 화면 훔쳐보지 마세요" 화면
   - 다른 사람들은 피라미드를 보고 투표함 A/B/C 선택
   - 모두 투표 완료 → 선 플레이어가 카드를 탭하며 YES/NO 답변
   - 결과 정리 + 정답 공개 + 점수 부여
5. 모든 라운드 완료 → 우승자 + 소울메이트 발표

---

## 🔧 개발 팁

### 질문 카드 추가/수정

`src/lib/questions.js` 파일에서 자유롭게 추가/수정 가능합니다.

### 로컬 스토리지 초기화

브라우저 콘솔에서:
```js
localStorage.clear();
```

### Firebase 데이터 확인

Firebase Console → Realtime Database → 데이터 탭에서 실시간으로 게임 상태 관찰 가능. 디버깅에 유용.

---

## 📝 라이선스

MIT
