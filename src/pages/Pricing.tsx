import { PricingTiers } from '../components/Pricing/Pricing';

export function Pricing() {
  return (
    <main style={{ paddingTop: 160, paddingBottom: 240 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 96 }}>
          <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Pricing</span>
          <h1 style={{ fontSize: 'clamp(40px, 4.5vw, 64px)', letterSpacing: '-0.04em', fontWeight: 600, margin: '24px 0 16px' }}>
            간단한 가격.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--fg-2)', maxWidth: 560, margin: '0 auto' }}>
            시작은 무료. 필요해지면 업그레이드. 카드 등록 없이 가상 자금부터 받고 시작하세요.
          </p>
        </div>
        <PricingTiers />
      </div>
    </main>
  );
}
