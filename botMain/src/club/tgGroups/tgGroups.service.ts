import { Injectable } from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Repository} from "sequelize-typescript";
import {TgGroup} from "./tgGroups.model";

@Injectable()
export class TgGroupsService {
  constructor(@InjectModel(TgGroup) private userRepository: Repository<TgGroup>) {}
  async getActiveGroup() {
    return await this.userRepository.findAll({ where: { is_active: true } })
  }
}
