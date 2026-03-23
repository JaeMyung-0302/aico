import { useRouteError, Link } from 'react-router-dom';

const ErrorPage = () => {
  const error = useRouteError();

  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <h1>오류가 발생했습니다</h1>
      <p>{error instanceof Error ? error.message : '알 수 없는 오류'}</p>
      <Link to="/">홈으로 돌아가기</Link>
    </div>
  );
};

export default ErrorPage;
