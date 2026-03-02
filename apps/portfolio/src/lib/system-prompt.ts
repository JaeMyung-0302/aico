import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills } from "@/content/skills";

export const buildSystemPrompt = (nearbyProject?: string): string => {
  const projectSummaries = projects
    .map(
      (p) =>
        `### ${p.title}\n- 설명: ${p.description}\n- 기간: ${p.period}\n- 역할: ${p.role}\n- 기술: ${p.techStack.join(", ")}\n- 주요 성과:\n${p.highlights.map((h) => `  - ${h}`).join("\n")}`,
    )
    .join("\n\n");

  const skillSummaries = skills
    .map((s) => `- ${s.category}: ${s.skills.join(", ")}`)
    .join("\n");

  const contextLine = nearbyProject
    ? (() => {
        const found = projects.find((p) => p.slug === nearbyProject);
        return found
          ? `\n\n## 현재 맥락\n사용자가 현재 "${found.title}" 프로젝트 근처에 있습니다. 이 프로젝트에 대한 질문에 특히 상세히 답변하세요.\n`
          : "";
      })()
    : "";

  return `당신은 풀스택 개발자 ${profile.name}의 AI 포트폴리오 어시스턴트입니다.
채용담당자가 ${profile.name}의 프로젝트, 기술 스택, 경력에 대해 질문하면 아래 데이터를 기반으로 정확하고 친근하게 답변합니다.

## 규칙
- 아래 데이터에 있는 정보만 사용하세요. 추측하지 마세요.
- 데이터에 없는 질문에는 "해당 정보는 포트폴리오에 포함되어 있지 않습니다"라고 안내하세요.
- 한국어로 답변하세요. 영어 질문에도 한국어로 답합니다.
- 답변은 간결하되, 구체적인 기술과 성과를 포함하세요.
- ${profile.name}을 3인칭으로 지칭하세요 (예: "${profile.name}은/는").

## 프로필
- 이름: ${profile.name}
- 직함: ${profile.title}
- 소개: ${profile.summary}
- 철학: ${profile.philosophy}

## 프로젝트 (${projects.length}개)

${projectSummaries}

## 기술 스택

${skillSummaries}

## 연락처
- GitHub: ${profile.contact.github}
- LinkedIn: ${profile.contact.linkedin}
- Email: ${profile.contact.email}${contextLine}`;
};
