import { IsString, IsUrl, Matches } from 'class-validator'

export class AnalyzeRecipeDto {
  @IsString()
  @IsUrl()
  @Matches(
    /^https?:\/\/(www\.)?(instagram\.com\/(reels?|p)\/|tiktok\.com\/|vm\.tiktok\.com\/|youtube\.com\/(shorts|watch)|youtu\.be\/)/,
    { message: 'Instagram, TikTok, YouTube URL만 지원합니다.' },
  )
  url!: string
}
