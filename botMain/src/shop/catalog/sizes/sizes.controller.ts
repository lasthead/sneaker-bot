import {Body, Controller, Post, Get} from '@nestjs/common';
import {CreateSizeDto} from "./dto/create-size.dto";
import {SizesService} from "./sizes.service";

@Controller('sizes')
export class SizesController {
  constructor(private sizeService: SizesService) {
  }
  @Get()
  async findAll() {
    const sizes = await this.sizeService.getAllSizes();
    return {
      data: sizes || [],
      message: sizes ? 'success' : 'failed or empty',
    }
  }
  @Post()
  create(@Body() dto: CreateSizeDto) {
    return this.sizeService.createSize(dto)
  }
}
