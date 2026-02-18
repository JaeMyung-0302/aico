import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 기존 부화 페이지 → 소환 페이지로 리다이렉트 (하위호환)
export const HatchPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/summon', { replace: true })
  }, [navigate])

  return null
}
