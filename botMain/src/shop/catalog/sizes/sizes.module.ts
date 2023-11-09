import { Module } from '@nestjs/common';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';
import {SequelizeModule} from "@nestjs/sequelize";
import {Size} from "./sizes.model";

@Module({
  controllers: [SizesController],
  providers: [SizesService],
  imports: [
    SequelizeModule.forFeature([Size])
  ]
})
export class SizesModule {}
