# 인증 흐름

Paperstock 은 Firebase Authentication 으로 인증을, Firestore 보안 규칙로 데이터 격리를 한다.

**3계층 보호**: 프론트 `<RequireAuth>` + 백엔드 `verifyAuth` + Firestore 보안 규칙. 한 층이 무너져도 다른 층에서 막힘.

## 인증 모드

- **이메일 + 비밀번호** (Firebase Auth Email/Password) — 1차 구현
- (선택) Google OAuth 등 추가 가능

## 회원가입 시퀀스

```
[클라이언트]                       [Firebase]                    [백엔드]                  [Firestore]
   │                                  │                              │                          │
   │  createUserWithEmailAndPassword  │                              │                          │
   ├─────────────────────────────────▶│                              │                          │
   │                                  │  Auth 사용자 생성 (uid 발급)  │                          │
   │  ◀──── User + ID 토큰 ───────────│                              │                          │
   │                                  │                              │                          │
   │  POST /api/v1/users/init                                        │                          │
   │  Authorization: Bearer <idToken>                                │                          │
   ├────────────────────────────────────────────────────────────────▶│                          │
   │                                  │                              │  verifyAuth (토큰 검증)    │
   │                                  │                              │  Firestore 트랜잭션:        │
   │                                  │                              ├────── users/{uid} 생성 ──▶│
   │                                  │                              │     seed_cash: 10000000    │
   │  ◀──── 200 OK ─────────────────────────────────────────────────│                          │
   │                                  │                              │                          │
   │  navigate('/app/portfolio')
```

> Cloud Function `onCreate` 트리거 대신 **명시 호출** — 트리거는 콜드스타트가 있어 회원가입 직후 빈 사용자 문서로 시연되는 레이스 위험 있음.
> `/api/v1/users/init` 은 **멱등** — 이미 초기화된 경우 기존 데이터 그대로 200 반환.

## 로그인 시퀀스

```
[클라이언트]                       [Firebase]
   │                                  │
   │  signInWithEmailAndPassword      │
   ├─────────────────────────────────▶│
   │                                  │  비밀번호 검증 + ID 토큰 발급
   │  ◀──── User + ID 토큰 ───────────│
   │                                  │
   │  onAuthStateChanged(setUser) 트리거
   │  <AuthProvider> 가 user 상태 갱신
   │  <RequireAuth> 가 returnTo 또는 /app/portfolio 로 redirect
```

## ID 토큰 갱신

- ID 토큰 유효 기간: **1시간**
- Firebase SDK 가 만료 임박 시 자동 갱신
- 매 백엔드 호출 전 `auth.currentUser.getIdToken()` 으로 최신 토큰 획득 (자동 갱신된 토큰을 받음)
- 갱신 실패(refresh token 만료 등) 시 `onAuthStateChanged` 가 `user=null` 통지 → `<RequireAuth>` 가 `/login` 으로

## 보호 API 호출

```
GET /api/v1/markets/quote?symbol=AAPL
Authorization: Bearer <idToken>
```

`src/app/lib/api.ts` wrapper (단일 진입점):
```ts
const token = await auth.currentUser?.getIdToken();
fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
```

## 백엔드 토큰 검증

`server/src/middleware/verifyAuth.ts`:
```ts
import admin from '../firebase-admin';

export async function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({
      status_code: 401, message: '인증이 필요합니다', data: null,
    });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(auth.slice(7));
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({
      status_code: 401, message: '세션이 만료되었습니다', data: null,
    });
  }
}
```

라우트 적용:
```ts
router.use(verifyAuth);
router.get('/markets/quote', async (req, res) => {
  const { uid } = req.user;
  // ...
});
```

## Firestore 보안 규칙

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;

      match /holdings/{symbol} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
      match /trades/{tradeId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
      match /watchlist/{symbol} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /snapshots/{date} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
    }

    match /market_cache/{symbol} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

원칙:
- 사용자 데이터는 본인만 read/write (uid 매칭)
- `holdings`/`trades` 는 거래 체결 경로(백엔드)로만 변경 — Admin SDK 는 보안 규칙 우회
- `watchlist` 는 클라이언트 직접 변경 허용 (단순 즐겨찾기, 백엔드 라우트 불필요)
- `market_cache` 는 모두 read, 쓰기는 백엔드만 (외부 호출 비용·일관성)

배포:
```sh
firebase deploy --only firestore:rules
```

## 로그아웃

```
[클라이언트]                       [Firebase]
   │                                  │
   │  signOut(auth)                   │
   ├─────────────────────────────────▶│
   │                                  │  ID 토큰 폐기
   │  ◀──── 완료 ─────────────────────│
   │                                  │
   │  onAuthStateChanged(null) 트리거
   │  <AuthProvider> 가 user=null
   │  <RequireAuth> 가 /login 으로 이동
```

## 비밀번호 재설정

```ts
sendPasswordResetEmail(auth, email)
```

Firebase 가 메일 발송 (기본 도메인: `<projectId>.firebaseapp.com` 또는 콘솔에서 커스텀 도메인 설정).

## 비밀번호 정책

- Firebase Auth 기본: 최소 6자
- 프로젝트 권장: **최소 8자 + 영문/숫자 혼용** — 클라이언트 Zod 검증으로 강제
- 회원가입 폼에서 검증 실패 시 envelope 형식이 아닌 클라이언트 inline 에러로 표시 (Firebase 호출 전)

## 가드 위치 요약

| 위치 | 역할 | 실패 시 |
|---|---|---|
| `<RequireAuth>` (프론트) | 비로그인 시 진입 차단 | `/login?returnTo=...` 이동 |
| `<AuthProvider>` (프론트) | onAuthStateChanged 구독 | user=null 로 갱신 → RequireAuth 동작 |
| `verifyAuth` (백엔드) | 토큰 무효/만료 차단 | 401 envelope 반환 |
| Firestore 보안 규칙 | DB 레벨 격리 (최후 방어) | 클라이언트 SDK 권한 에러 |

세 곳이 **각각 독립**적으로 작동 — 한 곳이 무너져도 나머지에서 막힘.

## 시연 / 디버깅 팁

- 토큰 만료 시뮬레이션: Firebase 콘솔 → Authentication → 사용자 → 토큰 무효화
- 보안 규칙 테스트: Firebase 콘솔 Firestore → "규칙" 탭 → Playground
- ID 토큰 디코딩: `jwt.io` 에 `auth.currentUser.getIdToken()` 결과 붙여 클레임 확인 (서명 검증은 Admin SDK)
