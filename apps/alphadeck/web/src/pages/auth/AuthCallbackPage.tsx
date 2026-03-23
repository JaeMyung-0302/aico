import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      useAuthStore.setState({ token });
      fetchMe().then(() => navigate('/', { replace: true }));
    } else {
      setError('인증에 실패했습니다.');
    }
  }, [searchParams, navigate, fetchMe]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>{error}</p>
        <button onClick={() => navigate('/auth')}>로그인으로 돌아가기</button>
      </div>
    );
  }

  return <div style={{ textAlign: 'center', padding: '4rem' }}>인증 처리 중...</div>;
};

export default AuthCallbackPage;
