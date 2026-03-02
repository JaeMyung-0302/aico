"use client";

import { useEffect } from "react";

import { projects } from "@/content/projects";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/project-detail.module.scss";

const projectMap = new Map(projects.map((p) => [p.slug, p]));

export const ProjectDetail = () => {
  const nearbyProject = useWorldStore((s) => s.nearbyProject);
  const setNearbyProject = useWorldStore((s) => s.setNearbyProject);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && nearbyProject) {
        setNearbyProject(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [nearbyProject, setNearbyProject]);

  if (!nearbyProject) return null;

  const project = projectMap.get(nearbyProject);
  if (!project) return null;

  return (
    <div className={styles.overlay}>
      <button
        className={styles.closeButton}
        onClick={() => setNearbyProject(null)}
        type="button"
      >
        ×
      </button>

      <h2 className={styles.title}>{project.title}</h2>
      <p className={styles.period}>{project.period}</p>
      <p className={styles.description}>{project.description}</p>

      <p className={styles.sectionTitle}>Tech Stack</p>
      <div className={styles.techStack}>
        {project.techStack.map((tech) => (
          <span key={tech} className={styles.badge}>{tech}</span>
        ))}
      </div>

      <p className={styles.sectionTitle}>Role</p>
      <p className={styles.role}>{project.role}</p>

      <p className={styles.sectionTitle}>Highlights</p>
      <ul className={styles.highlights}>
        {project.highlights.map((highlight) => (
          <li key={highlight} className={styles.highlightItem}>
            {highlight}
          </li>
        ))}
      </ul>
    </div>
  );
};
