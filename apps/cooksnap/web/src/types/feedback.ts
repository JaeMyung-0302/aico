export enum FeedbackCategory {
  BUG = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  IMPROVEMENT = 'IMPROVEMENT',
  OTHER = 'OTHER',
}

export enum FeedbackStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
}

export interface Feedback {
  id: string
  userId: string
  category: FeedbackCategory
  content: string
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
  user?: {
    email: string
    nickname: string | null
  }
}

export interface FeedbackListResponse {
  data: Feedback[]
  total: number
  page: number
  limit: number
}

export interface CreateFeedbackRequest {
  category: FeedbackCategory
  content: string
}

export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus
}
