import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Icon from '@/design-system/components/Icon'
import ListRow from '@/design-system/components/ListRow'
import { REGIONS, type Region } from '../util-regions'

type RegionSheetProps = {
  isVisible: boolean
  currentLabel: string
  onClose: () => void
  onSelect: (region: Region) => void
}

// 위치 권한 없이 지역을 골라 찾는다 (US-005)
const RegionSheet = ({ isVisible, currentLabel, onClose, onSelect }: RegionSheetProps) => (
  <BottomSheet isVisible={isVisible} onClose={onClose}>
    <AppText variant="title3" accessibilityRole="header">
      지역 선택
    </AppText>
    {REGIONS.map((region) => (
      <ListRow
        key={region.id}
        title={region.label}
        trailing={region.label === currentLabel ? <Icon name="check" color="primary" /> : null}
        onPress={() => onSelect(region)}
      />
    ))}
  </BottomSheet>
)

export default RegionSheet
