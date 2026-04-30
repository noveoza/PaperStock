import s from './Stats.module.css';

const STATS = [
  { v: '47,200+', l: '활성 트레이더' },
  { v: '₩1.2조',  l: '누적 모의 거래액' },
  { v: '12.4M',   l: '체결된 주문' },
  { v: '99.97%',  l: '시세 정확도' },
];

export function Stats() {
  return (
    <section className={s.stats}>
      <div className={s.container}>
        <div className={s.grid}>
          {STATS.map((st) => (
            <div key={st.l} className={s.cell}>
              <div className={s.v}>{st.v}</div>
              <div className={s.l}>{st.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
