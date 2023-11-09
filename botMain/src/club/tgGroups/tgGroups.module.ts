import { Module } from '@nestjs/common';
import {SequelizeModule} from "@nestjs/sequelize";
import {TgGroup} from "./tgGroups.model";

@Module({
  controllers: [],
  providers: [],
  imports: [
    SequelizeModule.forFeature([TgGroup])
  ]
})
export class TgGroupsModule {}
