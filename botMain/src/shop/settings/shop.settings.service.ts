import { Injectable } from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Repository} from "sequelize-typescript";
import {ShopSettingsModel} from "./shop.settings.model";

@Injectable()
export class ShopSettingsService {
  constructor(@InjectModel(ShopSettingsModel) private shopSettingsRepository: Repository<ShopSettingsService>) {}
}
