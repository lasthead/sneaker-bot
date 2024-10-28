import {Injectable} from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Brand} from "./brands.model";
import {Repository} from "sequelize-typescript";
import {Collection} from "../collections/collections.model";
import {Product} from "../products/products.model";
import {Size} from "../sizes/sizes.model";
import {Op} from "sequelize";

@Injectable()
export class BrandsService {
  constructor(@InjectModel(Brand) private brandRepository: Repository<Brand>) {}

  async getAllBrands() {
    return await this.brandRepository.findAll({
      where: { is_active: true },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    })
  }

  async getAllBrandsWithProducts() {
    return await this.brandRepository.findAll({
      where: { is_active: true },
      include: [
        Product
      ],
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    })
  }

  async getAllBrandsWithProductsWithSize() {
    return await this.brandRepository.findAll({
      where: { is_active: true },
      include: [
        {
          model: Product,
          include: [
            {
              model: Size,
              through: {
                where: { count: { [Op.gte]:0 } }
              }
            }
          ],
        }
      ],
      attributes: { exclude: ['createdAt', 'updatedAt'] },
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
