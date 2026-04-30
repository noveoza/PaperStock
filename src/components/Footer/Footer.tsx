import { Link } from 'react-router-dom';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import s from './Footer.module.css';

export function CTA() {
  return (
    <section className={s.ctaBand}>
      <div className={s.ctaGlow} />
      <div className={s.container}>
        <h2 className={s.ctaTitle}>
          오늘 시작하면,<br />
          <span className="gradient">1년 뒤의 투자자가 다릅니다.</span>
        </h2>
        <div className={s.ctaRow}>
          <Button variant="primary" size="lg" as="link" to="/signup">무료로 시작하기 →</Button>
          <Button variant="ghost" size="lg" as="link" to="/pricing">가격 보기</Button>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.top}>
          <div className={s.brandCol}>
            <Link className={s.brand} to="/">
              <img src="/logo-mark.svg" width={22} height={22} alt="" />
              <span>Paperstock</span>
            </Link>
            <p className={s.tag}>진짜 시장에서 연습하세요.<br />가짜 자금으로, 진짜 데이터로.</p>
          </div>
          <div className={s.cols}>
            <div><div className={s.h}>Product</div><a>Features</a><a>Pricing</a><a>Changelog</a><a>Roadmap</a></div>
            <div><div className={s.h}>Resources</div><a>Docs</a><a>Blog</a><a>Glossary</a><a>Community</a></div>
            <div><div className={s.h}>Company</div><a>About</a><a>Careers</a><a>Press</a><a>Contact</a></div>
          </div>
        </div>
        <div className={s.bottom}>
          <div className={s.legal}>© 2026 Paperstock Inc. · 모의투자 · 실제 거래가 발생하지 않습니다.</div>
          <div className={s.social}>
            <a><Icon name="twitter" size={18} /></a>
            <a><Icon name="github" size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
