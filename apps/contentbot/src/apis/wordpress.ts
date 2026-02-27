import axios from 'axios'
import type { ContentBotConfig, PublishResult } from '../types/index.js'

interface WordPressPostResponse {
  ID: number
  URL: string
}

export const publishToWordPress = async (
  config: ContentBotConfig,
  title: string,
  content: string,
): Promise<PublishResult> => {
  try {
    const siteId = encodeURIComponent(config.wordpress.siteId)
    const response = await axios.post<WordPressPostResponse>(
      `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`,
      { title, content, status: 'publish', format: 'standard' },
      {
        headers: {
          Authorization: `Bearer ${config.wordpress.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    )

    return {
      success: true,
      url: response.data.URL,
      error: null,
    }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? `HTTP ${error.response?.status ?? 'unknown'}: ${
          (error.response?.data as Record<string, unknown>)?.message ??
          error.response?.statusText ??
          error.code
        }`
      : error instanceof Error
        ? error.message
        : String(error)
    console.error(`[WordPress] Publish error: ${message}`)
    return {
      success: false,
      url: null,
      error: message,
    }
  }
}
