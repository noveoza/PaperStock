import s from './Dashboard.module.css';

interface Holding {
  tk: string; name: string; qty: number; avg: number; last: number;
}

const HOLDINGS: Holding[] = [
  { tk: '005930.KS', name: '삼성전자',   qty: 10, avg: 69200,  last: 71200  },
  { tk: 'AAPL',      name: 'Apple Inc.', qty: 5,  avg: 178.40, last: 184.32 },
  { tk: '035420.KS', name: 'NAVER',     qty: 4,  avg: 205000, last: 198400 },
  { tk: 'TSLA',      name: 'Tesla',     qty: 3,  avg: 230.10, last: 241.05 },
  { tk: '000660.KS', name: 'SK하이닉스',  qty: 6,  avg: 138000, last: 142500 },
];

const POINTS: [number, number][] = [
  [0,70],[50,65],[100,68],[150,60],[200,55],[250,58],
  [300,48],[350,50],[400,42],[450,38],[500,30],[550,32],
  [600,22],[650,24],[700,18],[750,12],
];
const linePath = 'M ' + POINTS.map((p) => p.join(' ')).join(' L ');
const areaPath = `${linePath} L 750 100 L 0 100 Z`;

export function Dashboard() {
  return (
    <section className={s.wrap}>
      <div className={s.container}>
        <div className={s.dash}>
          <div className={s.chrome}>
            <div className={s.dots}><span /><span /><span /></div>
            <div className={s.url}>app.paperstock.kr / portfolio</div>
            <div />
          </div>
          <div className={s.body}>
            <aside className={s.side}>
              <div className={s.brand}>
                <img src="/logo-mark.svg" width={20} height={20} alt="" />
                <span>Paperstock</span>
              </div>
              <nav className={s.menu}>
                <a className={s.active}><img src="/icons/pie-chart.svg" alt="" /> Portfolio</a>
                <a><img src="/icons/line-chart.svg" alt="" /> Markets</a>
                <a><img src="/icons/wallet.svg" alt="" /> Watchlist</a>
                <a><img src="/icons/bar-chart-3.svg" alt="" /> History</a>
              </nav>
              <div className={s.cash}>
                <div className={s.cashLab}>Cash</div>
                <div className={s.cashVal}>₩4,218,400</div>
              </div>
            </aside>
            <div className={s.main}>
              <div className={s.top}>
                <div>
                  <div className={s.lab}>Total assets</div>
                  <div className={s.big}>₩11,872,300</div>
                  <div className={s.bigSub}>
                    <span className={`${s.pl} ${s.gain}`}>+₩1,872,300</span>
                    <span className={`${s.pl} ${s.gain}`}>+18.72%</span>
                    <span className={s.since}>since inception</span>
                  </div>
                </div>
                <div className={s.range}>
                  {(['1D','1W','1M','3M','1Y','ALL'] as const).map((r) => (
                    <button key={r} className={r === '1M' ? s.activeRange : ''}>{r}</button>
                  ))}
                </div>
              </div>
              <div className={s.chart}>
                <svg viewBox="0 0 750 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ps-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#a855f7" stopOpacity="0.30" />
                      <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="ps-line" x1="0" x2="1">
                      <stop offset="0" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#ps-area)" />
                  <path d={linePath} fill="none" stroke="url(#ps-line)" strokeWidth={1.5} />
                </svg>
              </div>
              <div className={s.holdingsHead}>
                <span>Holdings</span>
                <span>{HOLDINGS.length} 종목</span>
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>종목</th><th>Qty</th><th>평균가</th><th>현재가</th><th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {HOLDINGS.map((h) => {
                    const pl = (h.last - h.avg) * h.qty;
                    const pct = ((h.last / h.avg) - 1) * 100;
                    const sign = pl >= 0 ? '+' : '−';
                    const cls = pl >= 0 ? s.gain : s.loss;
                    const fmt = (n: number) => Math.abs(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
                    return (
                      <tr key={h.tk}>
                        <td>
                          <div className={s.tk}>{h.tk}</div>
                          <div className={s.nm}>{h.name}</div>
                        </td>
                        <td className={s.mono}>{h.qty}</td>
                        <td className={s.mono}>{h.avg.toLocaleString()}</td>
                        <td className={s.mono}>{h.last.toLocaleString()}</td>
                        <td className={`${s.mono} ${cls}`}>
                          {sign}{fmt(pl)} · {sign}{Math.abs(pct).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
