import { Controller, Get, Param } from '@nestjs/common';
import { PersonQueryService } from './person-query.service';

@Controller('persons')
export class PersonQueryController {
  constructor(private readonly personQueryService: PersonQueryService) {}

  @Get()
  async findAll() {
    return this.personQueryService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.personQueryService.findOne(id);
  }
}
