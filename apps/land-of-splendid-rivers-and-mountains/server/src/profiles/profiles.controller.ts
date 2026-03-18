import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ProfilesService } from './profiles.service'
import { CreateProfileDto } from './profiles.dto'

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto.name)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id)
  }
}
