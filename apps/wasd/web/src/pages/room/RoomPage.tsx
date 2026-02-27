import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { socket } from '@/lib/socket'
import { useGameStore } from '@/stores/useGameStore'
import { SocketEvents, MIN_PLAYERS } from '@wasd/shared'
import type { Room, KeyAssignment } from '@wasd/shared'
import { sound, initAudio } from '@/game/sound'
import PlayerList from './components/PlayerList'
import InviteCode from './components/InviteCode'
import styles from './RoomPage.module.scss'

const cx = classNames.bind(styles)

const COUNTDOWN_SECONDS = 3

const RoomPage = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { players, isHost, roomCode } = useGameStore()
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!roomCode) {
      navigate('/')
      return
    }

    const handleRoomUpdated = (room: Room) => {
      useGameStore.getState().updateRoom(room)
    }

    const handleGameStarted = ({
      room,
      assignments,
    }: {
      room: Room
      assignments: KeyAssignment[]
    }) => {
      const state = useGameStore.getState()
      state.updateRoom(room)
      const myAssignment = assignments.find(
        (a) => a.playerId === state.myPlayerId,
      )
      if (myAssignment) {
        state.setMyKeys(myAssignment.keys)
      }

      setCountdown(COUNTDOWN_SECONDS)
      sound.countdown()

      let remaining = COUNTDOWN_SECONDS - 1
      countdownRef.current = setInterval(() => {
        if (remaining > 0) {
          setCountdown(remaining)
          sound.countdown()
          remaining--
        } else {
          if (countdownRef.current) clearInterval(countdownRef.current)
          countdownRef.current = null
          sound.countdownGo()
          navigate(`/game/${room.code}`)
        }
      }, 1000)
    }

    socket.on(SocketEvents.ROOM_UPDATED, handleRoomUpdated)
    socket.on(SocketEvents.GAME_STARTED, handleGameStarted)

    return () => {
      socket.off(SocketEvents.ROOM_UPDATED, handleRoomUpdated)
      socket.off(SocketEvents.GAME_STARTED, handleGameStarted)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [navigate, roomCode])

  const handleStartGame = () => {
    initAudio()
    socket.emit(SocketEvents.START_GAME)
  }

  const handleLeaveRoom = () => {
    socket.emit(SocketEvents.LEAVE_ROOM)
    useGameStore.getState().reset()
    navigate('/')
  }

  if (!roomCode) return null

  return (
    <div className={cx('container')}>
      <h1 className={cx('title')}>대기실</h1>

      {code && <InviteCode code={code} />}

      <PlayerList players={players} />

      <div className={cx('actions')}>
        {isHost && (
          <button
            className={cx('startButton')}
            onClick={handleStartGame}
            disabled={players.length < MIN_PLAYERS || countdown !== null}
          >
            게임 시작 ({players.length}명)
          </button>
        )}

        <button className={cx('leaveButton')} onClick={handleLeaveRoom}>
          나가기
        </button>
      </div>

      {countdown !== null && (
        <div className={cx('countdownOverlay')}>
          <span key={countdown} className={cx('countdownNumber')}>
            {countdown}
          </span>
        </div>
      )}
    </div>
  )
}

export default RoomPage
