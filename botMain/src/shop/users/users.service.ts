import { Injectable } from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {User} from "./users.model";
import {Repository} from "sequelize-typescript";
const { Op } = require("sequelize");

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userRepository: Repository<User>) {}

  async getAllUsers() {
    try {
      const users = await this.userRepository.findAll()
      return users
    } catch (e) {
      return e
    }
  }

  async getAdmins() {
    try {
      const admins = await this.userRepository.findAll({ where: { is_admin: true } })
      return admins
    } catch (e) {
      return e
    }
  }
}
