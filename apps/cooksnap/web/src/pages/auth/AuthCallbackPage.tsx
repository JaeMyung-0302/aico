import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const setTokenAndFetchUser = useAuthStore((s) => s.setTokenAndFetchUser)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      setTokenAndFetchUser(token)
        .then(() => navigate('/', { replace: true }))
        .catch(() => navigate('/auth', { replace: true }))
    } else {
      navigate('/auth', { replace: true })
    }
  }, [navigate, setTokenAndFetchUser])

  return <div>로그인 중...</div>
}

export default AuthCallbackPage
