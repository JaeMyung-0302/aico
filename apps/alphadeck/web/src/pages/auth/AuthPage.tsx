import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from './AuthPage.module.scss';

const AuthPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signup, signin } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await signin(email, password);
      }
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다';
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>
          {isSignup ? '회원가입' : '로그인'}
        </h1>

        {error && <p className={styles.error}>{error}</p>}

        <input
          className={styles.input}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <button className={styles.button} type="submit">
          {isSignup ? '가입하기' : '로그인'}
        </button>

        <button
          type="button"
          className={styles.toggle}
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
