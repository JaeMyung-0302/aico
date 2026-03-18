"use client";

import { useEffect } from "react";

import { projects } from "@/content/projects";
import { getProjectPlacements } from "@/content/worlds";
import { useWorldStore } from "@/stores/world-store";
import styles from "@/styles/quick-nav.module.scss";

const projectsByWorld = [
  {
    label: "개발자의 워크샵",
    items: getProjectPlacements("projects").map((p) => ({
      placement: p,
      project: projects.find((pr) => pr.slug === p.slug),
    })),
  },
  {
    label: "AI 연구소",
    items: getProjectPlacements("lab").map((p) => ({
      placement: p,
      project: projects.find((pr) => pr.slug === p.slug),
    })),
  },
];

export const QuickNav = () => {
  const quickNavOpen = useWorldStore((s) => s.quickNavOpen);
  const toggleQuickNav = useWorldStore((s) => s.toggleQuickNav);
  const setNearbyProject = useWorldStore((s) => s.setNearbyProject);
  const tourActive = useWorldStore((s) => s.tourActive);
  const currentWorld = useWorldStore((s) => s.currentWorld);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "q" && !tourActive) {
        toggleQuickNav();
      }
      if (e.key === "Escape" && quickNavOpen) {
        toggleQuickNav();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleQuickNav, quickNavOpen, tourActive]);

  if (!quickNavOpen || tourActive) return null;

  const handleSelect = (slug: string) => {
    setNearbyProject(slug);
    toggleQuickNav();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h2 className={styles.title}>프로젝트 목록</h2>
        {projectsByWorld
          .filter((group) =>
            group.items.some(
              ({ placement }) => placement.worldId === currentWorld,
            ),
          )
          .map((group) => (
            <div key={group.label} className={styles.worldGroup}>
              <p className={styles.worldLabel}>{group.label}</p>
              {group.items
                .filter(({ placement }) => placement.worldId === currentWorld)
                .map(({ placement, project }) =>
                  project ? (
                    <button
                      key={placement.slug}
                      className={styles.projectItem}
                      onClick={() => handleSelect(placement.slug)}
                      type="button"
                    >
                      <span className={styles.projectTitle}>
                        {project.title}
                      </span>
                      <span className={styles.projectDesc}>
                        {project.description.length > 60
                          ? `${project.description.slice(0, 60)}...`
                          : project.description}
                      </span>
                    </button>
                  ) : null,
                )}
            </div>
          ))}
        <p className={styles.closeHint}>Q 또는 Esc로 닫기</p>
      </div>
    </div>
  );
};
