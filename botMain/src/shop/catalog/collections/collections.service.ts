import {Injectable} from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Collection} from "./collections.model";
import {Repository} from "sequelize-typescript";
import {where} from "sequelize";
import {Brand} from "../brands/brands.model";

@Injectable()
export class CollectionsService {
  constructor(@InjectModel(Collection) private collectionRepository: Repository<Collection>) {}

  async getAllCollection() {
    return await this.collectionRepository.findAll({raw: true})
  }

  async getCollectionByBrand(brand_id) {
    return await this.collectionRepository.findAll({
      where: { brand_id },
      raw: true
    })
  }
}
