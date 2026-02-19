import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { MapId, NpcType, PassiveSkillId } from '@soulblade/shared'
import { PhaserGame } from '@/ui/components/PhaserGame'
import { VirtualJoystick } from '@/ui/components/VirtualJoystick'
import { HUD } from '@/ui/components/HUD'
import { StatAllocation } from '@/ui/components/StatAllocation'
import { ActiveSkillButton } from '@/ui/components/ActiveSkillButton'
import { PortalModal } from '@/ui/components/PortalModal'
import { NpcShopModal } from '@/ui/components/NpcShopModal'
import { NpcForgeModal } from '@/ui/components/NpcForgeModal'
import { DeathModal } from '@/ui/components/DeathModal'
import { InventoryPanel } from '@/ui/components/InventoryPanel'
import { SkillPanel } from '@/ui/components/SkillPanel'
import { StatPanel } from '@/ui/components/StatPanel'
import { useRunStore } from '@/stores/useRunStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { eventBus } from '@/lib/event-bus'
import styles from './GamePage.module.scss'

const cx = classnames.bind(styles)

type PanelType = 'inventory' | 'skill' | 'stat' | null

interface FullStats {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
  level: number
  gold: number
  passiveSkills: ReadonlyArray<{ id: PassiveSkillId; level: number }>
}

export const GamePage = () => {
  const navigate = useNavigate()
  const classType = useRunStore((s) => s.classType)
  const updatePlayerStats = useRunStore((s) => s.updatePlayerStats)
  const updateKillCount = useRunStore((s) => s.updateKillCount)
  const updateTimer = useRunStore((s) => s.updateTimer)
  const saveGame = useSaveStore((s) => s.save)

  const [statPointData, setStatPointData] = useState<{ level: number; statPoints: number } | null>(null)
  const [portalData, setPortalData] = useState<{
    targetMapId: MapId
    label: string
    recommendedLevel: number
  } | null>(null)
  const [npcType, setNpcType] = useState<NpcType | null>(null)
  const [gold, setGold] = useState(0)
  const [isDead, setIsDead] = useState(false)
  const [openPanel, setOpenPanel] = useState<PanelType>(null)
  const [fullStats, setFullStats] = useState<FullStats | null>(null)

  const handleStatClose = useCallback(() => {
    setStatPointData(null)
    eventBus.emit('game:resume')
  }, [])

  const handlePortalClose = useCallback(() => {
    setPortalData(null)
  }, [])

  const handleNpcClose = useCallback(() => {
    setNpcType(null)
  }, [])

  const handleDeathReturn = useCallback(() => {
    setIsDead(false)
  }, [])

  // 화살표키 이동 + A키 공격 + I/K/S 패널 토글
  useEffect(() => {
    const MOVE_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
    const pressed = new Set<string>()

    const emitJoystick = () => {
      let x = 0
      let y = 0
      if (pressed.has('ArrowLeft')) x -= 1
      if (pressed.has('ArrowRight')) x += 1
      if (pressed.has('ArrowUp')) y -= 1
      if (pressed.has('ArrowDown')) y += 1

      if (x !== 0 && y !== 0) {
        x /= Math.SQRT2
        y /= Math.SQRT2
      }

      eventBus.emit('input:joystick', { x, y })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (MOVE_CODES.has(e.code)) {
        e.preventDefault()
        pressed.add(e.code)
        emitJoystick()
      }
      // A키 공격
      if (e.code === 'KeyA') {
        e.preventDefault()
        eventBus.emit('input:attack')
      }
      // I키: 인벤토리 토글
      if (e.code === 'KeyI') {
        e.preventDefault()
        setOpenPanel((prev) => {
          if (prev === 'inventory') return null
          eventBus.emit('ui:requestStats')
          return 'inventory'
        })
      }
      // K키: 스킬 토글
      if (e.code === 'KeyK') {
        e.preventDefault()
        setOpenPanel((prev) => {
          if (prev === 'skill') return null
          eventBus.emit('ui:requestStats')
          return 'skill'
        })
      }
      // S키: 스탯 토글 (Shift+S 제외)
      if (e.code === 'KeyS' && !e.shiftKey) {
        e.preventDefault()
        setOpenPanel((prev) => {
          if (prev === 'stat') return null
          eventBus.emit('ui:requestStats')
          return 'stat'
        })
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (MOVE_CODES.has(e.code)) {
        pressed.delete(e.code)
        emitJoystick()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    // 레벨업 → 스탯 배분 모달 표시 + 게임 일시정지
    const onLevelUp = (data: { level: number; statPoints: number }) => {
      setStatPointData(data)
      setOpenPanel(null) // 패널 닫기
      eventBus.emit('game:pause')
    }

    // 사망 → DeathModal 표시
    const onDeath = () => {
      setIsDead(true)
      setOpenPanel(null)
      eventBus.emit('game:pause')
    }

    // 스탯 동기화
    const onStatsUpdate = (data: {
      hp: number
      maxHp: number
      level: number
      exp: number
      expToNext: number
    }) => {
      updatePlayerStats(data)
    }

    // 킬카운트 동기화
    const onKillCount = (data: { count: number }) => {
      updateKillCount(data.count)
    }

    // 타이머 동기화
    const onTimer = (data: { seconds: number }) => {
      updateTimer(data.seconds)
    }

    // 포탈 진입 → 모달 표시 + 게임 일시정지
    const onPortalEnter = (data: {
      portalId: string
      targetMapId: MapId
      targetSpawnPoint: { x: number; y: number }
      recommendedLevel: number
      label: string
    }) => {
      setPortalData({
        targetMapId: data.targetMapId,
        label: data.label,
        recommendedLevel: data.recommendedLevel,
      })
      setOpenPanel(null)
      eventBus.emit('game:pause')
    }

    // NPC 인터랙션 → 모달 표시 + 게임 일시정지
    const onNpcInteract = (data: { npcId: string; npcType: NpcType; label: string }) => {
      setNpcType(data.npcType)
      setOpenPanel(null)
      eventBus.emit('game:pause')
    }

    // 골드 동기화
    const onGoldUpdate = (data: { gold: number }) => {
      setGold(data.gold)
    }

    // 전체 스탯 수신 (패널용)
    const onFullStats = (data: FullStats) => {
      setFullStats(data)
    }

    // 저장 요청
    const onSaveRequest = () => {
      saveGame()
    }

    eventBus.on('player:levelup', onLevelUp)
    eventBus.on('player:death', onDeath)
    eventBus.on('player:statsUpdate', onStatsUpdate)
    eventBus.on('hud:killCount', onKillCount)
    eventBus.on('hud:timer', onTimer)
    eventBus.on('portal:enter', onPortalEnter)
    eventBus.on('npc:interact', onNpcInteract)
    eventBus.on('hud:gold', onGoldUpdate)
    eventBus.on('player:fullStats', onFullStats)
    eventBus.on('save:request', onSaveRequest)

    return () => {
      eventBus.off('player:levelup', onLevelUp)
      eventBus.off('player:death', onDeath)
      eventBus.off('player:statsUpdate', onStatsUpdate)
      eventBus.off('hud:killCount', onKillCount)
      eventBus.off('hud:timer', onTimer)
      eventBus.off('portal:enter', onPortalEnter)
      eventBus.off('npc:interact', onNpcInteract)
      eventBus.off('hud:gold', onGoldUpdate)
      eventBus.off('player:fullStats', onFullStats)
      eventBus.off('save:request', onSaveRequest)
    }
  }, [navigate, updatePlayerStats, updateKillCount, updateTimer, saveGame])

  return (
    <div className={cx('gamePage')}>
      <PhaserGame />
      <HUD />
      <VirtualJoystick />
      {classType && <ActiveSkillButton classType={classType} />}
      {statPointData && (
        <StatAllocation
          level={statPointData.level}
          statPoints={statPointData.statPoints}
          onClose={handleStatClose}
        />
      )}
      {portalData && (
        <PortalModal
          targetMapId={portalData.targetMapId}
          label={portalData.label}
          recommendedLevel={portalData.recommendedLevel}
          onClose={handlePortalClose}
        />
      )}
      {npcType === 'shop' && (
        <NpcShopModal gold={gold} onClose={handleNpcClose} />
      )}
      {npcType === 'blacksmith' && (
        <NpcForgeModal gold={gold} onClose={handleNpcClose} />
      )}
      {isDead && (
        <DeathModal onReturnToTown={handleDeathReturn} />
      )}
      {openPanel === 'inventory' && fullStats && (
        <InventoryPanel onClose={() => setOpenPanel(null)} />
      )}
      {openPanel === 'skill' && fullStats && (
        <SkillPanel skills={fullStats.passiveSkills} onClose={() => setOpenPanel(null)} />
      )}
      {openPanel === 'stat' && fullStats && (
        <StatPanel stats={fullStats} onClose={() => setOpenPanel(null)} />
      )}
    </div>
  )
}
