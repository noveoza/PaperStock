export function Docs() {
  return (
    <main style={{ paddingTop: 160, paddingBottom: 240 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px' }}>
        <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Docs</span>
        <h1 style={{ fontSize: 'clamp(40px, 4.5vw, 64px)', letterSpacing: '-0.04em', fontWeight: 600, margin: '24px 0 16px' }}>
          시작 가이드.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 64 }}>
          Paperstock은 5분 안에 첫 거래를 시작할 수 있습니다. 가입하고, 가상 자금을 받고, 종목을 검색하고, 매수.
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 16 }}>1. 계정 만들기</h2>
        <p style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.7, marginBottom: 48 }}>
          이메일 또는 소셜 계정으로 가입합니다. 가입 즉시 ₩10,000,000의 가상 자금이 지급됩니다.
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 16 }}>2. 첫 매수</h2>
        <p style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.7, marginBottom: 48 }}>
          종목명 또는 티커로 검색하고, 수량을 입력한 뒤 매수 버튼을 누르면 끝.
        </p>
      </div>
    </main>
  );
}
