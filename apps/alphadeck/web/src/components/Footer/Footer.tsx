import Disclaimer from '../Disclaimer/Disclaimer';
import styles from './Footer.module.scss';

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.container}>
      <Disclaimer />
      <p className={styles.copyright}>
        &copy; {new Date().getFullYear()} AlphaDesk. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
