import { Module } from '@nestjs/common';
import { ClubUpdate } from "./club.update";
import {ClubButtons} from "./club.buttons";
import {AppGetEmailScene, ClubPaymentScene} from "./club.payment.scene";
import {TgGroupsModule} from "./tgGroups/tgGroups.module";
import {User} from "../shop/users/users.model";
import {UsersService} from "../shop/users/users.service";
import {SequelizeModule} from "@nestjs/sequelize";
import {HttpModule} from "@nestjs/axios";
import {TgGroup} from "./tgGroups/tgGroups.model";
import {TgGroupsService} from "./tgGroups/tgGroups.service";
import {SettingsModel} from "./settings/settings.model";

@Module({
  providers: [
    ClubUpdate,
    ClubButtons,
    AppGetEmailScene,
    ClubPaymentScene,
    UsersService,
    TgGroupsService,
    SettingsModel,
  ],
  imports: [
    TgGroupsModule,
    SequelizeModule.forFeature([User, TgGroup, SettingsModel]),
    HttpModule,
  ],
})
export class ClubModule {}
