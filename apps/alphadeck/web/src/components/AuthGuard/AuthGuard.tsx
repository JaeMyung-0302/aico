import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { token, user, isLoading, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    }
  }, [token, user, fetchMe]);

  useEffect(() => {
    if (!token && !isLoading) {
      navigate('/auth', { replace: true });
    }
  }, [token, isLoading, navigate]);

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
