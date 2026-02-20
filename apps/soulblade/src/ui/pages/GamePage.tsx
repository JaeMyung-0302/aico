import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { MapId, NpcType, PassiveSkillId, StageId, StatAllocationData } from '@soulblade/shared'
import { PhaserGame } from '@/ui/components/PhaserGame'
import { VirtualJoystick } from '@/ui/components/VirtualJoystick'
import { HUD } from '@/ui/components/HUD'
import { ActiveSkillButton } from '@/ui/components/ActiveSkillButton'
import { PortalModal } from '@/ui/components/PortalModal'
import { NpcShopModal } from '@/ui/components/NpcShopModal'
import { NpcForgeModal } from '@/ui/components/NpcForgeModal'
import { DeathModal } from '@/ui/components/DeathModal'
import { BottomTabBar } from '@/ui/components/BottomTabBar'
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
  const saveLoaded = useSaveStore((s) => s.loaded)

  const [pendingStatPoints, setPendingStatPoints] = useState(0)
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

  const handleStatAllocate = useCallback((allocation: StatAllocationData) => {
    const usedPoints = Object.values(allocation).reduce((sum, v) => sum + v, 0)
    if (usedPoints <= 0) return
    eventBus.emit('stat:allocate', allocation)
    setPendingStatPoints((prev) => Math.max(0, prev - usedPoints))
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

  const handleTabPress = useCallback((panel: 'inventory' | 'skill' | 'stat') => {
    setOpenPanel((prev) => {
      if (prev === panel) return null
      eventBus.emit('ui:requestStats')
      return panel
    })
  }, [])

  // 페이지 종료/새로고침 시 자동 저장
  useEffect(() => {
    const onBeforeUnload = () => {
      saveGame()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [saveGame])

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
    // 레벨업 → 포인트 누적 (게임 일시정지 없음)
    const onLevelUp = (data: { level: number; statPoints: number }) => {
      setPendingStatPoints((prev) => prev + data.statPoints)
    }

    // 사망 → DeathModal 표시
    const onDeath = () => {
      setIsDead(true)
      setOpenPanel(null)
      eventBus.emit('game:pause')
    }

    // 스탯 동기화 (UI + 영속 스토어) + 레벨업 시 자동 저장
    const onStatsUpdate = (data: {
      hp: number
      maxHp: number
      atk: number
      def: number
      spd: number
      crit: number
      critDmg: number
      level: number
      exp: number
      expToNext: number
    }) => {
      updatePlayerStats(data)
      const prevLevel = useSaveStore.getState().characterLevel
      useSaveStore.setState({
        characterLevel: data.level,
        characterExp: data.exp,
        characterStats: {
          hp: data.maxHp,
          atk: data.atk,
          def: data.def,
          spd: data.spd,
          crit: data.crit,
          critDmg: data.critDmg,
        },
      })
      // 레벨 변경 감지 시 즉시 저장 (statsUpdate 이후이므로 최신 데이터 보장)
      if (data.level > prevLevel) {
        saveGame()
      }
    }

    // 킬카운트 동기화
    const onKillCount = (data: { count: number }) => {
      updateKillCount(data.count)
    }

    // 타이머 동기화
    const onTimer = (data: { seconds: number }) => {
      updateTimer(data.seconds)
    }

    // 포탈 진입 → 모달 표시 + 게임 일시정지 + 맵/위치 영속화
    const onPortalEnter = (data: {
      portalId: string
      targetMapId: MapId
      targetSpawnPoint: { x: number; y: number }
      recommendedLevel: number
      label: string
    }) => {
      useSaveStore.setState({
        currentMapId: data.targetMapId,
        position: data.targetSpawnPoint,
      })
      // 사냥터 진입 시 stageId 설정 (보상 계산용)
      if (data.targetMapId !== 'town') {
        useRunStore.setState({ stageId: data.targetMapId as StageId })
      }
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

    // 골드 동기화 (UI + 영속 스토어)
    const onGoldUpdate = (data: { gold: number }) => {
      setGold(data.gold)
      useSaveStore.setState({ gold: data.gold })
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

  // 세이브 데이터 로드 완료 전까지 PhaserGame 렌더링 차단 (Race Condition 방지)
  if (!saveLoaded) {
    return <div className={cx('gamePage')} />
  }

  return (
    <div className={cx('gamePage')}>
      <PhaserGame />
      <HUD />
      {!openPanel && <VirtualJoystick />}
      {!openPanel && classType && <ActiveSkillButton classType={classType} />}
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
      <BottomTabBar
        openPanel={openPanel}
        onTabPress={handleTabPress}
        onClose={() => setOpenPanel(null)}
        fullStats={fullStats}
        pendingStatPoints={pendingStatPoints}
        onStatAllocate={handleStatAllocate}
      />
    </div>
  )
}
