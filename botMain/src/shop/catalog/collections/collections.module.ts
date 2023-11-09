import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import {SequelizeModule} from "@nestjs/sequelize";
import {Collection} from "./collections.model";

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService],
  imports: [
    SequelizeModule.forFeature([Collection])
  ]
})
export class CollectionsModule {}
