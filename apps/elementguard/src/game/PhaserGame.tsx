import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from './config'

interface PhaserGameProps {
  scenes: Phaser.Types.Scenes.SceneType[]
  className?: string
}

export const PhaserGame = ({ scenes, className }: PhaserGameProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const config = createGameConfig(containerRef.current, scenes)
    gameRef.current = new Phaser.Game(config)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
