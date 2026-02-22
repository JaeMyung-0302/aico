import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest, AuthRequestOptionalGroup } from '../middleware/auth.js'
import { sendPushToUser } from '../services/push-notification.js'

export const joinRequestRouter: RouterType = Router()

// GET /api/join-requests/pending — 관리자용 대기 요청 목록
joinRequestRouter.get('/pending', async (req: Request, res: Response): Promise<void> => {
  const { userId, groupId } = req as AuthRequest

  if (!groupId) {
    res.status(403).json({ error: 'Group membership required' })
    return
  }

  try {
    // 관리자 권한 확인
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId) {
      res.status(403).json({ error: '그룹 관리자만 조회할 수 있습니다' })
      return
    }

    const requests = await prisma.joinRequest.findMany({
      where: { groupId, status: 'PENDING' },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })

    res.json(
      requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        groupId: r.groupId,
        status: r.status,
        userName: r.user.name,
        userEmail: r.user.email,
        createdAt: r.createdAt.toISOString(),
      })),
    )
  } catch {
    res.status(500).json({ error: 'Failed to fetch join requests' })
  }
})

// PATCH /api/join-requests/:id/approve — 참여 요청 승인
joinRequestRouter.patch('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const { userId, groupId } = req as AuthRequest
  const id = req.params.id as string

  if (!groupId) {
    res.status(403).json({ error: 'Group membership required' })
    return
  }

  try {
    // 관리자 권한 + 요청 검증
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId) {
      res.status(403).json({ error: '그룹 관리자만 승인할 수 있습니다' })
      return
    }

    const joinRequest = await prisma.joinRequest.findUnique({ where: { id } })
    if (!joinRequest || joinRequest.groupId !== groupId) {
      res.status(404).json({ error: '참여 요청을 찾을 수 없습니다' })
      return
    }
    if (joinRequest.status !== 'PENDING') {
      res.status(409).json({ error: '이미 처리된 요청입니다' })
      return
    }

    // 트랜잭션: JoinRequest 상태 변경 + User groupId 업데이트
    const [updatedRequest] = await prisma.$transaction([
      prisma.joinRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      }),
      prisma.user.update({
        where: { id: joinRequest.userId },
        data: { groupId },
      }),
    ])

    // 요청자에게 Push 알림
    try {
      await sendPushToUser(joinRequest.userId, {
        title: '그룹 참여 승인',
        body: `"${group.name}" 그룹 참여가 승인되었습니다. 다시 로그인해주세요.`,
        url: '/login',
      })
    } catch {
      // Push 실패가 승인을 차단하면 안 됨
    }

    res.json({ success: true, joinRequest: { id: updatedRequest.id, status: updatedRequest.status } })
  } catch {
    res.status(500).json({ error: 'Failed to approve join request' })
  }
})

// PATCH /api/join-requests/:id/reject — 참여 요청 거부
joinRequestRouter.patch('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const { userId, groupId } = req as AuthRequest
  const id = req.params.id as string

  if (!groupId) {
    res.status(403).json({ error: 'Group membership required' })
    return
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId) {
      res.status(403).json({ error: '그룹 관리자만 거부할 수 있습니다' })
      return
    }

    const joinRequest = await prisma.joinRequest.findUnique({ where: { id } })
    if (!joinRequest || joinRequest.groupId !== groupId) {
      res.status(404).json({ error: '참여 요청을 찾을 수 없습니다' })
      return
    }
    if (joinRequest.status !== 'PENDING') {
      res.status(409).json({ error: '이미 처리된 요청입니다' })
      return
    }

    const updatedRequest = await prisma.joinRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    res.json({ success: true, joinRequest: { id: updatedRequest.id, status: updatedRequest.status } })
  } catch {
    res.status(500).json({ error: 'Failed to reject join request' })
  }
})

// GET /api/join-requests/my-status — 요청자의 현재 요청 상태 조회
joinRequestRouter.get('/my-status', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequestOptionalGroup

  try {
    const latestRequest = await prisma.joinRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { group: { select: { name: true } } },
    })

    if (!latestRequest) {
      res.json({ status: 'none' })
      return
    }

    res.json({
      id: latestRequest.id,
      status: latestRequest.status,
      groupName: latestRequest.group.name,
      createdAt: latestRequest.createdAt.toISOString(),
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch join request status' })
  }
})
