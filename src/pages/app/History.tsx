import { useMemo, useState } from 'react';
import { useTrades } from '../../app/hooks/useTrades';
import { formatCurrency, formatDateTime } from '../../app/lib/format';
import s from './History.module.css';

type PeriodKey = 'all' | '1w' | '1m' | '3m';
type SideKey = 'all' | 'BUY' | 'SELL';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: '1w', label: '1주' },
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
];

const SIDES: { key: SideKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'BUY', label: '매수' },
  { key: 'SELL', label: '매도' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function periodCutoff(period: PeriodKey): number | null {
  const now = Date.now();
  switch (period) {
    case '1w':
      return now - 7 * DAY_MS;
    case '1m':
      return now - 30 * DAY_MS;
    case '3m':
      return now - 90 * DAY_MS;
    case 'all':
    default:
      return null;
  }
}

export function History() {
  const { trades, loading } = useTrades();
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [side, setSide] = useState<SideKey>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    const q = search.trim().toLowerCase();
    return trades.filter((t) => {
      if (cutoff !== null) {
        const ms = t.executed_at?.toMillis?.() ?? 0;
        if (ms < cutoff) return false;
      }
      if (side !== 'all' && t.side !== side) return false;
      if (q) {
        const hay = `${t.symbol} ${t.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trades, period, side, search]);

  return (
    <section className={s.section}>
      <div className={s.container}>
        <header className={s.head}>
          <span className={s.title}>체결 내역</span>
          <span className={s.count}>총 {filtered.length} 건</span>
        </header>

        <div className={s.filters}>
          <div className={s.toggleGroup} role="tablist" aria-label="기간 필터">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={period === p.key}
                className={period === p.key ? s.toggleActive : s.toggle}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={s.toggleGroup} role="tablist" aria-label="구분 필터">
            {SIDES.map((sd) => (
              <button
                key={sd.key}
                type="button"
                role="tab"
                aria-selected={side === sd.key}
                className={side === sd.key ? s.toggleActive : s.toggle}
                onClick={() => setSide(sd.key)}
              >
                {sd.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className={s.search}
            placeholder="종목 검색 (예: 삼성, AAPL)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        {loading ? (
          <div className={s.skeleton} aria-hidden="true">
            <div className={s.skelRow} />
            <div className={s.skelRow} />
            <div className={s.skelRow} />
            <div className={s.skelRow} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>
              {trades.length === 0 ? '체결 내역이 없습니다' : '조건에 맞는 내역이 없습니다'}
            </p>
            <p className={s.emptySub}>
              {trades.length === 0
                ? '아직 거래가 없습니다. Markets 에서 첫 매수를 시작해보세요.'
                : '필터를 조정해보세요.'}
            </p>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>체결가</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const ms = t.executed_at?.toMillis?.() ?? null;
                  const isBuy = t.side === 'BUY';
                  return (
                    <tr key={t.id}>
                      <td className={s.cellDate}>
                        {ms ? formatDateTime(ms) : '—'}
                      </td>
                      <td>
                        <div className={s.cellSymbol}>{t.symbol}</div>
                        <div className={s.cellName}>{t.name}</div>
                      </td>
                      <td>
                        <span
                          className={`${s.sidePill} ${isBuy ? s.buyPill : s.sellPill}`}
                        >
                          {isBuy ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className={s.mono}>
                        {t.qty.toLocaleString('ko-KR')}
                      </td>
                      <td className={s.mono}>
                        {formatCurrency(t.price, t.currency)}
                      </td>
                      <td className={s.mono}>
                        {formatCurrency(t.amount, t.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
