import { Icon } from '../Icon/Icon';
import s from './Features.module.css';

interface Item { icon: string; title: string; body: string; }

const ITEMS: Item[] = [
  { icon: 'wallet',       title: '가상 자금 ₩1,000만', body: '가입 즉시 지급. 손해를 봐도 진짜 돈은 안전합니다. 언제든 리셋해서 다시 시작.' },
  { icon: 'line-chart',   title: '실시간 시세',        body: 'KRX, NASDAQ, NYSE 시장 데이터를 실시간으로. 호가, 거래량, 차트까지.' },
  { icon: 'pie-chart',    title: '포트폴리오 분석',    body: '섹터별 비중, 변동성, 샤프 지수. 전문가가 보는 지표를 쉽게 풀어서.' },
  { icon: 'shield-check', title: '리스크 없이 학습',   body: '시장 패닉, FOMO, 손절. 진짜 감정을 진짜 시장에서, 가짜 자금으로.' },
  { icon: 'trending-up',  title: 'P/L 추적',           body: '일간·주간·월간 손익. 매매 일지가 자동으로 쌓입니다.' },
  { icon: 'zap',          title: '빠른 주문',          body: '단축키 지원. 시장가, 지정가, 예약 주문. 모바일에서도 동일.' },
];

export function Features() {
  return (
    <section className={s.section} id="product">
      <div className={s.container}>
        <div className={s.head}>
          <span className={s.eyebrow}>Product</span>
          <h2 className={s.title}>필요한 것만, 깔끔하게.</h2>
          <p className={s.sub}>
            증권사 앱처럼 복잡하지 않습니다. 학습에 필요한 도구만, 잘 만들어서.
          </p>
        </div>
        <div className={s.grid}>
          {ITEMS.map((it) => (
            <div key={it.title} className={s.feature}>
              <div className={s.icon}>
                <Icon name={it.icon} size={22} accent />
              </div>
              <h3 className={s.fTitle}>{it.title}</h3>
              <p className={s.fBody}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
