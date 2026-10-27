import { router } from 'expo-router'
import BottomSheet from '@/design-system/components/BottomSheet'
import UnlinkingBlockedSheet from '@/modules/couple/ui-unlinking-sheet/UnlinkingBlockedSheet'
import AnniversaryForm from '../ui-anniversary-form/AnniversaryForm'
import type { useAnniversaryEditor } from './useAnniversaryEditor'

type AnniversaryEditorSheetsProps = {
  editor: ReturnType<typeof useAnniversaryEditor>
}

// SCR-04 추가·수정 시트 + 유예 중 쓰기 시도(409) SCR-18 시트
const AnniversaryEditorSheets = ({ editor }: AnniversaryEditorSheetsProps) => {
  const { sheet } = editor
  return (
    <>
      <BottomSheet isVisible={sheet.mode !== 'closed'} onClose={editor.closeSheet}>
        {sheet.mode === 'closed' ? null : (
          <AnniversaryForm
            key={sheet.mode === 'edit' ? sheet.item.refKey : 'create'}
            mode={sheet.mode}
            initialValue={sheet.mode === 'edit' ? { title: sheet.item.title, date: sheet.item.date } : undefined}
            isSubmitting={editor.isSubmitting}
            isDeleting={editor.isDeleting}
            errorMessage={editor.errorMessage}
            onSubmit={editor.submit}
            onDelete={sheet.mode === 'edit' ? editor.deleteCurrent : undefined}
            onClose={editor.closeSheet}
          />
        )}
      </BottomSheet>
      <UnlinkingBlockedSheet
        isVisible={editor.isBlockedVisible}
        onClose={editor.hideBlocked}
        onOpenStatus={() => {
          editor.hideBlocked()
          router.replace('/settings')
        }}
      />
    </>
  )
}

export default AnniversaryEditorSheets
