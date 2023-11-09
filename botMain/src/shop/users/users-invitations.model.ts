import {Column, Model, Table, DataType} from "sequelize-typescript";

@Table({tableName: 'chat_invitations'})
export class UsersInvitations extends Model<UsersInvitations> {
  @Column({ type: DataType.BIGINT, unique: true, autoIncrement: false, primaryKey: true })
  id: number

  @Column({ type: DataType.BIGINT, unique: false })
  group_id: bigint

  @Column({ type: DataType.STRING, allowNull: true })
  link: string

  @Column({ type: DataType.STRING, allowNull: true })
  user_id: string

  @Column({ type: DataType.STRING, allowNull: true })
  user_name: string
}