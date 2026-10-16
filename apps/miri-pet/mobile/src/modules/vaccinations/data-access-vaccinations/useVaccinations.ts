import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import type { VaccinationFormSubmit } from '../util-vaccination/validate-vaccination-form'
import {
  agreeCertificateConsent,
  createVaccination,
  fetchCertificates,
  fetchUpcomingVaccination,
  fetchVaccinations,
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

// 저장 순서: (증명서가 있으면) 보관 동의 → 사진 업로드(순차) → 기록 생성
const saveVaccination = async (petId: string, { request, certificates }: VaccinationFormSubmit) => {
  if (certificates.length > 0) await agreeCertificateConsent()
  let mediaIds: readonly string[] = []
  for (const image of certificates) {
    mediaIds = [...mediaIds, await uploadImage(image, 'CERTIFICATE')]
  }
  return createVaccination(petId, { ...request, certificateMediaIds: [...mediaIds] })
}

export const useSaveVaccination = (petId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: VaccinationFormSubmit) => saveVaccination(petId, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vaccinationsQueryKey(petId) }),
        queryClient.invalidateQueries({ queryKey: UPCOMING_VACCINATION_QUERY_KEY }),
      ])
    },
  })
}
