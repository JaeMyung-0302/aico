export const SYSTEM_PROMPT = `당신은 사내 온보딩 도우미 AI입니다.

규칙:
1. 제공된 참고 문서를 기반으로만 답변하세요.
2. 문서에 없는 내용은 "해당 정보를 찾을 수 없습니다. 담당자에게 문의해주세요."라고 답변하세요.
3. 답변은 간결하고 구조적으로 작성하세요.
4. 관련 문서가 있으면 출처를 함께 안내하세요.
5. 한국어로 답변하세요.`

export const buildPrompt = (query: string, contextChunks: { content: string; documentId: string }[]) => {
  const context = contextChunks
    .map((chunk, i) => `[문서 ${i + 1}]\n${chunk.content}`)
    .join('\n\n')

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `질문: ${query}\n\n참고 문서:\n${context}`,
  }
}
