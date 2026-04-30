import { useState } from 'react';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import s from './Pricing.module.css';

interface Tier {
  name: string; price: string; tag: string; desc: string; cta: string;
  featured: boolean; features: string[];
}

const TIERS: Tier[] = [
  { name: 'Free', price: '₩0', tag: '평생 무료', desc: '시작하기에 충분한 기능.', cta: '바로 시작', featured: false,
    features: ['가상 자금 ₩1,000만', '실시간 KRX 시세 (15분 지연)', '기본 포트폴리오 분석', '커뮤니티 액세스'] },
  { name: 'Pro',  price: '₩9,900', tag: '월간', desc: '진지하게 연습하는 사람을 위해.', cta: '14일 무료 체험', featured: true,
    features: ['가상 자금 ₩1억까지', '실시간 KRX·NASDAQ 시세', '고급 분석 (샤프, 베타, VaR)', '백테스팅 무제한', '매매 일지 자동 생성'] },
  { name: 'Team', price: '문의', tag: '5인 이상', desc: '동아리·강의·연구실용.', cta: '영업 문의', featured: false,
    features: ['Pro의 모든 기능', '관리자 대시보드', '리더보드 · 챌린지', 'API 액세스', '전담 지원'] },
];

export function PricingTiers() {
  return (
    <div className={s.grid}>
      {TIERS.map((t) => (
        <div key={t.name} className={`${s.tier} ${t.featured ? s.featured : ''}`}>
          {t.featured && <div className={s.badge}>가장 인기</div>}
          <div className={s.name}>{t.name}</div>
          <div className={s.price}>
            <span className={s.amount}>{t.price}</span>
            <span className={s.period}>/ {t.tag}</span>
          </div>
          <p className={s.desc}>{t.desc}</p>
          <Button variant={t.featured ? 'primary' : 'secondary'} block as="link" to="/signup">{t.cta}</Button>
          <ul className={s.list}>
            {t.features.map((f) => (
              <li key={f}><Icon name="check" size={14} accent /> {f}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Pricing() {
  return (
    <section className={s.section} id="pricing">
      <div className={s.container}>
        <div className={s.head}>
          <span className={s.eyebrow}>Pricing</span>
          <h2 className={s.title}>간단한 가격.</h2>
          <p className={s.sub}>시작은 무료. 필요해지면 업그레이드.</p>
        </div>
        <PricingTiers />
      </div>
    </section>
  );
}

const FAQS = [
  { q: '진짜 돈이 필요한가요?', a: '아니요. Paperstock은 가상 자금만 사용합니다. 카드 등록 없이 가입 즉시 ₩1,000만이 지급됩니다.' },
  { q: '시세는 실시간인가요?', a: 'Free는 15분 지연, Pro부터 실시간 KRX·NASDAQ·NYSE 데이터를 제공합니다.' },
  { q: '결과가 실제 투자 성과와 같을까요?', a: '대부분의 시장 변수는 동일하지만, 슬리피지·심리적 압박은 가상 환경에서 100% 재현되지 않습니다.' },
  { q: '리셋할 수 있나요?', a: '언제든지. 포트폴리오를 초기화하고 처음부터 다시 시작할 수 있습니다.' },
];

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className={s.section}>
      <div className={`${s.container} ${s.faqWrap}`}>
        <div className={s.head}><span className={s.eyebrow}>FAQ</span><h2 className={s.title}>자주 묻는 질문.</h2></div>
        <div className={s.faq}>
          {FAQS.map((f, i) => (
            <button key={f.q} type="button" onClick={() => setOpen(open === i ? -1 : i)}
                    className={`${s.faqItem} ${open === i ? s.faqOpen : ''}`}>
              <div className={s.faqQ}>
                <span>{f.q}</span>
                <Icon name="chevron-down" size={18} className={s.faqChev} />
              </div>
              <div className={s.faqA}>{f.a}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
