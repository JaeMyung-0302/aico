"use client";

import { useEffect } from "react";

import { projects } from "@/content/projects";
import { tourStops } from "@/content/tour-stops";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/project-detail.module.scss";

const projectMap = new Map(projects.map((p) => [p.slug, p]));

export const ProjectDetail = () => {
  const nearbyProject = useWorldStore((s) => s.nearbyProject);
  const setNearbyProject = useWorldStore((s) => s.setNearbyProject);
  const tourActive = useWorldStore((s) => s.tourActive);
  const tourStopIndex = useWorldStore((s) => s.tourStopIndex);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && nearbyProject && !tourActive) {
        setNearbyProject(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [nearbyProject, setNearbyProject, tourActive]);

  const activeSlug = tourActive
    ? tourStops[tourStopIndex]?.slug ?? null
    : nearbyProject;

  if (!activeSlug) return null;

  const project = projectMap.get(activeSlug);
  if (!project) return null;

  return (
    <div className={styles.overlay}>
      {!tourActive && (
        <button
          className={styles.closeButton}
          onClick={() => setNearbyProject(null)}
          type="button"
        >
          ×
        </button>
      )}

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

      {project.metrics && project.metrics.length > 0 && (
        <>
          <p className={styles.sectionTitle}>Metrics</p>
          <div className={styles.metrics}>
            {project.metrics.map((m) => (
              <span key={m} className={styles.metricBadge}>
                {m}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
