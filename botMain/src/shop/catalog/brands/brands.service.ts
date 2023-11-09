import {Injectable} from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Brand} from "./brands.model";
import {Repository} from "sequelize-typescript";
import {Collection} from "../collections/collections.model";
import {Product} from "../products/products.model";

@Injectable()
export class BrandsService {
  constructor(@InjectModel(Brand) private brandRepository: Repository<Brand>) {}

  async getAllBrands() {
    return await this.brandRepository.findAll({
      include: [
        Product
      ]
    })
  }

  async getBrandCollections(id) {
    return await this.brandRepository.findOne({
      where: { id },
      include: {
        model: Collection,
      },
    })
  }
}
