import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

interface GitHubFile {
  path: string
  sha: string
  type: 'file' | 'dir'
  url: string
}

@Injectable()
export class GitHubProvider {
  private readonly logger = new Logger(GitHubProvider.name)
  private readonly baseUrl = 'https://api.github.com'

  testConnection = async (token: string): Promise<boolean> => {
    const res = await axios.get(`${this.baseUrl}/user`, {
      headers: this.getHeaders(token),
    })
    return res.status === 200
  }

  fetchRepoFiles = async (
    token: string,
    owner: string,
    repo: string,
    path = '',
  ): Promise<GitHubFile[]> => {
    const res = await axios.get(
      `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
      { headers: this.getHeaders(token) },
    )

    const items = Array.isArray(res.data) ? res.data : [res.data]
    const docFiles: GitHubFile[] = []

    for (const item of items) {
      if (item.type === 'file' && this.isDocFile(item.name)) {
        docFiles.push({
          path: item.path,
          sha: item.sha,
          type: 'file',
          url: item.html_url,
        })
      } else if (item.type === 'dir') {
        const subFiles = await this.fetchRepoFiles(token, owner, repo, item.path)
        docFiles.push(...subFiles)
      }
    }

    return docFiles
  }

  fetchFileContent = async (
    token: string,
    owner: string,
    repo: string,
    path: string,
  ): Promise<string> => {
    const res = await axios.get(
      `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { ...this.getHeaders(token), Accept: 'application/vnd.github.raw+json' },
      },
    )

    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  }

  private isDocFile = (filename: string): boolean => {
    const docExtensions = ['.md', '.mdx', '.txt', '.rst', '.adoc']
    const lowerName = filename.toLowerCase()
    return docExtensions.some((ext) => lowerName.endsWith(ext))
  }

  private getHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  })
}
