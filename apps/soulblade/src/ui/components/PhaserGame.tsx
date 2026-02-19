import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '@/game/config'

const CONTAINER_ID = 'phaser-game'

export const PhaserGame = () => {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current) return

    const config = createGameConfig(CONTAINER_ID)
    gameRef.current = new Phaser.Game(config)

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return <div id={CONTAINER_ID} style={{ width: '100%', height: '100%' }} />
}
