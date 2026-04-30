# Firestore 스키마

Paperstock 의 데이터는 Cloud Firestore (서울 리전 `asia-northeast3`) 에 저장된다.
컬렉션 구조 · 문서 필드 · 인덱스 · 보안 규칙을 한 곳에 모음.

## 컬렉션 트리

```
users/{uid}                            사용자 프로필 + 현금
  ├─ holdings/{symbol}                 현재 보유 종목 (자동 갱신)
  ├─ trades/{tradeId}                  체결 내역 (이력)
  ├─ watchlist/{symbol}                관심 종목
  └─ snapshots/{YYYY-MM-DD}            일별 자산 스냅샷 (KST)

market_cache/{symbol}                  시세 캐시 (백엔드 전용 쓰기)
```

문서 ID 정책:
- `users/{uid}` — Firebase Auth UID
- `holdings/{symbol}`, `watchlist/{symbol}`, `market_cache/{symbol}` — 종목 심볼 (중복 자동 방지)
- `trades/{tradeId}` — Firestore 자동 생성 ID
- `snapshots/{YYYY-MM-DD}` — KST 기준 날짜 (같은 날 재호출 시 merge upsert)

## 컬렉션 상세

### users/{uid}

회원가입 직후 백엔드 `/api/v1/users/init` 가 생성. 멱등.

| 필드 | 타입 | 설명 |
|---|---|---|
| email | string | Firebase Auth 와 동기화 |
| display_name | string \| null | 미입력 시 null |
| seed_cash | number | 시작 자본금 (10,000,000 KRW) |
| cash | number | 현재 현금 잔고 |
| created_at | Timestamp | 서버 시각 |
| updated_at | Timestamp | 마지막 거래 시 갱신 |

### users/{uid}/holdings/{symbol}

현재 보유 중인 종목. 거래 체결로만 갱신. qty=0 도달 시 문서 삭제.

| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | string | "005930.KS", "AAPL" (문서 ID 와 동일) |
| name | string | 종목명 (캐싱) |
| qty | number | 보유 수량 |
| avg_price | number | 평균 매입가 (체결 시 재계산) |
| market | string | "KOSPI" \| "KOSDAQ" \| "NASDAQ" \| "NYSE" |
| currency | string | "KRW" \| "USD" |
| updated_at | Timestamp | |

### users/{uid}/trades/{tradeId}

매수·매도 체결 이력. 체결 시 백엔드가 추가, 수정·삭제 없음.

| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | string | |
| name | string | 체결 시점 종목명 |
| side | "BUY" \| "SELL" | |
| qty | number | |
| price | number | 체결가 (체결 통화 기준) |
| amount | number | qty × price (체결 통화 기준) |
| amount_krw | number | KRW 환산 체결액 — 사용자 cash 영향분 |
| fx_rate | number | 체결 시점 환율 (KRW 종목=1, USD→KRW=`KRW=X` 시세) |
| currency | string | 체결 통화 ("KRW" \| "USD" 등) |
| executed_at | Timestamp | 서버 시각 |

> `cash` 는 항상 KRW 단위로만 관리되므로 cash 증감은 `amount_krw` 가 결정한다.
> `holdings.avg_price` 는 native 통화 (USD 종목 → USD 평균가) 그대로 — FX 가 곱해지지 않는다.

### users/{uid}/watchlist/{symbol}

관심 종목. 프론트가 직접 add/remove.

| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | string | (문서 ID 와 동일) |
| name | string | |
| market | string | |
| added_at | Timestamp | |

### users/{uid}/snapshots/{YYYY-MM-DD}

일별 총 자산 스냅샷. 문서 ID 는 KST 기준 `YYYY-MM-DD`.
백엔드만 쓰기 (보안 규칙로 클라이언트 직접 쓰기 차단).

| 필드 | 타입 | 설명 |
|---|---|---|
| date | string | "YYYY-MM-DD" (문서 ID 와 동일, KST) |
| total_krw | number | `cash_krw + Σ(qty × current_price × fx_rate)` (KRW) |
| cash_krw | number | 해당 시점 현금 잔고 (KRW) |
| holdings_value_krw | number | 보유 종목 평가액 합계 (KRW 환산) |
| taken_at | Timestamp | 스냅샷 기록 시각 (서버 시간) |

생성 트리거:
1. **체결 직후** — `tradeService.execute()` 가 fire-and-forget 으로 `computeAndUpsertSnapshot(uid)` 호출
2. **lazy** — `GET /api/v1/portfolio/snapshots` 첫 호출 시 오늘자 누락이면 즉시 계산 후 응답에 포함

같은 날짜 재호출은 merge upsert — 마지막 호출 시점의 자산이 그날의 스냅샷으로 남는다.
시세 조회 실패 종목은 `holdings.avg_price` 로 폴백 (보수적 평가).

### market_cache/{symbol}

시세 캐시. 백엔드만 쓰기, 모든 인증 사용자 read.

| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | string | |
| name | string | |
| last_price | number | |
| change | number | 전일 대비 |
| change_pct | number | 퍼센트 |
| currency | string | |
| market | string | |
| fetched_at | Timestamp | 마지막 외부 호출 시각 (stale 판정용) |

캐시 정책: `fetched_at` 기준 60초 이내면 그대로 반환, 이후 stale → Yahoo 재호출 후 갱신.

## 인덱스

Firestore 는 단일 필드 자동 인덱스. 복합 인덱스 필요 쿼리:

| 컬렉션 | 필드 + 정렬 | 용도 |
|---|---|---|
| `users/{uid}/trades` | `executed_at desc` | History 페이지 기본 정렬 (서브컬렉션, 단일 필드 자동 인덱스로 처리) |
| `users/{uid}/trades` | `symbol asc, executed_at desc` | History 종목 필터 |
| `users/{uid}/trades` | `side asc, executed_at desc` | History 매수/매도 필터 |

`firestore.indexes.json` 에서 관리:
```sh
firebase deploy --only firestore:indexes
```

새 쿼리 추가 → 첫 실행 시 콘솔이 인덱스 생성 링크 제공 → 클릭으로 자동 생성 후 `firestore.indexes.json` 동기화.

## 비정규화 / 계산 정책

- **평균가**: `holdings.avg_price` 에 캐시 (체결 시 재계산). trades 합산으로 재계산하지 않음.
- **총자산**: 클라이언트에서 `cash + Σ(qty × last_price)` — 시세 의존하므로 저장 안 함.
- **손익(P/L)**: 클라이언트 계산 `(last_price - avg_price) × qty`.
- **종목명·시장**: holdings/trades/watchlist 에 캐싱 — 표시 시 추가 조회 없이 한 번에 렌더.

## 시드 데이터

회원가입 직후 백엔드 `/api/v1/users/init` 가:
- `users/{uid}` 문서 생성
- `seed_cash: 10000000`, `cash: 10000000`, `created_at: serverTimestamp()`

추가 시드 (테스트 종목 등) 는 만들지 않는다 — 사용자가 첫 매수 시 holdings 자동 생성.

## 평균가 재계산 공식

매수:
```
new_qty = old_qty + buy_qty
new_avg = (old_qty * old_avg + buy_qty * buy_price) / new_qty
```

매도:
```
new_qty = old_qty - sell_qty
avg_price 유지 (수량만 차감)
new_qty == 0 → holdings/{symbol} 문서 삭제
```

체결 트랜잭션 코드는 `server/src/services/tradeService.ts`. 보안 규칙로 클라이언트 직접 쓰기는 차단.

## 보안 규칙 (요약)

상세 규칙 본문은 `docs/auth-flow.md` 「Firestore 보안 규칙」.

| 컬렉션 | 클라이언트 read | 클라이언트 write |
|---|---|---|
| `users/{uid}` | 본인만 | 본인만 (생성·갱신) |
| `users/{uid}/holdings` | 본인만 | ❌ (백엔드만) |
| `users/{uid}/trades` | 본인만 | ❌ (백엔드만) |
| `users/{uid}/watchlist` | 본인만 | 본인만 |
| `users/{uid}/snapshots` | 본인만 | ❌ (백엔드만) |
| `market_cache/{symbol}` | 인증 사용자 모두 | ❌ (백엔드만) |

`firestore.rules` 배포:
```sh
firebase deploy --only firestore:rules
```

## 변경 시 영향 범위

스키마 변경 후 grep:
```sh
grep -rn "collection(" src/                  # 컬렉션 사용처
grep -rn "doc(" src/                         # 문서 참조
grep -rn "users/" src/ server/src/           # 경로 하드코딩
```

영향 받는 파일을 fe-app · be-api 양쪽에 전달.
