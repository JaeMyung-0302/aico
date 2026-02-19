import { useCallback, useRef, useState } from 'react'
import classnames from 'classnames/bind'
import { eventBus } from '@/lib/event-bus'
import styles from './VirtualJoystick.module.scss'

const cx = classnames.bind(styles)

const JOYSTICK_RADIUS = 50
const KNOB_RADIUS = 20

export const VirtualJoystick = () => {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const touchIdRef = useRef<number | null>(null)
  const mouseDownRef = useRef(false)

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return

    const rect = base.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    let dx = clientX - centerX
    let dy = clientY - centerY

    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > JOYSTICK_RADIUS) {
      dx = (dx / distance) * JOYSTICK_RADIUS
      dy = (dy / distance) * JOYSTICK_RADIUS
    }

    setKnobPos({ x: dx, y: dy })

    // 정규화된 값 전달 (-1 ~ 1)
    eventBus.emit('input:joystick', {
      x: dx / JOYSTICK_RADIUS,
      y: dy / JOYSTICK_RADIUS,
    })
  }, [])

  const handleEnd = useCallback(() => {
    setActive(false)
    setKnobPos({ x: 0, y: 0 })
    touchIdRef.current = null
    mouseDownRef.current = false
    eventBus.emit('input:joystick', { x: 0, y: 0 })
  }, [])

  // --- 터치 이벤트 (모바일) ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return
    const touch = e.changedTouches[0]
    if (!touch) return
    touchIdRef.current = touch.identifier
    setActive(true)
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch && touch.identifier === touchIdRef.current) {
        handleMove(touch.clientX, touch.clientY)
        break
      }
    }
  }, [handleMove])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch && touch.identifier === touchIdRef.current) {
        handleEnd()
        break
      }
    }
  }, [handleEnd])

  // --- 마우스 이벤트 (데스크톱) ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownRef.current = true
    setActive(true)
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDownRef.current) return
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const onMouseUp = useCallback(() => {
    if (!mouseDownRef.current) return
    handleEnd()
  }, [handleEnd])

  const onMouseLeave = useCallback(() => {
    if (!mouseDownRef.current) return
    handleEnd()
  }, [handleEnd])

  return (
    <div
      ref={baseRef}
      className={cx('joystickBase', { active })}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cx('joystickKnob')}
        style={{
          transform: `translate(${knobPos.x - KNOB_RADIUS}px, ${knobPos.y - KNOB_RADIUS}px)`,
        }}
      />
    </div>
  )
}
