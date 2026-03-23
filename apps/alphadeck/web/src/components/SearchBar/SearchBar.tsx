import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchBar.module.scss';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (symbol) {
      navigate(`/analysis/${symbol}`);
      setQuery('');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="종목 검색 (예: AAPL)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className={styles.button} type="submit">검색</button>
    </form>
  );
};

export default SearchBar;
