import type { Place as PlaceDto } from '@miri-pet/shared'
import type { Place } from '../generated/prisma'

export const toPlaceDto = (place: Place): PlaceDto => ({
  id: place.id,
  name: place.name,
  category: place.category,
  address: place.address,
  lat: place.lat,
  lng: place.lng,
  allowedSizes: place.allowedSizes,
  indoorAllowed: place.indoorAllowed,
  conditionsNote: place.conditionsNote,
  source: place.source,
  verifiedAt: place.verifiedAt?.toISOString() ?? null,
})
