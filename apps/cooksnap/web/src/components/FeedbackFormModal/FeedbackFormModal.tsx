import { useState } from 'react'
import classnames from 'classnames/bind'
import api from '@/lib/api'
import { FeedbackCategory } from '@/types/feedback'
import styles from './FeedbackFormModal.module.scss'

const cx = classnames.bind(styles)

interface FeedbackFormModalProps {
  onClose: () => void
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  [FeedbackCategory.BUG]: '버그 신고',
  [FeedbackCategory.FEATURE_REQUEST]: '기능 요청',
  [FeedbackCategory.IMPROVEMENT]: '개선 사항',
  [FeedbackCategory.OTHER]: '기타',
}

const FeedbackFormModal = ({ onClose }: FeedbackFormModalProps) => {
  const [category, setCategory] = useState<FeedbackCategory>(
    FeedbackCategory.IMPROVEMENT,
  )
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const isValid = content.length >= 10 && content.length <= 1000

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await api.post('/feedback', { category, content })
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('피드백 전송에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeButton')} onClick={onClose}>
          &times;
        </button>

        {isSuccess ? (
          <div className={cx('successMessage')}>
            <div className={cx('successIcon')}>&#10003;</div>
            <p className={cx('successText')}>피드백이 전송되었습니다!</p>
            <p className={cx('successSubText')}>소중한 의견 감사합니다.</p>
          </div>
        ) : (
          <>
            <h2 className={cx('title')}>피드백 보내기</h2>

            <div className={cx('categoryChips')}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={cx('chip', { active: category === key })}
                  onClick={() => setCategory(key as FeedbackCategory)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={cx('textareaWrapper')}>
              <textarea
                className={cx('textarea')}
                placeholder="어떤 점을 개선하면 좋을까요? (최소 10자)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1000}
                rows={5}
              />
              <span
                className={cx('charCounter', { warning: content.length > 900 })}
              >
                {content.length}/1000
              </span>
            </div>

            {error && <p className={cx('error')}>{error}</p>}

            <button
              className={cx('submitButton')}
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? '전송 중...' : '피드백 보내기'}
            </button>

            <p className={cx('disclaimer')}>
              개인정보를 포함하지 마세요. 피드백은 서비스 개선에만 활용됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackFormModal
