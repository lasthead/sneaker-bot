import {Injectable} from '@nestjs/common';
import {InjectModel} from "@nestjs/sequelize";
import {Repository} from "sequelize-typescript";
import {Order} from "./order.model";

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order) private orderRepository: Repository<Order>) {}
}
