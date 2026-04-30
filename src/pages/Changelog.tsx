const ENTRIES = [
  { v: '0.3.0', d: '2026-04-15', t: '실시간 NASDAQ 시세 추가', body: 'Pro 플랜에서 미국 주요 거래소 실시간 데이터를 지원합니다. 호가창과 거래량 차트도 함께.' },
  { v: '0.2.4', d: '2026-03-22', t: '포트폴리오 리셋', body: '언제든 포트폴리오를 초기화하고 처음부터 다시 시작할 수 있습니다. 매매 기록은 보존됩니다.' },
  { v: '0.2.0', d: '2026-02-10', t: '샤프·베타·VaR 분석', body: '전문가급 리스크 지표를 한눈에. 섹터 비중과 변동성도 함께 표시됩니다.' },
];

export function Changelog() {
  return (
    <main style={{ paddingTop: 160, paddingBottom: 240 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px' }}>
        <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Changelog</span>
        <h1 style={{ fontSize: 'clamp(40px, 4.5vw, 64px)', letterSpacing: '-0.04em', fontWeight: 600, margin: '24px 0 64px' }}>
          업데이트 기록.
        </h1>
        {ENTRIES.map((e) => (
          <div key={e.v} style={{ paddingBottom: 48, marginBottom: 48, borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)' }}>
              <span>v{e.v}</span><span>·</span><span>{e.d}</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 8px' }}>{e.t}</h3>
            <p style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>{e.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
