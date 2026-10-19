import { MAX_POST_IMAGES, type PostPlace } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import KeyboardAvoider from '@/design-system/components/KeyboardAvoider'
import Button from '@/design-system/components/Button'
import Chip from '@/design-system/components/Chip'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { PHOTO_PERMISSION_MESSAGE } from '@/modules/media/util-pick-image/pick-image-or-null'
import { pickImagesOrEmpty } from '@/modules/media/util-pick-image/pick-images'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import PlacePickerSheet from '@/modules/places/ui-place-picker/PlacePickerSheet'
import { useCreatePost } from '../data-access-posts/usePosts'
import PhotoPicker, { type PhotoItem } from './PhotoPicker'
import PlaceTagRow from './PlaceTagRow'

const CAPTION_MAX = 2000

// 06 새 게시물: 사진 1–10장 + 함께한 아이 1마리 이상 + 글(선택)
const NewPostScreen = () => {
  const pets = useMyPets()
  const createPost = useCreatePost()
  const nextKey = useRef(0)
  const [photos, setPhotos] = useState<readonly PhotoItem[]>([])
  // null = 아직 고르지 않음 → 펫이 1마리면 그 아이를 기본 선택
  const [pickedPetIds, setPickedPetIds] = useState<readonly string[] | null>(null)
  const [caption, setCaption] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [place, setPlace] = useState<PostPlace | null>(null)
  const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false)

  const myPets = pets.data ?? []
  const selectedPetIds = pickedPetIds ?? (myPets.length === 1 && myPets[0] ? [myPets[0].id] : [])
  const canShare = photos.length > 0 && selectedPetIds.length > 0 && !createPost.isPending

  // 앨범에서 남은 자리만큼 여러 장을 고른 순서대로 붙인다
  const handleAddPhoto = async () => {
    const images = await pickImagesOrEmpty(MAX_POST_IMAGES - photos.length, () => setNotice(PHOTO_PERMISSION_MESSAGE))
    if (images.length === 0) return
    const base = nextKey.current
    nextKey.current += images.length
    const added = images.map((image, index) => ({ key: `photo-${base + index + 1}`, image }))
    setPhotos((current) => [...current, ...added].slice(0, MAX_POST_IMAGES))
  }
  const handleSelectPlace = (picked: PostPlace) => {
    setPlace(picked)
    setIsPlacePickerOpen(false)
  }
  const handleRemovePhoto = (key: string) => setPhotos((current) => current.filter((photo) => photo.key !== key))
  const handleTogglePet = (petId: string) =>
    setPickedPetIds(
      selectedPetIds.includes(petId) ? selectedPetIds.filter((id) => id !== petId) : [...selectedPetIds, petId],
    )
  const handleShare = async () => {
    setNotice(null)
    try {
      const post = await createPost.mutateAsync({
        photos: photos.map((photo) => photo.image),
        petIds: selectedPetIds,
        caption: caption.trim(),
        placeId: place?.id ?? null,
      })
      router.replace(`/posts/${post.id}`)
    } catch {
      setNotice('게시하지 못했어요. 다시 시도해 주세요')
    }
  }

  const shareButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="공유"
      accessibilityState={{ disabled: !canShare, busy: createPost.isPending }}
      disabled={!canShare}
      onPress={handleShare}
      style={styles.share}
    >
      {createPost.isPending ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <AppText variant="bodyStrong" color={canShare ? 'primary' : 'ink3'}>
          공유
        </AppText>
      )}
    </Pressable>
  )

  return (
    <KeyboardAvoider style={styles.screen}>
      <AppHeader title="새 게시물" right={shareButton} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PhotoPicker photos={photos} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} />
        <TextField
          label="내용"
          multiline
          maxLength={CAPTION_MAX}
          value={caption}
          onChangeText={setCaption}
          placeholder="오늘 우리 아이 이야기를 들려주세요"
          style={styles.caption}
        />
        <View style={styles.pets}>
          <AppText variant="captionStrong" color="ink2">
            함께한 아이 * · 1마리 이상
          </AppText>
          {pets.isPending ? <ActivityIndicator color={COLORS.primary} /> : null}
          {pets.isSuccess && myPets.length === 0 ? (
            <View style={styles.noPets}>
              <AppText variant="callout" color="ink2">
                먼저 반려동물을 등록해 주세요
              </AppText>
              <Button label="반려동물 등록" variant="secondary" size="md" onPress={() => router.push('/pets/new')} />
            </View>
          ) : null}
          <View style={styles.chips}>
            {myPets.map((pet) => (
              <Chip
                key={pet.id}
                label={pet.name}
                accessibilityLabel={pet.name}
                isSelected={selectedPetIds.includes(pet.id)}
                onPress={() => handleTogglePet(pet.id)}
              />
            ))}
          </View>
        </View>
        <PlaceTagRow place={place} onPress={() => setIsPlacePickerOpen(true)} onClear={() => setPlace(null)} />
        {notice ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
            {notice}
          </AppText>
        ) : null}
      </ScrollView>
      <PlacePickerSheet
        isVisible={isPlacePickerOpen}
        onSelect={handleSelectPlace}
        onClose={() => setIsPlacePickerOpen(false)}
      />
    </KeyboardAvoider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  share: { minWidth: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  body: { padding: SPACING.lg, gap: SPACING.xl },
  caption: { minHeight: 110, paddingTop: SPACING.md, textAlignVertical: 'top' },
  pets: { gap: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  noPets: { gap: SPACING.sm, alignItems: 'flex-start' },
})

export default NewPostScreen
