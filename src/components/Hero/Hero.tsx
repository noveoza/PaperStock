import { Button } from '../Button/Button';
import { Pill } from '../Pill/Pill';
import { Icon } from '../Icon/Icon';
import s from './Hero.module.css';

export function Hero() {
  return (
    <section className={s.hero}>
      <div className={s.glow} />
      <div className={s.container}>
        <div className={s.eyebrow}>
          <Pill dot>New · 실시간 KRX 시세 지원</Pill>
        </div>
        <h1 className={s.title}>
          진짜 돈 없이,
          <br />
          <span className="gradient">진짜 시장에서.</span>
        </h1>
        <p className={s.sub}>
          1,000만 원의 가상 자금으로 한국·미국 주식을 거래합니다.
          <br />
          포트폴리오를 만들고, 손익을 추적하고, 시장을 배우세요.
        </p>
        <div className={s.cta}>
          <Button variant="primary" size="lg" as="link" to="/signup">
            지금 시작하기 <span className={s.arrow}>→</span>
          </Button>
          <Button variant="secondary" size="lg" as="link" to="/signup">
            <Icon name="play" size={16} />
            데모 보기
          </Button>
        </div>
        <div className={s.meta}>
          <span>가입 즉시 ₩10,000,000 지급</span>
          <span className={s.sep} />
          <span>신용카드 불필요</span>
          <span className={s.sep} />
          <span>실시간 KRX · NASDAQ</span>
        </div>
      </div>
    </section>
  );
}
