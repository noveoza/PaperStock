import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../../app/hooks/useWatchlist';
import { useQuotes } from '../../app/hooks/useQuotes';
import { useUser } from '../../app/hooks/useUser';
import { useHoldings } from '../../app/hooks/useHoldings';
import { Icon } from '../../components/Icon/Icon';
import { TradeModal } from '../../app/components/TradeModal';
import { Sparkline } from '../../app/components/Sparkline';
import {
  formatCurrency,
  formatPercent,
  getDeltaTone,
  type DeltaTone,
} from '../../app/lib/format';
import s from './Watchlist.module.css';

interface TradeTarget {
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

function toneClass(tone: DeltaTone): string {
  if (tone === 'gain') return s.gain;
  if (tone === 'loss') return s.loss;
  return s.neutral;
}

export function Watchlist() {
  const { items, loading, remove } = useWatchlist();
  const { user } = useUser();
  const { holdings } = useHoldings();

  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { quotes } = useQuotes(symbols);

  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null);

  const handleRemove = async (symbol: string) => {
    setRemovingSymbol(symbol);
    try {
      await remove(symbol);
    } catch (err) {
      console.warn('[watchlist] remove failed:', err);
    } finally {
      setRemovingSymbol(null);
    }
  };

  const tradeQuote = tradeTarget ? quotes[tradeTarget.symbol] : undefined;
  const tradeHolding = tradeTarget
    ? holdings.find((h) => h.symbol === tradeTarget.symbol)
    : undefined;

  return (
    <section className={s.section}>
      <div className={s.container}>
        <header className={s.head}>
          <span className={s.title}>관심 종목</span>
          <span className={s.count}>{items.length} 종목</span>
        </header>

        {loading ? (
          <div className={s.skeleton} aria-hidden="true">
            <div className={s.skelRow} />
            <div className={s.skelRow} />
            <div className={s.skelRow} />
          </div>
        ) : items.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>관심 종목이 없습니다</p>
            <p className={s.emptySub}>
              <Link to="/app/markets" className={s.emptyLink}>Markets</Link>
              {' 에서 ☆ 로 추가하세요.'}
            </p>
          </div>
        ) : (
          <ul className={s.list}>
            {items.map((item) => {
              const q = quotes[item.symbol];
              const tone = q ? getDeltaTone(q.change) : 'neutral';
              const currency = q?.currency ?? item.currency ?? 'KRW';
              return (
                <li key={item.symbol} className={s.row}>
                  <div className={s.rowLeft}>
                    <div className={s.rowSymbol}>{item.symbol}</div>
                    <div className={s.rowName}>{item.name}</div>
                    <div className={s.rowMarket}>{item.market}</div>
                  </div>
                  <div className={s.rowSpark}>
                    <Sparkline symbol={item.symbol} range="1m" width={104} height={32} />
                  </div>
                  <div className={s.rowMid}>
                    <div className={s.rowPrice}>
                      {q ? formatCurrency(q.last_price, currency) : '—'}
                    </div>
                    <div className={`${s.rowDelta} ${toneClass(tone)}`}>
                      {q
                        ? `${q.change >= 0 ? '+' : '−'}${formatCurrency(Math.abs(q.change), currency)} · ${formatPercent(q.change_pct)}`
                        : ''}
                    </div>
                  </div>
                  <div className={s.rowRight}>
                    <button
                      type="button"
                      className={s.buyBtn}
                      disabled={!q}
                      onClick={() =>
                        setTradeTarget({
                          symbol: item.symbol,
                          name: item.name,
                          market: item.market,
                          currency,
                        })
                      }
                    >
                      매수
                    </button>
                    <button
                      type="button"
                      className={s.removeBtn}
                      onClick={() => handleRemove(item.symbol)}
                      disabled={removingSymbol === item.symbol}
                      aria-label={`${item.name} 관심 해제`}
                      title="관심 해제"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {tradeTarget && (
        <TradeModal
          open={!!tradeTarget}
          side="BUY"
          symbol={tradeTarget.symbol}
          name={tradeTarget.name}
          currency={tradeTarget.currency}
          quote={tradeQuote}
          availableCash={user?.cash ?? 0}
          holdingQty={tradeHolding?.qty ?? 0}
          onClose={() => setTradeTarget(null)}
        />
      )}
    </section>
  );
}
