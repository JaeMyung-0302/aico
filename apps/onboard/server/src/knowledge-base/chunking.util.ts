const DEFAULT_CHUNK_SIZE = 500
const DEFAULT_OVERLAP = 50

export const splitIntoChunks = (
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): string[] => {
  if (!text || text.trim().length === 0) return []

  const sentences = text.split(/(?<=[.!?\n])\s+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())

      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.ceil(overlap / 5))
      currentChunk = overlapWords.join(' ') + ' ' + sentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
