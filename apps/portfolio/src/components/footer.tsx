import { profile } from "@/content/profile";
import styles from "@/styles/footer.module.scss";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <a
          href={profile.contact.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 프로필"
        >
          GitHub
        </a>
        <a
          href={profile.contact.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn 프로필"
        >
          LinkedIn
        </a>
        <a href={`mailto:${profile.contact.email}`} aria-label="이메일 보내기">
          Email
        </a>
      </div>
      <p className={styles.copyright}>
        &copy; {new Date().getFullYear()} {profile.name}
      </p>
    </footer>
  );
};

export default Footer;
