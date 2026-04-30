import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

export type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signup: (email: string, password: string, displayName?: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // 동일 uid 에 대해 중복 init 호출 방지용 — 백엔드는 멱등이지만 불필요한 라운드트립 줄임.
    let lastInitedUid: string | null = null;

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setStatus('authed');

        // 회원가입 시 백엔드가 죽어 있어 init 이 실패한 경우를 대비해
        // 매 인증 이벤트마다 멱등 재호출 (fire-and-forget).
        if (lastInitedUid !== u.uid) {
          lastInitedUid = u.uid;
          api.post('/api/v1/users/init', {}).catch((err) => {
            console.warn('[auth] users/init 호출 실패:', err);
          });
        }
      } else {
        setUser(null);
        setStatus('guest');
        lastInitedUid = null;
      }
    });
    return unsub;
  }, []);

  const signup = useCallback<AuthContextValue['signup']>(
    async (email, password, displayName) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      // 백엔드에 사용자 문서 초기화 (seed_cash 지급) 요청. 멱등.
      try {
        await api.post('/api/v1/users/init');
      } catch (err) {
        // 초기화 실패해도 가입 자체는 성공 — 콘솔 경고만 남기고 진행
        // (사용자가 다음 로그인 시 init 재시도 가능)
        console.warn('[auth] users/init 호출 실패:', err);
      }
      return cred.user;
    },
    [],
  );

  const login = useCallback<AuthContextValue['login']>(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, []);

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async (email) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signup, login, logout, resetPassword }),
    [user, status, signup, login, logout, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 는 <AuthProvider> 내부에서만 사용 가능합니다.');
  }
  return ctx;
}
