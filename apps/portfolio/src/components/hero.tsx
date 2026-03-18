import Link from "next/link";

import { profile } from "@/content/profile";
import styles from "@/styles/hero.module.scss";

const Hero = () => {
  return (
    <section className={styles.hero}>
      <h1 className={styles.name}>{profile.name}</h1>
      <p className={styles.title}>{profile.title}</p>
      <p className={styles.summary}>{profile.summary}</p>
      <p className={styles.philosophy}>&ldquo;{profile.philosophy}&rdquo;</p>
      <div className={styles.contactLinks}>
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
      <Link href="/world" className={styles.exploreLink}>
        3D 세계 탐험하기
      </Link>
    </section>
  );
};

export default Hero;
