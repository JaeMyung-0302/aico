import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import type { VaccinationDraft, VaccinationFormSubmit } from '../util-vaccination/validate-vaccination-form'
import {
  agreeCertificateConsent,
  createVaccination,
  deleteVaccination,
  fetchCertificates,
  fetchUpcomingVaccination,
  fetchVaccinations,
  updateVaccination,
} from './vaccinations-api'

export const vaccinationsQueryKey = (petId: string) => ['vaccinations', 'pet', petId] as const
export const UPCOMING_VACCINATION_QUERY_KEY = ['vaccinations', 'upcoming'] as const

export const useVaccinations = (petId: string | undefined) =>
  useQuery({
    queryKey: vaccinationsQueryKey(petId ?? ''),
    queryFn: () => fetchVaccinations(petId ?? ''),
    enabled: Boolean(petId),
  })

export const useUpcomingVaccination = () =>
  useQuery({ queryKey: UPCOMING_VACCINATION_QUERY_KEY, queryFn: fetchUpcomingVaccination })

// 증명서 URL은 60초 만료 → 캐시하지 않고 열 때마다 받는다
export const useCertificates = (vaccinationId: string | null) =>
  useQuery({
    queryKey: ['vaccinations', 'certificates', vaccinationId],
    queryFn: () => fetchCertificates(vaccinationId ?? ''),
    enabled: Boolean(vaccinationId),
    staleTime: 0,
    gcTime: 0,
  })

// 사진 uri → 이미 올린 mediaId. 기록 저장이 실패해 다시 누를 때 같은 사진을 또 올리지 않는다
type UploadedCertificates = { current: ReadonlyMap<string, string> }

const uploadCertificateOnce = async (image: PickedImage, uploaded: UploadedCertificates): Promise<string> => {
  const cached = uploaded.current.get(image.uri)
  if (cached) return cached
  const mediaId = await uploadImage(image, 'CERTIFICATE')
  uploaded.current = new Map([...uploaded.current, [image.uri, mediaId]])
  return mediaId
}

// 저장 순서: (증명서가 있으면) 보관 동의 → 사진 업로드(순차, 이미 올린 사진은 건너뜀) → 기록 생성
const saveVaccination = async (
  petId: string,
  { request, certificates }: VaccinationFormSubmit,
  uploaded: UploadedCertificates,
) => {
  if (certificates.length > 0) await agreeCertificateConsent()
  let mediaIds: readonly string[] = []
  for (const image of certificates) {
    mediaIds = [...mediaIds, await uploadCertificateOnce(image, uploaded)]
  }
  return createVaccination(petId, { ...request, certificateMediaIds: [...mediaIds] })
}

const refreshVaccinations = (queryClient: QueryClient, petId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: vaccinationsQueryKey(petId) }),
    queryClient.invalidateQueries({ queryKey: UPCOMING_VACCINATION_QUERY_KEY }),
  ])

export const useSaveVaccination = (petId: string) => {
  const queryClient = useQueryClient()
  const uploaded = useRef<ReadonlyMap<string, string>>(new Map())
  return useMutation({
    mutationFn: (values: VaccinationFormSubmit) => saveVaccination(petId, values, uploaded),
    onSuccess: async () => {
      uploaded.current = new Map()
      await refreshVaccinations(queryClient, petId)
    },
  })
}

// 15 재사용 수정: 폼 값 전체를 보낸다(다음 접종일을 비우면 null로 지운다)
export const useUpdateVaccination = (petId: string, vaccinationId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: VaccinationDraft) => updateVaccination(vaccinationId, request),
    onSuccess: () => refreshVaccinations(queryClient, petId),
  })
}

// 화면은 기다리지 않고 바로 떠난다(지운 기록을 다시 그리지 않게)
export const useDeleteVaccination = (petId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vaccinationId: string) => deleteVaccination(vaccinationId),
    onSuccess: () => {
      refreshVaccinations(queryClient, petId).catch(() => undefined)
    },
  })
}
