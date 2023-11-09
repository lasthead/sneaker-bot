import {Column, Model, Table, DataType, HasMany} from "sequelize-typescript";

@Table({tableName: 'club_settings'})
export class SettingsModel extends Model<SettingsModel> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @Column({ type: DataType.STRING, unique: false })
  setting_name: string

  @Column({ type: DataType.STRING, unique: false })
  value?: string

  @Column({ type: DataType.BOOLEAN, unique: false })
  boolValue?: boolean

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active?: boolean
}
