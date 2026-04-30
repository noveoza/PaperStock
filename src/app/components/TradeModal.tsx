import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTrade, type TradeSide } from '../hooks/useTrade';
import { useQuote, type Quote } from '../hooks/useQuote';
import { HttpError } from '../lib/httpError';
import { formatCurrency, formatKRW } from '../lib/format';
import s from './TradeModal.module.css';

interface Props {
  open: boolean;
  side: TradeSide;
  symbol: string;
  name: string;
  currency: string;
  quote?: Quote;
  /** 사용자 현금 (KRW) */
  availableCash: number;
  /** 보유 수량 (매도 가능 수량) */
  holdingQty: number;
  onClose: () => void;
  onSuccess?: () => void;
}

// 환율 fetch 실패 시 fallback (백엔드 cash 차감과 다를 수 있어 단순 표시 용도).
const KRW_PER_USD_FALLBACK = 1300;

function tradeErrorMessage(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof Error) return err.message;
  return '체결에 실패했습니다.';
}

export function TradeModal({
  open,
  side,
  symbol,
  name,
  currency,
  quote,
  availableCash,
  holdingQty,
  onClose,
  onSuccess,
}: Props) {
  const trade = useTrade();
  const [qtyInput, setQtyInput] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const lastPrice = quote?.last_price;
  const isUSD = currency === 'USD';

  // USD 종목일 때만 KRW=X 환율 조회 (KRW 종목은 disabled 로 호출 안 됨)
  const fxQuote = useQuote(isUSD ? 'KRW=X' : null);
  const fxRate =
    isUSD && typeof fxQuote.data?.last_price === 'number'
      ? fxQuote.data.last_price
      : KRW_PER_USD_FALLBACK;
  const fxLoading = isUSD && fxQuote.isLoading && !fxQuote.data;

  // 모달 open 될 때 상태 리셋 + 인풋 포커스
  useEffect(() => {
    if (!open) return;
    setQtyInput('1');
    setError(null);
    trade.reset();
    // 다음 tick 포커스 (modal 이 painted 된 후)
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol, side]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const qty = useMemo(() => {
    const n = Number.parseInt(qtyInput, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [qtyInput]);

  // 예상 체결 금액 (로컬 통화)
  const localAmount =
    typeof lastPrice === 'number' && qty > 0 ? lastPrice * qty : 0;
  // 예상 체결 금액 (KRW 환산 — 매수 잔고 검증 / 매도 입금액 표시용)
  const krwAmount = isUSD ? localAmount * fxRate : localAmount;
  const cashDeficit = Math.max(0, krwAmount - availableCash);

  // 검증
  const insufficientCash =
    side === 'BUY' && qty > 0 && krwAmount > availableCash;
  const insufficientHolding =
    side === 'SELL' && qty > 0 && qty > holdingQty;
  const noPrice = typeof lastPrice !== 'number';
  const submittable =
    qty > 0 && !insufficientCash && !insufficientHolding && !noPrice;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!submittable) return;
    try {
      await trade.mutateAsync({ symbol, side, qty });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(tradeErrorMessage(err));
    }
  };

  if (!open) return null;

  const sideKor = side === 'BUY' ? '매수' : '매도';
  const sideClass = side === 'BUY' ? s.buy : s.sell;
  const sidePill = side === 'BUY' ? s.buyPill : s.sellPill;

  return (
    <div
      className={s.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-modal-title"
    >
      <div className={s.dialog} ref={dialogRef}>
        <header className={s.header}>
          <div>
            <span className={`${s.pill} ${sidePill}`}>{sideKor}</span>
            <h2 id="trade-modal-title" className={s.title}>
              {name}
            </h2>
            <div className={s.symbol}>{symbol}</div>
          </div>
          <button
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className={s.priceRow}>
          <span className={s.priceLabel}>현재가</span>
          <span className={s.priceVal}>
            {typeof lastPrice === 'number'
              ? formatCurrency(lastPrice, currency)
              : '—'}
          </span>
        </div>

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <label className={s.field}>
            <span className={s.label}>수량</span>
            <input
              ref={inputRef}
              className={s.input}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="1"
            />
          </label>

          <dl className={s.summary}>
            <div className={s.row}>
              <dt>{side === 'BUY' ? '예상 체결금액' : '예상 입금액'}</dt>
              <dd className={s.amountCell}>
                {qty > 0 && typeof lastPrice === 'number' ? (
                  <>
                    <div className={s.mono}>
                      {isUSD
                        ? `${formatCurrency(lastPrice, 'USD')} × ${qty}주 = ${formatCurrency(localAmount, 'USD')}`
                        : formatCurrency(localAmount, currency)}
                    </div>
                    {isUSD && (
                      <div className={s.fxLine}>
                        ≈ {formatKRW(krwAmount)}
                        {fxLoading
                          ? ' (환율 …)'
                          : ` (환율 ${formatKRW(Math.round(fxRate))})`}
                      </div>
                    )}
                  </>
                ) : (
                  <span className={s.mono}>—</span>
                )}
              </dd>
            </div>
            {side === 'BUY' ? (
              <div className={s.row}>
                <dt>사용 가능 현금</dt>
                <dd className={s.mono}>{formatKRW(availableCash)}</dd>
              </div>
            ) : (
              <div className={s.row}>
                <dt>보유 수량</dt>
                <dd className={s.mono}>{holdingQty.toLocaleString('ko-KR')}</dd>
              </div>
            )}
          </dl>

          {(insufficientCash || insufficientHolding || error) && (
            <div className={s.errorBox}>
              {insufficientCash &&
                `잔고 부족: ${formatKRW(cashDeficit)} 더 필요합니다.`}
              {insufficientHolding && '보유 수량이 부족합니다.'}
              {error && !insufficientCash && !insufficientHolding && error}
            </div>
          )}

          <div className={s.actions}>
            <button
              type="button"
              className={s.cancel}
              onClick={onClose}
              disabled={trade.isPending}
            >
              취소
            </button>
            <button
              type="submit"
              className={`${s.submit} ${sideClass}`}
              disabled={!submittable || trade.isPending}
            >
              {trade.isPending ? '체결 중…' : `${sideKor} 확인`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
