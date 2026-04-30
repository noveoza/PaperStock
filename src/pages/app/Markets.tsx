import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useSearch, type SearchResult } from '../../app/hooks/useSearch';
import { useQuote, type Quote } from '../../app/hooks/useQuote';
import { useQuotes } from '../../app/hooks/useQuotes';
import { useHistory, type HistoryRange } from '../../app/hooks/useHistory';
import { useUser } from '../../app/hooks/useUser';
import { useHoldings } from '../../app/hooks/useHoldings';
import { useWatchlist } from '../../app/hooks/useWatchlist';
import { useTheme } from '../../styles/useTheme';
import { TradeModal } from '../../app/components/TradeModal';
import { Icon } from '../../components/Icon/Icon';
import {
  formatCurrency,
  formatPercent,
  getDeltaTone,
  type DeltaTone,
} from '../../app/lib/format';
import type { TradeSide } from '../../app/hooks/useTrade';
import s from './Markets.module.css';

interface PopularItem {
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

const POPULAR: PopularItem[] = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KOSPI', currency: 'KRW' },
  { symbol: '035420.KS', name: 'NAVER', market: 'KOSPI', currency: 'KRW' },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KOSPI', currency: 'KRW' },
  { symbol: '035720.KS', name: '카카오', market: 'KOSPI', currency: 'KRW' },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'NASDAQ', currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'NASDAQ', currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'NASDAQ', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'NASDAQ', currency: 'USD' },
];

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

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return v;
}

interface RowMeta {
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

function ListRow({
  item,
  selected,
  quote,
  onSelect,
}: {
  item: RowMeta;
  selected: boolean;
  quote?: Quote;
  onSelect: (item: RowMeta) => void;
}) {
  const tone = quote ? getDeltaTone(quote.change) : 'neutral';
  return (
    <button
      type="button"
      className={`${s.row} ${selected ? s.rowSelected : ''}`}
      onClick={() => onSelect(item)}
    >
      <div className={s.rowLeft}>
        <div className={s.rowSymbol}>{item.symbol}</div>
        <div className={s.rowName}>{item.name}</div>
        <div className={s.rowMarket}>{item.market}</div>
      </div>
      <div className={s.rowRight}>
        <div className={s.rowPrice}>
          {quote ? formatCurrency(quote.last_price, quote.currency) : '—'}
        </div>
        <div className={`${s.rowDelta} ${toneClass(tone)}`}>
          {quote
            ? `${quote.change >= 0 ? '+' : '−'}${formatCurrency(Math.abs(quote.change), quote.currency)} · ${formatPercent(quote.change_pct)}`
            : ''}
        </div>
      </div>
    </button>
  );
}

interface DetailProps {
  item: RowMeta;
  onTrade: (side: TradeSide) => void;
  holdingQty: number;
  starred: boolean;
  onToggleStar: () => void;
}

function Detail({ item, onTrade, holdingQty, starred, onToggleStar }: DetailProps) {
  const { theme } = useTheme();
  const [range, setRange] = useState<HistoryRange>('1m');
  const quoteQ = useQuote(item.symbol);
  const historyQ = useHistory(item.symbol, range);

  const quote = quoteQ.data;
  const tone = quote ? getDeltaTone(quote.change) : 'neutral';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const text = readToken('--fg-3', '#737373');
    const grid = readToken('--line', 'rgba(255,255,255,0.06)');
    const line = readToken('--accent-2', '#a855f7');
    // KRW 종목은 정수, USD 등은 소수 둘째자리까지
    const isKRW = item.currency === 'KRW';
    const fractionDigits = isKRW ? 0 : 2;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 240,
      layout: {
        background: { color: 'transparent' },
        textColor: text,
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: grid },
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
        priceFormatter: (price: number) =>
          price.toLocaleString('en-US', {
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: isKRW ? 0 : 2,
          }),
      },
    });
    const series = chart.addAreaSeries({
      lineColor: line,
      lineWidth: 2,
      topColor: 'rgba(168,85,247,0.30)',
      bottomColor: 'rgba(168,85,247,0)',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [theme, range, item.symbol]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const candles = historyQ.data?.candles ?? [];
    if (candles.length === 0) {
      series.setData([]);
      return;
    }
    series.setData(
      candles.map((c) => ({ time: c.t as UTCTimestamp, value: c.c })),
    );
    chart.timeScale().fitContent();
  }, [historyQ.data]);

  return (
    <div className={s.detail}>
      <header className={s.detailHead}>
        <div className={s.detailTitleBlock}>
          <div className={s.detailSymbolRow}>
            <span className={s.detailSymbol}>{item.symbol}</span>
            <button
              type="button"
              onClick={onToggleStar}
              className={`${s.starBtn} ${starred ? s.starOn : ''}`}
              aria-pressed={starred}
              aria-label={starred ? '관심 종목 해제' : '관심 종목 추가'}
              title={starred ? '관심 종목 해제' : '관심 종목 추가'}
            >
              <Icon name="star" size={16} accent={starred} />
            </button>
          </div>
          <h2 className={s.detailName}>{item.name}</h2>
          <div className={s.detailMarket}>{item.market}</div>
        </div>
        <div className={s.detailPriceBlock}>
          <div className={s.detailPrice}>
            {quote ? formatCurrency(quote.last_price, quote.currency) : '—'}
          </div>
          <div className={`${s.detailDelta} ${toneClass(tone)}`}>
            {quote
              ? `${quote.change >= 0 ? '+' : '−'}${formatCurrency(Math.abs(quote.change), quote.currency)} · ${formatPercent(quote.change_pct)}`
              : ''}
          </div>
        </div>
      </header>

      <div className={s.rangeWrap}>
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
        <div ref={containerRef} className={s.chart} />
        {historyQ.isError && (
          <div className={s.chartError}>차트를 불러오지 못했습니다</div>
        )}
      </div>

      <div className={s.actions}>
        <button
          type="button"
          className={`${s.tradeBtn} ${s.buy}`}
          disabled={!quote}
          onClick={() => onTrade('BUY')}
        >
          매수
        </button>
        <button
          type="button"
          className={`${s.tradeBtn} ${s.sell}`}
          disabled={!quote || holdingQty <= 0}
          onClick={() => onTrade('SELL')}
        >
          매도{holdingQty > 0 ? ` (보유 ${holdingQty.toLocaleString('ko-KR')})` : ''}
        </button>
      </div>
    </div>
  );
}

export function Markets() {
  const [searchInput, setSearchInput] = useState('');
  const debounced = useDebounced(searchInput, 300);
  const search = useSearch(debounced);

  const { user } = useUser();
  const { holdings } = useHoldings();
  const watchlist = useWatchlist();

  const showSearch = debounced.trim().length > 0;
  const list: RowMeta[] = useMemo(() => {
    if (showSearch) {
      const results: SearchResult[] = search.data ?? [];
      return results.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        market: r.market,
        currency: r.currency,
      }));
    }
    return POPULAR;
  }, [showSearch, search.data]);

  const symbols = useMemo(() => list.map((r) => r.symbol), [list]);
  const { quotes } = useQuotes(symbols);

  // 선택된 종목은 RowMeta 자체를 보관 — 리스트가 검색/인기 사이에서 바뀌어도 detail 유지
  const [selected, setSelected] = useState<RowMeta | null>(POPULAR[0] ?? null);

  // 검색 결과 첫 번째로 자동 선택 — 사용자가 아직 직접 고르지 않았을 때만
  const userPickedRef = useRef(false);
  useEffect(() => {
    if (userPickedRef.current) return;
    const first = list[0];
    if (!first) return;
    setSelected((prev) => (prev && list.some((r) => r.symbol === prev.symbol) ? prev : first));
  }, [list]);

  const selectedSymbol = selected?.symbol;

  const handleSelect = (item: RowMeta) => {
    userPickedRef.current = true;
    setSelected(item);
  };

  // 거래 모달 상태
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<TradeSide>('BUY');

  const selectedHolding = useMemo(
    () => holdings.find((h) => h.symbol === selected?.symbol),
    [holdings, selected],
  );
  const holdingQty = selectedHolding?.qty ?? 0;
  const selectedQuote = selected ? quotes[selected.symbol] : undefined;

  return (
    <section className={s.section}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.searchWrap}>
            <input
              type="search"
              className={s.searchInput}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="종목명·심볼로 검색 (예: 삼성, AAPL)"
              autoComplete="off"
            />
          </div>
        </div>

        <div className={s.body}>
          {/* 좌: 리스트 */}
          <aside className={s.listPanel}>
            <div className={s.listHead}>
              <span className={s.listTitle}>
                {showSearch ? '검색 결과' : '인기 종목'}
              </span>
              <span className={s.listCount}>
                {showSearch && search.isLoading
                  ? '검색 중…'
                  : `${list.length} 종목`}
              </span>
            </div>

            {showSearch && search.isError ? (
              <div className={s.listEmpty}>검색에 실패했습니다.</div>
            ) : list.length === 0 ? (
              <div className={s.listEmpty}>
                {showSearch ? '결과가 없습니다.' : '인기 종목이 없습니다.'}
              </div>
            ) : (
              <div className={s.listScroll}>
                {list.map((item) => (
                  <ListRow
                    key={item.symbol}
                    item={item}
                    selected={selectedSymbol === item.symbol}
                    quote={quotes[item.symbol]}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </aside>

          {/* 우: 상세 */}
          <div className={s.detailPanel}>
            {selected ? (
              <Detail
                key={selected.symbol}
                item={selected}
                holdingQty={holdingQty}
                starred={watchlist.has(selected.symbol)}
                onToggleStar={() => {
                  watchlist
                    .toggle({
                      symbol: selected.symbol,
                      name: selected.name,
                      market: selected.market,
                      currency: selected.currency,
                    })
                    .catch((err) =>
                      console.warn('[markets] watchlist toggle failed:', err),
                    );
                }}
                onTrade={(side) => {
                  setTradeSide(side);
                  setTradeOpen(true);
                }}
              />
            ) : (
              <div className={s.detailEmpty}>
                좌측에서 종목을 선택하세요.
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <TradeModal
          open={tradeOpen}
          side={tradeSide}
          symbol={selected.symbol}
          name={selected.name}
          currency={selected.currency}
          quote={selectedQuote}
          availableCash={user?.cash ?? 0}
          holdingQty={holdingQty}
          onClose={() => setTradeOpen(false)}
        />
      )}
    </section>
  );
}
