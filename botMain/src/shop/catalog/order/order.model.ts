import {Column, Model, Table, DataType, ForeignKey, BelongsTo} from "sequelize-typescript";
import {Product} from "../products/products.model";
import {Size} from "../sizes/sizes.model";
import {Collection} from "../collections/collections.model";
import {OrderStatuses} from "../../../helpers/ctx";

@Table({tableName: 'orders'})
export class Order extends Model<Order> {
  @Column({ type: DataType.INTEGER, unique: true, autoIncrement: true, primaryKey: true })
  id: number

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER })
  product_id: number

  @BelongsTo(() => Product)
  product: Product

  @ForeignKey(() => Size)
  @Column({ type: DataType.INTEGER })
  size_id: number

  @BelongsTo(() => Size)
  size: Size

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  username?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  chat_id?: string

  @Column({ type: DataType.BOOLEAN, allowNull: true, unique: false })
  is_club_member?: boolean

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  user_id?: string | number

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  fio: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  city: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  country: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  delivery_method: 'cdek' | 'post_ru'

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  post_type: 'world' | 'russia'

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  delivery_address?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  pay_for_delivery?: 'now' | 'after'

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  cash_on_delivery?: 'yes' | 'no'

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  phone: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  comment?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  pay_by_reserve?: 'yes' | 'no'

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  uploaded_receipt?: string

  @Column({ type: DataType.INTEGER, allowNull: true, unique: false })
  amount: number

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  discount?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_fio?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_address?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_phone?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_amount_delivery?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_passport?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  recipient_birthday?: string

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active?: boolean

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  track_code?: string

  @Column({ type: DataType.STRING, allowNull: true, unique: false })
  sended_product_photo?: string

  @Column({ type: DataType.STRING, defaultValue: OrderStatuses.Process })
  status?: OrderStatuses
}

// statuses
// 0 decline
// 1 in_process
// 2 waiting to be sent
// 3 is_sent
// 4 waiting_receipt
// 5 is_received
// 6 done
