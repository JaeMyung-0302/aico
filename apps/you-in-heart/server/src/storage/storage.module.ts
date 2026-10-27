import { Module } from '@nestjs/common'
import { OBJECT_STORAGE } from './object-storage'
import { R2ObjectStorage } from './r2.client'

// 통합 테스트는 OBJECT_STORAGE를 MemoryObjectStorage로 override한다
@Module({
  providers: [{ provide: OBJECT_STORAGE, useClass: R2ObjectStorage }],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
