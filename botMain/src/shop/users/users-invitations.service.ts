import { Injectable } from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {UsersInvitations} from "./users-invitations.model";
import {Repository} from "sequelize-typescript";
import {CreateInviteDto} from "./dto/create-invite.dto";

@Injectable()
export class UsersInvitationsService {
  constructor(@InjectModel(UsersInvitations) private invitationsRepository: Repository<UsersInvitations>) {}

  // async saveItem(dto: CreateInviteDto) {
  //   try {
  //     return await this.invitationsRepository.create(dto)
  //   } catch (e) {
  //     return e
  //   }
  // }
}
