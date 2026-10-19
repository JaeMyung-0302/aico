import type { Media, Prisma } from '../generated/prisma'

type MediaRow = Pick<Media, 'id' | 'bucket' | 'key' | 'status'>
const MEDIA_ROW = { id: true, bucket: true, key: true, status: true } as const

// 펫(들)을 지울 때 함께 사라질 미디어: 증명서 이미지 + 펫 프로필 사진
// 펫 → 접종 → 증명서 행은 FK cascade로 지워지지만 Media 행·R2 객체는 직접 지워야 한다
export const collectPetMedia = async (
  tx: Prisma.TransactionClient,
  where: Prisma.PetWhereInput,
): Promise<MediaRow[]> => {
  const [certificates, avatars] = await Promise.all([
    tx.vaccinationCertificate.findMany({
      where: { vaccination: { pet: where } },
      select: { media: { select: MEDIA_ROW } },
    }),
    // QA1 P1: 사용자 프로필 사진으로도 쓰이는 사진(과거 데이터)은 펫과 함께 지우지 않는다
    tx.media.findMany({ where: { petAvatar: { is: where }, userAvatar: { is: null } }, select: MEDIA_ROW }),
  ])
  return [...certificates.map((certificate) => certificate.media), ...avatars]
}

export const collectVaccinationMedia = async (
  tx: Prisma.TransactionClient,
  vaccinationId: string,
): Promise<MediaRow[]> => {
  const certificates = await tx.vaccinationCertificate.findMany({
    where: { vaccinationId },
    select: { media: { select: MEDIA_ROW } },
  })
  return certificates.map((certificate) => certificate.media)
}

export const deleteMediaRows = async (tx: Prisma.TransactionClient, media: readonly MediaRow[]): Promise<void> => {
  if (media.length === 0) return
  await tx.media.deleteMany({ where: { id: { in: media.map((row) => row.id) } } })
}
