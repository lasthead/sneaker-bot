import {Column, Model, Table, DataType, ForeignKey} from "sequelize-typescript";
import {Size} from "../sizes/sizes.model";
import {Product} from "./products.model";

@Table({tableName: 'product_sizes'})
export class ProductSizes extends Model<ProductSizes> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @ForeignKey(() => Size)
  @Column({ type: DataType.INTEGER })
  size_id: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER })
  product_id: number

  @Column({ type: DataType.INTEGER, allowNull: true })
  count: number
}
