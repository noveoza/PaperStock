import { FieldValue, db } from '../firebase-admin.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { roundPrice } from '../lib/money.js';
import type { MarketService } from './marketService.js';
import { computeAndUpsertSnapshot } from './snapshotService.js';

export type TradeSide = 'BUY' | 'SELL';

export interface TradeInput {
  uid: string;
  symbol: string; // 사용자 입력 — marketService 가 정규화 (예: '005930' → '005930.KS')
  side: TradeSide;
  qty: number;
}

export interface TradeResult {
  trade_id: string;
  symbol: string; // 정규화 후 실제 사용된 심볼
  side: TradeSide;
  qty: number;
  price: number;       // 체결가 (체결 통화 기준)
  amount: number;      // qty × price (체결 통화 기준)
  amount_krw: number;  // KRW 환산 체결액 — cash 영향분
  fx_rate: number;     // 체결 시점 환율 (KRW=1, USD→KRW=현재가)
  currency: string;
  executed_at: string; // ISO 8601
  holding_after: { qty: number; avg_price: number }; // avg_price 는 native 통화 기준
  cash_after: number;  // KRW
}

interface UserDoc {
  cash?: number;
}

interface HoldingDoc {
  qty?: number;
  avg_price?: number;
}

/**
 * 거래 체결 서비스.
 *
 * 흐름 (docs/api-spec.md POST /api/v1/trade):
 *   1. 트랜잭션 외부에서 최신 시세 + 환율 조회 (외부 IO 가 락 시간에 포함되지 않도록 분리)
 *   2. db.runTransaction() — users.cash + holdings/{symbol} + trades 원자 갱신
 *
 * 평균가 재계산 (docs/db-schema.md):
 *   매수: new_avg = (old_qty * old_avg + buy_qty * buy_price) / new_qty
 *   매도: avg_price 유지, qty 만 차감 — qty=0 도달 시 holdings 문서 삭제
 *
 * 통화 정책:
 *   - cash 는 항상 KRW (사용자 잔고 단위)
 *   - holdings.avg_price 는 native 통화 (USD 종목 → USD avg, KRW 종목 → KRW avg)
 *   - cash 증감은 KRW 환산값 (amount_krw = amount * fx_rate)
 *   - fx_rate: KRW 종목=1, USD 종목=KRW=X 시세 (yahoo, market_cache 60s 캐시)
 *   - fx 조회 실패 시 USD 폴백 1300
 */
export class TradeService {
  /** USD/KRW 환율 폴백 — yahoo 호출 실패 시에만 사용 */
  private static readonly USD_KRW_FALLBACK = 1300;

  constructor(private readonly market: MarketService) {}

  async execute(input: TradeInput): Promise<TradeResult> {
    if (!Number.isInteger(input.qty) || input.qty <= 0) {
      throw new HttpError(400, '체결 가능 수량이 0입니다');
    }

    // 1) 시세 조회 (외부 IO — 트랜잭션 외부에서 처리)
    const quote = await this.market.getQuote(input.symbol);
    const resolvedSymbol = quote.symbol;
    const price = roundPrice(quote.last_price, quote.currency);
    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpError(400, '체결 가격을 확인할 수 없습니다');
    }
    const amount = roundPrice(price * input.qty, quote.currency);

    // 2) 환율 조회 (KRW 종목이면 1, 외화면 KRW=X 시세) → cash 영향 KRW 환산
    const fxRate = await this.getFxRate(quote.currency);
    const amountKrw = Math.round(amount * fxRate);

    const userRef = db.collection('users').doc(input.uid);
    const holdingRef = userRef.collection('holdings').doc(resolvedSymbol);
    const tradeRef = userRef.collection('trades').doc(); // auto-id

    let cashAfter = 0;
    let holdingAfter: { qty: number; avg_price: number } = { qty: 0, avg_price: 0 };

    // 2) Firestore 원자 트랜잭션
    await db.runTransaction(async (tx) => {
      const [userSnap, holdingSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(holdingRef),
      ]);
      if (!userSnap.exists) {
        throw new HttpError(400, '사용자 정보가 없습니다. 다시 로그인해주세요');
      }
      const user = (userSnap.data() ?? {}) as UserDoc;
      const oldCash = user.cash ?? 0;
      const holding = holdingSnap.exists ? ((holdingSnap.data() ?? {}) as HoldingDoc) : null;
      const oldQty = holding?.qty ?? 0;
      const oldAvg = holding?.avg_price ?? 0;

      if (input.side === 'BUY') {
        // cash 는 KRW, 비교도 KRW 환산값으로
        if (oldCash < amountKrw) {
          throw new HttpError(400, '잔고가 부족합니다');
        }
        const newQty = oldQty + input.qty;
        // avg_price 는 native 통화 그대로 — FX 곱하지 않음
        const newAvg =
          newQty === 0 ? 0 : (oldQty * oldAvg + input.qty * price) / newQty;
        cashAfter = oldCash - amountKrw;
        holdingAfter = {
          qty: newQty,
          avg_price: roundPrice(newAvg, quote.currency),
        };

        tx.update(userRef, {
          cash: cashAfter,
          updated_at: FieldValue.serverTimestamp(),
        });
        tx.set(
          holdingRef,
          {
            symbol: resolvedSymbol,
            name: quote.name,
            qty: newQty,
            avg_price: holdingAfter.avg_price,
            market: quote.market,
            currency: quote.currency,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        // SELL
        if (oldQty < input.qty) {
          throw new HttpError(400, '보유 수량이 부족합니다');
        }
        const newQty = oldQty - input.qty;
        cashAfter = oldCash + amountKrw;
        holdingAfter = { qty: newQty, avg_price: oldAvg };

        tx.update(userRef, {
          cash: cashAfter,
          updated_at: FieldValue.serverTimestamp(),
        });
        if (newQty === 0) {
          // 보유 0 도달 → holdings/{symbol} 문서 자체 삭제 (db-schema.md)
          tx.delete(holdingRef);
        } else {
          tx.update(holdingRef, {
            qty: newQty,
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }

      // trades 추가 (체결 이력 — 수정·삭제 없는 append-only)
      tx.set(tradeRef, {
        symbol: resolvedSymbol,
        name: quote.name,
        side: input.side,
        qty: input.qty,
        price,
        amount,
        amount_krw: amountKrw,
        fx_rate: fxRate,
        currency: quote.currency,
        executed_at: FieldValue.serverTimestamp(),
      });
    });

    // 체결 직후 자산 스냅샷 갱신 (fire-and-forget — 응답 지연시키지 않음)
    void computeAndUpsertSnapshot(input.uid, this.market).catch((err) => {
      logger.warn(
        { uid: input.uid, err: err instanceof Error ? err.message : err },
        'post-trade snapshot update failed',
      );
    });

    return {
      trade_id: tradeRef.id,
      symbol: resolvedSymbol,
      side: input.side,
      qty: input.qty,
      price,
      amount,
      amount_krw: amountKrw,
      fx_rate: fxRate,
      currency: quote.currency,
      executed_at: new Date().toISOString(),
      holding_after: holdingAfter,
      cash_after: cashAfter,
    };
  }

  /**
   * 통화 → KRW 환율.
   * - KRW: 1 (그대로)
   * - USD: yahoo `KRW=X` 시세 (market_cache 60s 캐시 적용)
   * - 그 외 / 조회 실패: USD_KRW_FALLBACK (1300)
   *
   * yahoo 가 일시적으로 throttle 되어도 cache stale fallback 또는 상수로 이어짐.
   */
  private async getFxRate(currency: string): Promise<number> {
    if (currency === 'KRW') return 1;
    const fxSymbol = currency === 'USD' ? 'KRW=X' : `${currency}KRW=X`;
    try {
      const fx = await this.market.getQuote(fxSymbol);
      if (Number.isFinite(fx.last_price) && fx.last_price > 0) {
        return fx.last_price;
      }
    } catch {
      // fall through
    }
    return TradeService.USD_KRW_FALLBACK;
  }
}
