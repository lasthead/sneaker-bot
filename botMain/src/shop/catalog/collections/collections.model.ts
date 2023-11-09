import {Column, Model, Table, DataType, BelongsTo, ForeignKey} from "sequelize-typescript";
import {Brand} from "../brands/brands.model";

@Table({tableName: 'collections'})
export class Collection extends Model<Collection> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @ForeignKey(() => Brand)
  @Column({ type: DataType.INTEGER })
  brand_id: number

  @BelongsTo(() => Brand)
  brand: Brand

  @Column({ type: DataType.STRING, unique: false })
  name: string

  @Column({ type: DataType.STRING, unique: true })
  alias: string

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean
}