import { Injectable } from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Repository} from "sequelize-typescript";
import {SettingsModel} from "./settings.model";

@Injectable()
export class TgGroupsService {
  constructor(@InjectModel(SettingsModel) private userRepository: Repository<SettingsModel>) {}
}
