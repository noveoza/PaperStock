import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../app/lib/auth';
import s from './AuthPage.module.css';

type Mode = 'login' | 'signup';

interface Props {
  mode: Mode;
}

interface FieldErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  displayName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 8자 이상, 영문 1자 + 숫자 1자
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return '이미 가입된 이메일입니다.';
      case 'auth/invalid-email':
        return '이메일 형식이 올바르지 않습니다.';
      case 'auth/weak-password':
        return '비밀번호가 너무 약합니다.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'auth/too-many-requests':
        return '잠시 후 다시 시도해주세요.';
      case 'auth/network-request-failed':
        return '네트워크 오류입니다. 연결을 확인해주세요.';
      default:
        return err.message || '오류가 발생했습니다.';
    }
  }
  if (err instanceof Error) return err.message;
  return '오류가 발생했습니다.';
}

export function AuthPage({ mode }: Props) {
  const isSignup = mode === 'signup';
  const { signup, login, resetPassword, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (() => {
    const sp = new URLSearchParams(location.search);
    const r = sp.get('returnTo');
    return r && r.startsWith('/') ? r : '/app/portfolio';
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인된 사용자가 /login, /signup 으로 들어오면 앱으로 보냄
  useEffect(() => {
    if (status === 'authed') {
      navigate(returnTo, { replace: true });
    }
  }, [status, navigate, returnTo]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = '이메일을 입력해주세요.';
    else if (!EMAIL_RE.test(email)) next.email = '이메일 형식이 올바르지 않습니다.';

    if (!password) next.password = '비밀번호를 입력해주세요.';
    else if (isSignup && !PASSWORD_RE.test(password))
      next.password = '8자 이상 + 영문/숫자 혼용이 필요합니다.';

    if (isSignup) {
      if (!passwordConfirm) next.passwordConfirm = '비밀번호를 한 번 더 입력해주세요.';
      else if (password !== passwordConfirm)
        next.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setResetMessage(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email.trim(), password, displayName.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      setSubmitError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setSubmitError(null);
    setResetMessage(null);
    if (!email.trim() || !EMAIL_RE.test(email)) {
      setErrors((prev) => ({ ...prev, email: '재설정 메일을 받을 이메일을 입력해주세요.' }));
      return;
    }
    try {
      await resetPassword(email.trim());
      setResetMessage('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.');
    } catch (err) {
      setSubmitError(mapAuthError(err));
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <Link to="/" className={s.brand}>
          <img src="/logo-mark.svg" width={24} height={24} alt="" />
          <span>Paperstock</span>
        </Link>

        <h1 className={s.title}>{isSignup ? '계정 만들기' : '다시 오신 걸 환영합니다'}</h1>
        <p className={s.sub}>
          {isSignup
            ? '가입 즉시 ₩10,000,000 의 가상 자금이 지급됩니다.'
            : '이메일로 로그인하고 포트폴리오를 이어서 확인하세요.'}
        </p>

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <label className={s.field}>
              <span className={s.label}>이름 (선택)</span>
              <input
                className={s.input}
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
              />
            </label>
          )}

          <label className={s.field}>
            <span className={s.label}>이메일</span>
            <input
              className={`${s.input} ${errors.email ? s.inputError : ''}`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {errors.email && <span className={s.fieldError}>{errors.email}</span>}
          </label>

          <label className={s.field}>
            <span className={s.label}>비밀번호</span>
            <input
              className={`${s.input} ${errors.password ? s.inputError : ''}`}
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? '8자 이상 · 영문 + 숫자' : '비밀번호'}
              required
            />
            {errors.password && <span className={s.fieldError}>{errors.password}</span>}
          </label>

          {isSignup && (
            <label className={s.field}>
              <span className={s.label}>비밀번호 확인</span>
              <input
                className={`${s.input} ${errors.passwordConfirm ? s.inputError : ''}`}
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                required
              />
              {errors.passwordConfirm && (
                <span className={s.fieldError}>{errors.passwordConfirm}</span>
              )}
            </label>
          )}

          {submitError && <div className={s.alertError}>{submitError}</div>}
          {resetMessage && <div className={s.alertOk}>{resetMessage}</div>}

          <Button
            variant="primary"
            size="md"
            block
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? isSignup
                ? '계정 생성 중…'
                : '로그인 중…'
              : isSignup
                ? '계정 만들기'
                : '로그인'}
          </Button>

          {!isSignup && (
            <button
              type="button"
              className={s.linkBtn}
              onClick={handleReset}
              disabled={submitting}
            >
              비밀번호를 잊으셨나요?
            </button>
          )}
        </form>

        <div className={s.altRow}>
          {isSignup ? (
            <>
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className={s.altLink}>로그인</Link>
            </>
          ) : (
            <>
              계정이 없으신가요?{' '}
              <Link to="/signup" className={s.altLink}>회원가입</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
