import { useLocalSearchParams } from 'expo-router'
import PostDetailScreen from '@/modules/posts/feature-post-detail/PostDetailScreen'

// 디자인 05 게시물 상세 + 댓글
const PostDetailRoute = () => {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  return <PostDetailScreen postId={postId} />
}

export default PostDetailRoute
