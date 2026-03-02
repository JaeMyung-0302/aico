import { skills } from "@/content/skills";
import styles from "@/styles/skill-section.module.scss";

const SkillSection = () => {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Skills</h2>
      <div className={styles.categories}>
        {skills.map((category) => (
          <div key={category.category} className={styles.category}>
            <h3 className={styles.categoryName}>{category.category}</h3>
            <div className={styles.badges}>
              {category.skills.map((skill) => (
                <span key={skill} className={styles.badge}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillSection;
