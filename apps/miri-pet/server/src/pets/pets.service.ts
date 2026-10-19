import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import {
  type CreatePetRequest,
  MAX_PETS,
  type Pet as PetDto,
  type PublicPetList,
  type UpdatePetRequest,
} from '@miri-pet/shared'
import { AVATAR_IN_USE, isAvatarUniqueViolation } from '../common/prisma/prisma-errors'
import { userNotFound, visibleUserWhereFor } from '../common/visible-user'
import { EventsService } from '../events/events.service'
import type { Media, Pet, Prisma } from '../generated/prisma'
import { MediaService } from '../media/media.service'
import { PrismaService } from '../prisma/prisma.service'
import { fromDbDate, toDbDate } from '../vaccinations/kst-date'
import { collectPetMedia, deleteMediaRows } from './pet-media'

type PetWithAvatar = Pet & { avatarMedia: Pick<Media, 'id' | 'bucket' | 'key' | 'status'> | null }

const WITH_AVATAR = { avatarMedia: { select: { id: true, bucket: true, key: true, status: true } } } as const

export const PET_LIMIT_EXCEEDED = 'PET_LIMIT_EXCEEDED'

const petNotFound = () => new NotFoundException('펫을 찾을 수 없어요')

// 같은 사진을 이미 다른 펫이 쓰고 있으면(Pet.avatarMediaId unique) 500 대신 409
// QA1 P1: 사용자 프로필 사진과 같은 사진을 펫에 쓰면 펫 삭제 때 사용자 사진이 사라진다 → 공유 금지
const userAvatarConflict = () =>
  new ConflictException({ code: AVATAR_IN_USE, message: '이미 내 프로필에 쓰인 사진이에요' })

const withAvatarConflict = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work()
  } catch (error) {
    if (isAvatarUniqueViolation(error)) {
      throw new ConflictException({ code: AVATAR_IN_USE, message: '이미 다른 펫 프로필에 쓰인 사진이에요' })
    }
    throw error
  }
}

type OptionalPetData = { breed?: string | null; birthDate?: Date | null; avatarMediaId?: string | null }

// 선택 필드의 undefined(안 바꿈)·null(지움)을 Prisma 데이터로 옮긴다
const toOptionalPetData = (body: UpdatePetRequest): OptionalPetData => ({
  ...(body.breed !== undefined ? { breed: body.breed || null } : {}),
  ...(body.birthDate !== undefined ? { birthDate: body.birthDate ? toDbDate(body.birthDate) : null } : {}),
  ...(body.avatarMediaId !== undefined ? { avatarMediaId: body.avatarMediaId } : {}),
})

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly events: EventsService,
  ) {}

  async list(ownerId: string): Promise<PetDto[]> {
    const pets = await this.prisma.pet.findMany({ where: { ownerId }, include: WITH_AVATAR, orderBy: { id: 'asc' } })
    return pets.map((pet) => this.toDto(pet))
  }

  // 다른 사용자 프로필의 반려동물 탭: GET /users/:id 와 같은 노출 조건(차단 양방향·정지·탈퇴·숨김은 404, 본인은 허용)
  async listPublic(viewerId: string, userId: string): Promise<PublicPetList> {
    const where =
      viewerId === userId ? { id: userId, status: 'ACTIVE' as const } : { id: userId, ...visibleUserWhereFor(viewerId) }
    const user = await this.prisma.user.findFirst({ where, select: { id: true } })
    if (!user) throw userNotFound()
    const pets = await this.list(userId)
    return {
      items: pets.map(({ id, name, species, breed, size, avatarUrl, birthDate }) => ({
        id,
        name,
        species,
        breed,
        size,
        avatarUrl,
        birthYear: birthDate ? Number(birthDate.slice(0, 4)) : null,
      })),
    }
  }

  async get(ownerId: string, petId: string): Promise<PetDto> {
    return this.toDto(await this.findOwned(ownerId, petId))
  }

  // 다른 사용자의 펫은 존재 여부도 드러내지 않는다(404)
  async findOwned(ownerId: string, petId: string): Promise<PetWithAvatar> {
    const pet = await this.prisma.pet.findFirst({ where: { id: petId, ownerId }, include: WITH_AVATAR })
    if (!pet) throw petNotFound()
    return pet
  }

  async create(ownerId: string, body: CreatePetRequest): Promise<PetDto> {
    if (body.avatarMediaId) await this.assertPetAvatarUsable(ownerId, body.avatarMediaId)
    const pet = await withAvatarConflict(() =>
      this.prisma.$transaction(async (tx) => {
        // 같은 사용자의 동시 생성 요청을 직렬화해 5마리 제한을 지킨다(User 행 잠금)
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`
        if ((await tx.pet.count({ where: { ownerId } })) >= MAX_PETS) {
          throw new UnprocessableEntityException({
            code: PET_LIMIT_EXCEEDED,
            message: `펫은 ${MAX_PETS}마리까지 등록할 수 있어요`,
          })
        }
        return tx.pet.create({
          data: { ownerId, name: body.name, species: body.species, size: body.size, ...toOptionalPetData(body) },
          include: WITH_AVATAR,
        })
      }),
    )
    this.events.capture(ownerId, 'pet_created', { species: pet.species, size: pet.size })
    return this.toDto(pet)
  }

  async update(ownerId: string, petId: string, body: UpdatePetRequest): Promise<PetDto> {
    const current = await this.findOwned(ownerId, petId)
    if (body.avatarMediaId) await this.assertPetAvatarUsable(ownerId, body.avatarMediaId)
    const data: Prisma.PetUncheckedUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.species !== undefined ? { species: body.species } : {}),
      ...(body.size !== undefined ? { size: body.size } : {}),
      ...toOptionalPetData(body),
    }
    const pet = await withAvatarConflict(() =>
      this.prisma.pet.update({ where: { id: petId }, data, include: WITH_AVATAR }),
    )
    // 보안 리뷰 M1: 교체·해제된 이전 사진은 커밋 뒤 정리(다른 곳에 안 쓰일 때만 행 + R2 삭제)
    const replaced = current.avatarMedia
    if (body.avatarMediaId !== undefined && replaced && replaced.id !== body.avatarMediaId) {
      await this.media.discardIfUnused(replaced)
    }
    return this.toDto(pet)
  }

  // 펫 → 접종 → 증명서는 cascade. 증명서·프로필 사진 Media 행은 같은 트랜잭션에서, R2 객체는 커밋 후 지운다
  async remove(ownerId: string, petId: string): Promise<void> {
    await this.findOwned(ownerId, petId)
    const media = await this.prisma.$transaction(async (tx) => {
      const owned = await collectPetMedia(tx, { id: petId })
      await tx.pet.delete({ where: { id: petId } })
      await deleteMediaRows(tx, owned)
      return owned
    })
    await this.media.purgeMedia(media)
  }

  private async assertPetAvatarUsable(ownerId: string, mediaId: string): Promise<void> {
    await this.media.assertUsable(ownerId, [mediaId], 'AVATAR')
    if ((await this.prisma.user.count({ where: { avatarMediaId: mediaId } })) > 0) throw userAvatarConflict()
  }

  private toDto(pet: PetWithAvatar): PetDto {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate ? fromDbDate(pet.birthDate) : null,
      size: pet.size,
      avatarUrl: this.media.publicThumbUrl(pet.avatarMedia),
    }
  }
}
