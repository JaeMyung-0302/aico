import { useState } from 'react'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import FeedbackFormModal from '@/components/FeedbackFormModal/FeedbackFormModal'
import styles from './FeedbackButton.module.scss'

const cx = classnames.bind(styles)

const FeedbackButton = () => {
  const { user } = useAuthStore()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleClick = () => {
    if (!user) {
      alert('피드백을 보내려면 로그인이 필요합니다.')
      return
    }
    setIsFormOpen(true)
  }

  return (
    <>
      {!isFormOpen && (
        <button className={cx('feedbackButton')} onClick={handleClick}>
          <span className={cx('icon')}>&#128172;</span>
          <span className={cx('label')}>피드백</span>
        </button>
      )}
      {isFormOpen && <FeedbackFormModal onClose={() => setIsFormOpen(false)} />}
    </>
  )
}

export default FeedbackButton
