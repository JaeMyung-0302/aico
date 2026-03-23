import { Link } from 'react-router-dom';
import styles from './Header.module.scss';

const Header = () => (
  <header className={styles.header}>
    <div className={styles.container}>
      <Link to="/" className={styles.logo}>
        AlphaDesk
      </Link>
      <nav className={styles.nav}>
        <Link to="/">Home</Link>
      </nav>
    </div>
  </header>
);

export default Header;
