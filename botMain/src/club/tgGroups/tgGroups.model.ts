import {Column, Model, Table, DataType, HasMany} from "sequelize-typescript";

@Table({tableName: 'tg_groups'})
export class TgGroup extends Model<TgGroup> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @Column({ type: DataType.STRING, unique: false })
  group_id: string

  @Column({ type: DataType.STRING, unique: false })
  name: string

  @Column({ type: DataType.STRING, unique: false })
  owner_id?: string

  @Column({ type: DataType.STRING, unique: false })
  owner_username?: string

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active?: boolean
}
