import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

export const petSpeciesSchema = z.enum(['DOG', 'CAT', 'ETC'])
export const petSizeSchema = z.enum(['S', 'M', 'L'])
export type PetSize = z.infer<typeof petSizeSchema>

export const petSchema = z.object({
  id: idSchema,
  name: z.string(),
  species: petSpeciesSchema,
  breed: z.string().nullable(),
  birthDate: isoDateSchema.nullable(),
  size: petSizeSchema,
  avatarUrl: z.string().nullable(),
})
export type Pet = z.infer<typeof petSchema>

export const createPetRequestSchema = z.object({
  name: z.string().trim().min(1).max(20),
  species: petSpeciesSchema,
  breed: z.string().trim().max(40).nullable().optional(),
  birthDate: isoDateSchema.nullable().optional(),
  size: petSizeSchema,
  avatarMediaId: idSchema.nullable().optional(),
})
export type CreatePetRequest = z.infer<typeof createPetRequestSchema>

export const updatePetRequestSchema = createPetRequestSchema.partial()
export type UpdatePetRequest = z.infer<typeof updatePetRequestSchema>

// GET /users/:id/pets — 다른 사용자에게 보이는 펫 요약. 정확한 생일·접종·증명서는 넣지 않는다(생년만)
export const publicPetSchema = petSchema
  .pick({ id: true, name: true, species: true, breed: true, size: true, avatarUrl: true })
  .extend({ birthYear: z.number().int().nullable() })
export type PublicPet = z.infer<typeof publicPetSchema>
export const publicPetListSchema = z.object({ items: z.array(publicPetSchema) })
export type PublicPetList = z.infer<typeof publicPetListSchema>
