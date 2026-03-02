import { projects } from "@/content/projects";
import ProjectCard from "@/components/project-card";
import styles from "@/styles/project-grid.module.scss";

const ProjectGrid = () => {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Projects</h2>
      <div className={styles.grid}>
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
};

export default ProjectGrid;
