import {Body, Controller, Post} from '@nestjs/common';
import {CreateSizeDto} from "./dto/create-size.dto";
import {SizesService} from "./sizes.service";

@Controller('sizes')
export class SizesController {
  constructor(private sizeService: SizesService) {
  }
  @Post()
  create(@Body() dto: CreateSizeDto) {
    return this.sizeService.createSize(dto)
  }
}
