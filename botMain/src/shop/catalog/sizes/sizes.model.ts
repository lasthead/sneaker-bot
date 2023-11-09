import {Column, Model, Table, DataType, BelongsToMany} from "sequelize-typescript";
import {Product} from "../products/products.model";
import {ProductSizes} from "../products/product-sizes.model";

@Table({tableName: 'sizes'})
export class Size extends Model<Size> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @Column({ type: DataType.INTEGER, unique: true, })
  size: number

  @BelongsToMany(() => Product, () => ProductSizes)
  products: Product[]
}
