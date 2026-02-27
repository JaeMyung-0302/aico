import { Module } from '@nestjs/common'
import { RecipesController } from './recipes.controller'
import { RecipesService } from './recipes.service'
import { GeminiModule } from '../gemini/gemini.module'
import { KamisModule } from '../kamis/kamis.module'
import { CoupangModule } from '../coupang/coupang.module'

@Module({
  imports: [GeminiModule, KamisModule, CoupangModule],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
