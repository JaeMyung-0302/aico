import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.scss';

const POPULAR_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];

const HomePage = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (symbol) {
      navigate(`/analysis/${symbol}`);
    }
  };

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.title}>AI 투자 분석 비서</h1>
        <p className={styles.subtitle}>
          기술적 지표를 직접 계산해서 한국어로 알려드립니다
        </p>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="종목 티커를 입력하세요 (예: AAPL, TSLA)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={styles.searchButton} type="submit">
            분석하기
          </button>
        </form>
      </section>

      <section className={styles.popular}>
        <h2 className={styles.sectionTitle}>인기 종목</h2>
        <div className={styles.symbolGrid}>
          {POPULAR_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              className={styles.symbolCard}
              onClick={() => navigate(`/analysis/${symbol}`)}
            >
              {symbol}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
