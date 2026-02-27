import type Database from 'better-sqlite3'
import { publishToWordPress } from '../apis/wordpress.js'
import { updatePostStatus } from '../db.js'
import type { Post, PublishResult, ContentBotConfig } from '../types/index.js'

const PUBLISH_DELAY_MS = 5000

export const publishPost = async (
  config: ContentBotConfig,
  db: Database.Database,
  post: Post,
): Promise<PublishResult> => {
  if (!post.id) {
    return { success: false, url: null, error: 'Post ID 없음' }
  }

  console.log(`[Publisher] 발행 시작: "${post.title}"`)

  const result = await publishToWordPress(config, post.title, post.content)

  try {
    if (result.success) {
      updatePostStatus(db, post.id, 'published', result.url ?? undefined)
      console.log(`[Publisher] 발행 성공: ${result.url}`)
    } else {
      updatePostStatus(db, post.id, 'failed')
      console.error(`[Publisher] 발행 실패: "${post.title}" - ${result.error}`)
    }
  } catch (dbError) {
    const dbMessage =
      dbError instanceof Error ? dbError.message : String(dbError)
    console.error(`[Publisher] DB 상태 업데이트 실패: ${dbMessage}`)
  }

  return result
}

export const publishPosts = async (
  config: ContentBotConfig,
  db: Database.Database,
  posts: Post[],
): Promise<PublishResult[]> => {
  console.log(`[Publisher] ${posts.length}개 글 발행 시작`)

  let results: PublishResult[] = []

  for (const [index, post] of posts.entries()) {
    const result = await publishPost(config, db, post)
    results = [...results, result]

    // 발행 간 딜레이 (rate limit 방지)
    if (index < posts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, PUBLISH_DELAY_MS))
    }
  }

  const successCount = results.filter((r) => r.success).length
  console.log(`[Publisher] 발행 완료: 성공 ${successCount}/${results.length}개`)

  return results
}
