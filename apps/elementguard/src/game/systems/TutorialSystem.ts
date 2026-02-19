import Phaser from 'phaser'
import { TutorialOverlay } from '@/game/systems/TutorialOverlay'
import { eventBus } from '@/lib/event-bus'

// 튜토리얼 단계 정의
interface TutorialStep {
  wave: number
  trigger: 'wave-start' | 'first-summon' | 'first-merge' | 'first-fusion' | 'artifact-wave'
  message: string
  highlight?: 'summon-button' | 'wave-button' | 'grid' | 'unit'
  autoAdvance?: boolean
}

const TUTORIAL_STEPS: TutorialStep[] = [
  { wave: 0, trigger: 'wave-start', message: '소환 버튼을 눌러\n유닛을 배치하세요!', highlight: 'summon-button' },
  { wave: 0, trigger: 'first-summon', message: 'Wave 시작 버튼을 눌러\n전투를 시작하세요!', highlight: 'wave-button' },
  { wave: 1, trigger: 'wave-start', message: '같은 등급 유닛을 겹치면\n합치기로 강화됩니다!', highlight: 'grid' },
  { wave: 3, trigger: 'wave-start', message: '속성 상성을 활용하세요!\n🔥→💨→⚡→🪨→💧→🔥', autoAdvance: true },
  { wave: 5, trigger: 'artifact-wave', message: '유물을 선택하세요!\n게임을 유리하게 만들어줍니다.', autoAdvance: true },
  { wave: 7, trigger: 'wave-start', message: '같은 속성 3개를 인접 배치하면\n시너지 보너스를 받습니다!', autoAdvance: true },
  { wave: 9, trigger: 'wave-start', message: '★4 이상 다른 속성을 합치면\n융합 유닛이 탄생할 수 있습니다!', autoAdvance: true },
]

const STORAGE_KEY = 'eg-tutorial-done'

export class TutorialSystem {
  private scene: Phaser.Scene
  private overlay: TutorialOverlay
  private currentStepIndex = 0
  private isActive = false
  private listenersAttached = false
  private completedTriggers = new Set<string>()
  private autoAdvanceTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.overlay = new TutorialOverlay(scene)

    // 이미 튜토리얼 완료했으면 스킵
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      this.isActive = false
      return
    }

    this.isActive = true
    this.setupListeners()
    this.listenersAttached = true
    // 첫 안내 즉시 표시
    this.showCurrentStep()
  }

  private setupListeners() {
    eventBus.on('unit-summoned', this.onUnitSummoned)
    eventBus.on('merge-success', this.onMergeSuccess)
    eventBus.on('fusion-success', this.onFusionSuccess)
    eventBus.on('wave-complete', this.onWaveComplete)
    eventBus.on('show-artifact-selection', this.onArtifactWave)
  }

  private onUnitSummoned = () => {
    if (!this.isActive) return
    this.tryAdvance('first-summon')
  }

  private onMergeSuccess = () => {
    if (!this.isActive) return
    this.tryAdvance('first-merge')
  }

  private onFusionSuccess = () => {
    if (!this.isActive) return
    this.tryAdvance('first-fusion')
  }

  private onWaveComplete = (...args: unknown[]) => {
    if (!this.isActive) return
    const wave = args[0] as number
    this.checkWaveTrigger(wave + 1) // 다음 웨이브의 안내 표시
  }

  private onArtifactWave = () => {
    if (!this.isActive) return
    this.tryAdvance('artifact-wave')
  }

  private checkWaveTrigger(nextWave: number) {
    const step = TUTORIAL_STEPS[this.currentStepIndex]
    if (!step) return
    if (step.trigger === 'wave-start' && step.wave <= nextWave) {
      this.showCurrentStep()
    }
  }

  private tryAdvance(trigger: string) {
    if (this.completedTriggers.has(trigger)) return
    const step = TUTORIAL_STEPS[this.currentStepIndex]
    if (!step || step.trigger !== trigger) return

    this.completedTriggers.add(trigger)
    this.currentStepIndex++

    if (this.currentStepIndex >= TUTORIAL_STEPS.length) {
      this.complete()
      return
    }

    this.showCurrentStep()
  }

  private showCurrentStep() {
    const step = TUTORIAL_STEPS[this.currentStepIndex]
    if (!step) return

    this.overlay.show(step.message, step.highlight)

    if (step.autoAdvance) {
      this.autoAdvanceTimer?.destroy()
      this.autoAdvanceTimer = this.scene.time.delayedCall(3000, () => {
        this.overlay.hide()
        this.currentStepIndex++
        if (this.currentStepIndex >= TUTORIAL_STEPS.length) {
          this.complete()
        }
      })
    }
  }

  dismissCurrent() {
    this.autoAdvanceTimer?.destroy()
    this.overlay.hide()
  }

  private removeListeners() {
    if (!this.listenersAttached) return
    eventBus.off('unit-summoned', this.onUnitSummoned)
    eventBus.off('merge-success', this.onMergeSuccess)
    eventBus.off('fusion-success', this.onFusionSuccess)
    eventBus.off('wave-complete', this.onWaveComplete)
    eventBus.off('show-artifact-selection', this.onArtifactWave)
    this.listenersAttached = false
  }

  private complete() {
    this.isActive = false
    this.autoAdvanceTimer?.destroy()
    this.overlay.hide()
    this.removeListeners()
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  destroy() {
    this.autoAdvanceTimer?.destroy()
    this.removeListeners()
    this.overlay.destroy()
  }
}
