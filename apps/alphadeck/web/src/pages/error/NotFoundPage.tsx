import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: '80px 0' }}>
    <h1>404</h1>
    <p>페이지를 찾을 수 없습니다.</p>
    <Link to="/">홈으로 돌아가기</Link>
  </div>
);

export default NotFoundPage;
