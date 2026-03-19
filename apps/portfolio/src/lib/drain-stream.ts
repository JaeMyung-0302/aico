/**
 * Drains a ReadableStream with RAF-batched flush callbacks.
 * Prevents excessive re-renders during streaming by coalescing
 * chunk updates to at most one per animation frame (~60fps).
 */
export async function drainStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onFlush: (text: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let accumulated = "";
  let rafPending = false;

  const flush = () => {
    rafPending = false;
    onFlush(accumulated);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    accumulated += decoder.decode(value, { stream: true });
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flush);
    }
  }

  // 스트림 종료 후 잔여 텍스트 flush
  flush();
}
