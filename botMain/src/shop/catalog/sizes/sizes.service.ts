import { Injectable } from '@nestjs/common';
import {CreateSizeDto} from "./dto/create-size.dto";
import {Size} from "./sizes.model";
import {InjectModel} from "@nestjs/sequelize";

@Injectable()
export class SizesService {
  constructor(@InjectModel(Size) private sizeRepository: typeof Size) {}

  async createSize(dto: CreateSizeDto) {
    return await this.sizeRepository.create(dto)
  }

  async getSize(size: number) {
    await this.sizeRepository.findOne({ where: { size } })
  }
}
