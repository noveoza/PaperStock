# API 명세

Express 백엔드의 REST 엔드포인트. 모두 `/api/v1` prefix.
응답 envelope: `{ status_code, message, data }`. 필드명 snake_case.

> 사용자 데이터(holdings, trades, watchlist) **read** 는 백엔드 거치지 않고 Firestore SDK 직접 — 백엔드 라우트는 시세·거래 체결·사용자 초기화에 한정한다.

## 인증

- 헤더: `Authorization: Bearer <idToken>` (Firebase ID 토큰)
- `verifyAuth` 미들웨어가 검증, `req.user = { uid, email }` 주입
- 검증 실패 → 401, envelope.message: "인증이 필요합니다" / "세션이 만료되었습니다"

상세는 `docs/auth-flow.md`.

## 엔드포인트

### POST /api/v1/users/init

회원가입 직후 사용자 문서 초기화. seed_cash 지급.

- 인증: 필요 (방금 가입한 사용자의 ID 토큰)
- Body: 없음
- 멱등: 이미 초기화된 경우 기존 데이터 그대로 200 반환

응답:
```json
200 → {
  "status_code": 200, "message": "OK",
  "data": {
    "uid": "abc123",
    "email": "user@example.com",
    "seed_cash": 10000000,
    "cash": 10000000
  }
}
```

---

### GET /api/v1/markets/quote?symbol=<symbol>

종목 현재가. 캐시 우선.

- 인증: 필요
- Query: `symbol` (예: `005930.KS`, `AAPL`)
- 처리: `market_cache/{symbol}` 60초 이내면 그대로 반환, 아니면 Yahoo 호출 후 캐시 갱신

```json
200 → {
  "status_code": 200, "message": "OK",
  "data": {
    "symbol": "005930.KS",
    "name": "삼성전자",
    "last_price": 71200,
    "change": 2000,
    "change_pct": 2.89,
    "currency": "KRW",
    "market": "KOSPI",
    "fetched_at": "2026-04-29T10:23:00Z"
  }
}

404 → "종목을 찾을 수 없습니다"
429 → "잠시 후 다시 시도해주세요" (Yahoo 레이트리밋)
```

---

### GET /api/v1/markets/history?symbol=<symbol>&range=<range>

종목 기간별 캔들. 차트용.

- 인증: 필요
- Query: `symbol`, `range` (`1d` | `1w` | `1m` | `3m` | `1y` | `all`)

응답 (`lightweight-charts` candlestick 형식과 호환):
```json
200 → {
  "status_code": 200, "message": "OK",
  "data": {
    "symbol": "005930.KS",
    "range": "1m",
    "candles": [
      { "t": 1714291200, "o": 69200, "h": 69500, "l": 68800, "c": 69200, "v": 12345678 }
    ]
  }
}
```

`t` 는 Unix epoch seconds (lightweight-charts 입력 형식).

---

### GET /api/v1/markets/search?q=<query>

종목 검색.

- 인증: 필요
- Query: `q` (종목명 또는 심볼 일부)

```json
200 → {
  "status_code": 200, "message": "OK",
  "data": {
    "results": [
      { "symbol": "005930.KS", "name": "삼성전자", "market": "KOSPI", "currency": "KRW" },
      { "symbol": "AAPL", "name": "Apple Inc.", "market": "NASDAQ", "currency": "USD" }
    ]
  }
}
```

---

### POST /api/v1/trade

매수·매도 체결.

- 인증: 필요
- Body:
```json
{ "symbol": "005930.KS", "side": "BUY", "qty": 10 }
```
- 처리:
  1. 최신 시세 조회 (cache 또는 Yahoo)
  2. 환율 조회 — 외화 종목이면 yahoo `KRW=X` 시세 (`market_cache` 60s 캐시 공유), 실패 시 1300 폴백
  3. Firestore 트랜잭션:
     - 매수: `cash >= amount_krw` 검증 → cash 차감, holdings upsert (avg_price 재계산), trades 추가
     - 매도: `holdings.qty >= qty` 검증 → cash 증가, holdings 갱신(0 도달 시 삭제), trades 추가

> 통화 정책
> - `cash` 는 항상 KRW 단위
> - `holdings.avg_price` 는 native 통화 (USD 종목 → USD 평균가) — FX 곱하지 않음
> - cash 증감은 `amount_krw = amount × fx_rate` 가 결정 (KRW 종목은 fx_rate=1)

KRW 종목 (fx_rate=1, amount_krw === amount):
```json
200 → {
  "status_code": 200, "message": "체결되었습니다",
  "data": {
    "trade_id": "trd_xxx",
    "symbol": "005930.KS",
    "side": "BUY",
    "qty": 10,
    "price": 71200,
    "amount": 712000,
    "amount_krw": 712000,
    "fx_rate": 1,
    "currency": "KRW",
    "executed_at": "2026-04-29T10:24:00Z",
    "holding_after": { "qty": 10, "avg_price": 71200 },
    "cash_after": 9288000
  }
}
```

USD 종목 (예: AAPL $350 × 10주, 환율 1300):
```json
200 → {
  "status_code": 200, "message": "체결되었습니다",
  "data": {
    "trade_id": "trd_yyy",
    "symbol": "AAPL",
    "side": "BUY",
    "qty": 10,
    "price": 350,
    "amount": 3500,
    "amount_krw": 4550000,
    "fx_rate": 1300,
    "currency": "USD",
    "executed_at": "2026-04-29T10:24:00Z",
    "holding_after": { "qty": 10, "avg_price": 350 },
    "cash_after": 5450000
  }
}
```

```
400 → "잔고가 부족합니다" / "보유 수량이 부족합니다" / "체결 가능 수량이 0입니다"
```

평균가 재계산 공식은 `docs/db-schema.md` 「평균가 재계산 공식」.

> 체결 직후 백엔드는 `users/{uid}/snapshots/{오늘(KST)}` 을 fire-and-forget 으로 갱신한다.
> 응답 지연 없음. 자세한 스냅샷 동작은 아래 「GET /api/v1/portfolio/snapshots」 와 `docs/db-schema.md` 참조.

---

### GET /api/v1/portfolio/snapshots

일별 총 자산 시계열. 자산 차트용.

- 인증: 필요
- Query: `range` (`1d` | `1w` | `1m` | `3m` | `1y` | `all`, 기본 `1m`)
- 처리:
  1. `users/{uid}/snapshots` 컬렉션에서 `date` 가 range 시작일 ~ 오늘(KST) 인 문서 조회
  2. 오늘자 스냅샷이 없으면 즉시 `computeAndUpsertSnapshot(uid)` → 시계열에 합쳐 반환 (lazy)
  3. 정렬: 날짜 오름차순

```json
200 → {
  "status_code": 200, "message": "OK",
  "data": {
    "range": "1m",
    "points": [
      { "date": "2026-03-30", "total_krw": 10000000 },
      { "date": "2026-04-15", "total_krw": 10120000 },
      { "date": "2026-04-29", "total_krw": 10380000 }
    ]
  }
}
```

빈 응답 (`"points": []`) 가능 — 거래 한 번도 없는 신규 사용자.

> `total_krw = cash_krw + Σ(holdings.qty × current_price × fx_rate)` — 모두 KRW 단위.
> 사용자 데이터지만 클라이언트 직접 쓰기 차단 (백엔드만 갱신). read 는 본인만.
> 차트용 응답엔 `total_krw` 만 노출 — `cash_krw`, `holdings_value_krw` 도 필요하면 Firestore SDK 로 직접 read (보안 규칙 통과).

---

## 에러 응답

모든 에러는 envelope:
```json
{ "status_code": <code>, "message": "<사용자 안내>", "data": null }
```

| 코드 | 의미 |
|---|---|
| 400 | 검증 실패, 비즈니스 규칙 위반 (잔고 부족 등) |
| 401 | ID 토큰 누락/무효/만료 |
| 403 | (현재 미사용) |
| 404 | 리소스 없음 (종목 미발견 등) |
| 429 | Yahoo 레이트리밋 — cache fallback 후에도 안 되면 |
| 500 | 서버 내부 에러 (메시지: "일시적인 오류가 발생했습니다") |

## 클라이언트 호출 패턴

`src/app/lib/api.ts`:
```ts
async function call<T>(method: string, path: string, body?: any): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${import.meta.env.VITE_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.status_code !== 200) throw new HttpError(json.status_code, json.message);
  return json.data;
}
```

React Query (`@tanstack/react-query` v5):
```ts
const { data: quote } = useQuery({
  queryKey: ['markets', 'quote', symbol],
  queryFn: () => api.get<Quote>(`/api/v1/markets/quote?symbol=${symbol}`),
  refetchInterval: 60_000,
});

const trade = useMutation({
  mutationFn: (body: TradeRequest) => api.post('/api/v1/trade', body),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['markets', 'quote'] });
    // holdings/trades 는 Firestore onSnapshot 으로 자동 반영 (invalidate 불필요)
  },
});
```

queryKey 컨벤션: 도메인 단어 우선 (`['markets', 'quote', symbol]`, `['markets', 'history', symbol, range]`).

## 변경 시 영향 범위

응답 필드 추가/제거 전:
```sh
grep -rn "/api/v1/" src/
grep -rn "queryKey: \['markets'" src/
grep -rn "queryKey: \[" src/app/
```
영향 파일 목록을 결과 메시지에 포함하여 fe-app 에이전트 후속 작업.
