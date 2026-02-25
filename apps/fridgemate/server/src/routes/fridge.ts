import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { groupAdmin } from '../middleware/group-admin.js'
import { COMPARTMENT_PRESETS, getExpiryStatus, ExpiryStatus, CompartmentType } from '../types/index.js'
import type { FridgeType, CompartmentPreset } from '../types/index.js'
import type { CompartmentType as PrismaCompartmentType } from '../generated/prisma/index.js'

const VALID_COMPARTMENT_TYPES: Set<string> = new Set(Object.values(CompartmentType))
const MAX_COMPARTMENTS = 50

const validateCompartments = (items: unknown[]): items is CompartmentPreset[] => {
  if (items.length > MAX_COMPARTMENTS) return false
  return items.every(
    (c: unknown) => {
      if (typeof c !== 'object' || c === null) return false
      const obj = c as Record<string, unknown>
      return (
        typeof obj['type'] === 'string' && VALID_COMPARTMENT_TYPES.has(obj['type']) &&
        typeof obj['label'] === 'string' && obj['label'].length > 0 && obj['label'].length <= 50 &&
        typeof obj['position'] === 'number' && Number.isInteger(obj['position']) && obj['position'] >= 0
      )
    },
  )
}

export const fridgeRouter: RouterType = Router()

// GET /api/fridges — 그룹의 냉장고 목록
fridgeRouter.get('/', async (req, res: Response): Promise<void> => {
  const { groupId } = req as AuthRequest

  try {
    const fridges = await prisma.fridge.findMany({
      where: { groupId },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
          include: {
            foodItems: { select: { id: true, name: true, expiryDate: true } },
          },
        },
      },
    })

    const result = fridges.map((f) => ({
      id: f.id,
      groupId: f.groupId,
      type: f.type,
      name: f.name,
      compartments: f.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: c.foodItems.length,
        hasExpiringItems: c.foodItems.some((item) => {
          const status = getExpiryStatus(item.expiryDate)
          return status !== ExpiryStatus.SAFE
        }),
        foodItems: c.foodItems.map((fi) => ({ id: fi.id, name: fi.name, expiryDate: fi.expiryDate })),
      })),
    }))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch fridges' })
  }
})

// GET /api/fridges/:id — 냉장고 상세
fridgeRouter.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const fridge = await prisma.fridge.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
          include: {
            foodItems: { select: { id: true, name: true, expiryDate: true } },
          },
        },
      },
    })

    if (!fridge) {
      res.status(404).json({ error: 'Fridge not found' })
      return
    }

    res.json({
      id: fridge.id,
      groupId: fridge.groupId,
      type: fridge.type,
      name: fridge.name,
      compartments: fridge.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: c.foodItems.length,
        hasExpiringItems: c.foodItems.some((item) => {
          const status = getExpiryStatus(item.expiryDate)
          return status !== ExpiryStatus.SAFE
        }),
        foodItems: c.foodItems.map((fi) => ({ id: fi.id, name: fi.name, expiryDate: fi.expiryDate })),
      })),
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch fridge' })
  }
})

// POST /api/fridges — 냉장고 생성 + 칸 자동생성 (관리자만)
fridgeRouter.post('/', groupAdmin, async (req, res: Response): Promise<void> => {
  const { groupId } = req as AuthRequest
  const { type, name, compartments } = req.body as {
    type?: FridgeType
    name?: string
    compartments?: CompartmentPreset[]
  }

  if (!type || !name) {
    res.status(400).json({ error: 'type and name are required' })
    return
  }

  const presets = COMPARTMENT_PRESETS[type]
  if (!presets) {
    res.status(400).json({ error: 'Invalid fridge type' })
    return
  }

  // 커스텀 compartments 검증
  if (compartments && compartments.length > 0 && !validateCompartments(compartments)) {
    res.status(400).json({ error: '유효하지 않은 칸 데이터입니다' })
    return
  }

  // 커스텀 compartments가 있으면 사용, 없으면 프리셋
  const compartmentData = compartments && compartments.length > 0 ? compartments : presets

  try {
    const fridge = await prisma.fridge.create({
      data: {
        groupId,
        type,
        name,
        compartments: {
          create: compartmentData.map((p) => ({
            type: p.type as PrismaCompartmentType,
            label: p.label,
            position: p.position,
          })),
        },
      },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
        },
      },
    })

    res.status(201).json({
      id: fridge.id,
      groupId: fridge.groupId,
      type: fridge.type,
      name: fridge.name,
      compartments: fridge.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: 0,
        hasExpiringItems: false,
        foodItems: [],
      })),
    })
  } catch {
    res.status(500).json({ error: 'Failed to create fridge' })
  }
})

// PUT /api/fridges/:id — 냉장고 수정 (이름 변경, 관리자만)
fridgeRouter.put('/:id', groupAdmin, async (req, res: Response): Promise<void> => {
  const { name } = req.body as { name?: string }

  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  try {
    const fridge = await prisma.fridge.update({
      where: { id: req.params['id'] as string },
      data: { name },
    })

    res.json({ id: fridge.id, type: fridge.type, name: fridge.name })
  } catch {
    res.status(500).json({ error: 'Failed to update fridge' })
  }
})

// PUT /api/fridges/:id/compartments — 칸 벌크 교체 (관리자만)
fridgeRouter.put('/:id/compartments', groupAdmin, async (req, res: Response): Promise<void> => {
  const { groupId } = req as AuthRequest
  const fridgeId = req.params['id'] as string
  const { compartments } = req.body as {
    compartments?: CompartmentPreset[]
  }

  if (!compartments || compartments.length === 0) {
    res.status(400).json({ error: '최소 1개의 칸이 필요합니다' })
    return
  }

  if (!validateCompartments(compartments)) {
    res.status(400).json({ error: '유효하지 않은 칸 데이터입니다' })
    return
  }

  try {
    // 그룹 소유권 확인
    const targetFridge = await prisma.fridge.findUnique({ where: { id: fridgeId } })
    if (!targetFridge || targetFridge.groupId !== groupId) {
      res.status(404).json({ error: 'Fridge not found' })
      return
    }

    // 기존 칸 중 식재료가 있는 칸 확인
    const existing = await prisma.compartment.findMany({
      where: { fridgeId },
      include: { foodItems: { select: { id: true } } },
    })

    const occupiedIds = existing.filter((c) => c.foodItems.length > 0).map((c) => c.id)
    if (occupiedIds.length > 0) {
      res.status(400).json({
        error: '식재료가 있는 칸이 있습니다. 식재료를 이동한 후 다시 시도해주세요.',
        occupiedCompartmentIds: occupiedIds,
      })
      return
    }

    // 트랜잭션: 기존 칸 삭제 → 새 칸 생성
    const fridge = await prisma.$transaction(async (tx) => {
      await tx.compartment.deleteMany({ where: { fridgeId } })
      return tx.fridge.update({
        where: { id: fridgeId },
        data: {
          compartments: {
            create: compartments.map((c) => ({
              type: c.type as PrismaCompartmentType,
              label: c.label,
              position: c.position,
            })),
          },
        },
        include: {
          compartments: {
            orderBy: { position: 'asc' },
          },
        },
      })
    })

    res.json({
      id: fridge.id,
      groupId: fridge.groupId,
      type: fridge.type,
      name: fridge.name,
      compartments: fridge.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: 0,
        hasExpiringItems: false,
        foodItems: [],
      })),
    })
  } catch {
    res.status(500).json({ error: 'Failed to update compartments' })
  }
})

// DELETE /api/fridges/:id — 냉장고 삭제 (cascade, 관리자만)
fridgeRouter.delete('/:id', groupAdmin, async (req, res: Response): Promise<void> => {
  try {
    await prisma.fridge.delete({ where: { id: req.params['id'] as string } })
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Failed to delete fridge' })
  }
})
