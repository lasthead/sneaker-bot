import {OrderStatuses} from "../../../../helpers/ctx";

export class OrderDto {
  readonly product_id: number
  readonly size_id: number
  readonly fio: string
  readonly city: string
  readonly country: string
  readonly delivery_method: 'cdek' | 'post_ru'
  readonly post_type: 'world' | 'russia'
  readonly phone: string
  readonly amount: number
  readonly comment: string
  readonly username: string
  readonly chat_id?: string
  readonly is_club_member: boolean
  readonly user_id: string | number
  readonly delivery_address: string
  readonly pay_for_delivery: 'now' | 'after'
  readonly cash_on_delivery: 'yes' | 'no'
  readonly uploaded_receipt: string
  readonly pay_by_reserve: 'yes' | 'no'
  readonly discount: string
  readonly recipient_fio: string
  readonly recipient_address: string
  readonly recipient_phone: string
  readonly recipient_amount_delivery: string
  readonly recipient_passport: string
  readonly recipient_birthday: string
  readonly is_active: boolean
  readonly track_code?: string
  readonly sended_product_photo?: string
  readonly status?: OrderStatuses
}
