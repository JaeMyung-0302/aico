import type { ProjectMeta } from "@/types";
import styles from "@/styles/project-card.module.scss";

interface ProjectCardProps {
  readonly project: ProjectMeta;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{project.title}</h3>
      <p className={styles.period}>{project.period}</p>
      <p className={styles.description}>{project.description}</p>
      <p className={styles.role}>{project.role}</p>
      <div className={styles.techStack}>
        {project.techStack.map((tech) => (
          <span key={tech} className={styles.badge}>
            {tech}
          </span>
        ))}
      </div>
    </article>
  );
};

export default ProjectCard;
