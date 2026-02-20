import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './Router'
import { socket } from '@/lib/socket'
import { useGameStore } from '@/stores/useGameStore'
import InstallBanner from '@/components/InstallBanner'

const App = () => {
  useEffect(() => {
    socket.connect()

    socket.on('connect', () => {
      const id = socket.id
      if (id) {
        const state = useGameStore.getState()
        if (state.roomCode) {
          state.reset()
        }
        state.setMyPlayerId(id)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <InstallBanner />
    </>
  )
}

export default App
