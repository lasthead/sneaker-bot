import {Column, Model, Table, DataType} from "sequelize-typescript";

@Table({tableName: 'users'})
export class User extends Model<User> {
  @Column({ type: DataType.BIGINT, unique: true, autoIncrement: false, primaryKey: true })
  id: bigint

  @Column({ type: DataType.BIGINT, unique: false })
  group_id?: bigint

  @Column({ type: DataType.STRING, allowNull: true })
  username: string

  @Column({ type: DataType.STRING, allowNull: true })
  first_name?: string

  @Column({ type: DataType.STRING, allowNull: true })
  last_name?: string

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_bot?: boolean

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_admin: boolean

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_manager: boolean
}
