import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

interface NotionPage {
  id: string
  title: string
  lastEditedTime: string
  url: string
}

interface NotionBlock {
  type: string
  [key: string]: unknown
}

@Injectable()
export class NotionProvider {
  private readonly logger = new Logger(NotionProvider.name)
  private readonly baseUrl = 'https://api.notion.com/v1'
  private readonly notionVersion = '2022-06-28'

  testConnection = async (token: string): Promise<boolean> => {
    const res = await axios.get(`${this.baseUrl}/users/me`, {
      headers: this.getHeaders(token),
    })
    return res.status === 200
  }

  fetchPages = async (token: string): Promise<NotionPage[]> => {
    const pages: NotionPage[] = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const res = await axios.post(
        `${this.baseUrl}/search`,
        {
          filter: { property: 'object', value: 'page' },
          page_size: 100,
          ...(startCursor ? { start_cursor: startCursor } : {}),
        },
        { headers: this.getHeaders(token) },
      )

      for (const page of res.data.results) {
        const titleProp = Object.values(page.properties || {}).find(
          (p: unknown) => (p as Record<string, unknown>).type === 'title',
        ) as Record<string, unknown> | undefined

        const titleArr = (titleProp as Record<string, unknown>)?.title as Array<{ plain_text: string }> | undefined
        const title = titleArr?.map((t) => t.plain_text).join('') || 'Untitled'

        pages.push({
          id: page.id,
          title,
          lastEditedTime: page.last_edited_time,
          url: page.url,
        })
      }

      hasMore = res.data.has_more
      startCursor = res.data.next_cursor
    }

    return pages
  }

  fetchPageContent = async (token: string, pageId: string): Promise<string> => {
    const blocks = await this.fetchBlocks(token, pageId)
    return this.blocksToText(blocks)
  }

  private fetchBlocks = async (token: string, blockId: string): Promise<NotionBlock[]> => {
    const blocks: NotionBlock[] = []
    let hasMore = true
    let startCursor: string | undefined

    while (hasMore) {
      const res = await axios.get(
        `${this.baseUrl}/blocks/${blockId}/children`,
        {
          headers: this.getHeaders(token),
          params: { page_size: 100, ...(startCursor ? { start_cursor: startCursor } : {}) },
        },
      )

      blocks.push(...res.data.results)
      hasMore = res.data.has_more
      startCursor = res.data.next_cursor
    }

    return blocks
  }

  private blocksToText = (blocks: NotionBlock[]): string => {
    return blocks
      .map((block) => {
        const type = block.type as string
        const content = block[type] as Record<string, unknown> | undefined
        if (!content) return ''

        const richText = content.rich_text as Array<{ plain_text: string }> | undefined
        if (richText) {
          return richText.map((t) => t.plain_text).join('')
        }

        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  private getHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Notion-Version': this.notionVersion,
    'Content-Type': 'application/json',
  })
}
