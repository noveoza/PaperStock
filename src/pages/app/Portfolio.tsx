import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Link } from 'react-router-dom';
import { useUser } from '../../app/hooks/useUser';
import { useHoldings } from '../../app/hooks/useHoldings';
import { useQuotes } from '../../app/hooks/useQuotes';
import { usePortfolioSnapshots } from '../../app/hooks/usePortfolioSnapshots';
import type { HistoryRange } from '../../app/hooks/useHistory';
import { useTheme } from '../../styles/useTheme';
import {
  formatKRW,
  formatPercent,
  getDeltaTone,
  type DeltaTone,
} from '../../app/lib/format';
import s from './Portfolio.module.css';

// USD 종목 단순 환산 가정 (Phase 2)
const USD_TO_KRW = 1300;

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
];

function toneClass(tone: DeltaTone): string {
  if (tone === 'gain') return s.gain;
  if (tone === 'loss') return s.loss;
  return s.neutral;
}

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface ChartColors {
  text: string;
  grid: string;
  line: string;
  areaTop: string;
  areaBottom: string;
}

function readChartColors(): ChartColors {
  return {
    text: readToken('--fg-3', '#737373'),
    grid: readToken('--line', 'rgba(255,255,255,0.06)'),
    line: readToken('--accent-2', '#a855f7'),
    areaTop: 'rgba(168,85,247,0.30)',
    areaBottom: 'rgba(168,85,247,0)',
  };
}

export function Portfolio() {
  const { theme } = useTheme();
  const { user, loading: userLoading } = useUser();
  const { holdings, loading: holdingsLoading } = useHoldings();

  const symbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);
  const { quotes } = useQuotes(symbols);

  const [range, setRange] = useState<HistoryRange>('1m');
  const snapshots = usePortfolioSnapshots(range);
  const points = snapshots.data?.points ?? [];
  const hasSnapshots = points.length > 0;

  // ------- 총자산 계산 -------
  const cashKRW = user?.cash ?? 0;
  const seedKRW = user?.seed_cash ?? 10_000_000;

  const positionsValueKRW = useMemo(() => {
    let sum = 0;
    for (const h of holdings) {
      const q = quotes[h.symbol];
      const last = q?.last_price ?? h.avg_price;
      const localValue = last * h.qty;
      const krw = h.currency === 'USD' ? localValue * USD_TO_KRW : localValue;
      sum += krw;
    }
    return sum;
  }, [holdings, quotes]);

  const totalKRW = cashKRW + positionsValueKRW;
  const totalDelta = totalKRW - seedKRW;
  const totalDeltaPct = seedKRW > 0 ? (totalKRW / seedKRW - 1) * 100 : 0;
  const totalTone = getDeltaTone(totalDelta);

  // ------- 차트 마운트 -------
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const colors = readChartColors();
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 260,
      layout: {
        background: { color: 'transparent' },
        textColor: colors.text,
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: range === '1d',
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
      localization: {
        // 자산 추이는 KRW 단위 정수 — 천단위 콤마, 소수 0자리
        priceFormatter: (price: number) =>
          price.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      },
    });
    const series = chart.addAreaSeries({
      lineColor: colors.line,
      lineWidth: 2,
      topColor: colors.areaTop,
      bottomColor: colors.areaBottom,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.floor(entry.contentRect.width);
      chart.applyOptions({ width: w });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // 테마/range/빈상태 전환 시 옵션 재주입을 위해 재마운트.
    // hasSnapshots false 일 땐 차트 컨테이너 자체가 미렌더 → useEffect 가 ref null 로 bail.
  }, [theme, range, hasSnapshots]);

  // 스냅샷 데이터 주입
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    if (points.length === 0) {
      series.setData([]);
      return;
    }
    const data = points
      .map((p) => {
        const epochSec = Math.floor(new Date(p.date).getTime() / 1000);
        return {
          time: epochSec as UTCTimestamp,
          value: p.total_krw,
        };
      })
      // lightweight-charts 는 시간 오름차순 + 중복 없는 데이터를 요구
      .sort((a, b) => (a.time as number) - (b.time as number));
    series.setData(data);
    chart.timeScale().fitContent();
  }, [points]);

  // ------- 렌더 -------
  const isInitialLoading = userLoading || holdingsLoading;

  return (
    <section className={s.section}>
      <div className={s.container}>
        {/* 총자산 + 차트 (플랫) */}
        <div className={s.summary}>
          <div className={s.summaryTop}>
            <div className={s.summaryLeft}>
              <div className={s.lab}>Total assets</div>
              <div className={s.big}>
                {isInitialLoading ? '—' : formatKRW(totalKRW)}
              </div>
              <div className={s.bigSub}>
                <span className={`${s.pl} ${toneClass(totalTone)}`}>
                  {totalDelta >= 0 ? '+' : '−'}
                  {formatKRW(Math.abs(totalDelta))}
                </span>
                <span className={`${s.pl} ${toneClass(totalTone)}`}>
                  {formatPercent(totalDeltaPct)}
                </span>
                <span className={s.since}>since inception</span>
              </div>
            </div>
            <div className={s.range} role="tablist" aria-label="기간 선택">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={range === r.key}
                  className={range === r.key ? s.activeRange : ''}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className={s.chartWrap}>
            {hasSnapshots ? (
              <div ref={containerRef} className={s.chart} />
            ) : (
              <div className={s.chartEmpty}>
                {snapshots.isLoading ? (
                  <span className={s.chartEmptyDim}>불러오는 중…</span>
                ) : snapshots.isError ? (
                  <span className={s.chartEmptyDim}>차트를 불러오지 못했습니다</span>
                ) : (
                  <>
                    <p className={s.chartEmptyTitle}>
                      거래 시작 후 자산 추이가 표시됩니다
                    </p>
                    <p className={s.chartEmptySub}>
                      <Link to="/app/markets" className={s.emptyLink}>Markets</Link>
                      {' 에서 첫 매수를 해보세요.'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Holdings (플랫) */}
        <div className={s.holdings}>
          <div className={s.holdingsHead}>
            <span className={s.holdingsTitle}>Holdings</span>
            <span className={s.holdingsCount}>{holdings.length} 종목</span>
          </div>

          {holdingsLoading ? (
            <div className={s.skeleton} aria-hidden="true">
              <div className={s.skelRow} />
              <div className={s.skelRow} />
              <div className={s.skelRow} />
            </div>
          ) : holdings.length === 0 ? (
            <div className={s.empty}>
              <p className={s.emptyTitle}>보유 종목이 없습니다</p>
              <p className={s.emptySub}>
                <Link to="/app/markets" className={s.emptyLink}>Markets</Link>
                {' 에서 첫 종목을 매수해보세요.'}
              </p>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>Qty</th>
                    <th>평균가</th>
                    <th>현재가</th>
                    <th>P / L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const q = quotes[h.symbol];
                    const last = q?.last_price;
                    const isUSD = h.currency === 'USD';
                    const localFormat = (n: number) =>
                      isUSD
                        ? `$${n.toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                          })}`
                        : `₩${Math.round(n).toLocaleString('ko-KR')}`;
                    const pl =
                      typeof last === 'number'
                        ? (last - h.avg_price) * h.qty
                        : null;
                    const pct =
                      typeof last === 'number' && h.avg_price > 0
                        ? (last / h.avg_price - 1) * 100
                        : null;
                    const tone = pl === null ? 'neutral' : getDeltaTone(pl);
                    return (
                      <tr key={h.symbol}>
                        <td>
                          <div className={s.tk}>{h.symbol}</div>
                          <div className={s.nm}>{h.name}</div>
                        </td>
                        <td className={s.mono}>{h.qty.toLocaleString('ko-KR')}</td>
                        <td className={s.mono}>{localFormat(h.avg_price)}</td>
                        <td className={s.mono}>
                          {typeof last === 'number' ? localFormat(last) : '—'}
                        </td>
                        <td className={`${s.mono} ${toneClass(tone)}`}>
                          {pl === null || pct === null
                            ? '—'
                            : `${pl >= 0 ? '+' : '−'}${localFormat(Math.abs(pl))} · ${formatPercent(pct)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
