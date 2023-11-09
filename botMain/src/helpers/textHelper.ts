import {Injectable} from "@nestjs/common";
import {I18nService} from "nestjs-i18n";
import {Delivery} from "./ctx";

@Injectable()
export class TextHelper {
  constructor(
    private readonly i18n: I18nService,
  ) {}

  textWithComma(text) {
    return text ? `${text}, ` : ``
  }

  getShortOrderViewDescription(ctx, order, showStatus = false) {
    let form_desc = this.i18n.t('dict.order.view_order_user', {
      args: {
        fio: order.fio,
        deliveryMethod: this.i18n.t(`dict.order.${order.delivery_method}`),
        deliveryAddress: `${this.textWithComma(order.city)}${order.delivery_address}`,
        phone: order.phone,
        reserve: order.pay_by_reserve ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`),
        summ: order.amount,
        payForDelivery: this.i18n.t(`dict.order.${order.pay_for_delivery}`)
      }
    });

    const product_desc = this.i18n.t('dict.order.short_view_order_product', {
      args: {
        article: order.product.article,
        model: `${order.product.brand.name} ${order.product.name}`,
        size: order.size.size,
      }
    });

    const is_order_dropship = this.i18n.t('dict.order.is_order_dropship', {
      args: { status: order.is_club_member ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`) }
    });

    if (order.delivery_method === Delivery.POSTRU) {
      form_desc = this.i18n.t('dict.order.view_order_user_post', {
        args: {
          fio: order.fio,
          deliveryMethod: this.i18n.t(`dict.order.${order.delivery_method}`),
          deliveryAddress: `${this.textWithComma(order.country)}${this.textWithComma(order.city)}${order.delivery_address}`,
          phone: order.phone,
          reserve: order.pay_by_reserve ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`),
          postType: this.i18n.t(`dict.order.${order.post_type}`),
        }
      });
    }

    if (order.cash_on_delivery === 'yes' && order.is_club_member) {
      form_desc = form_desc + '\n' + this.i18n.t('dict.order.view_order_user_post_cash_delivery', {
        args: {
          fio_recipient: order.recipient_fio,
          recipientAddress: order.recipient_address,
          recipientPhone: order.recipient_phone,
          recipientAmountDelivery: order.recipient_amount_delivery,
          passportRecipient: order.recipient_passport,
          birthdayRecipient: order.recipient_birthday,
        }
      });
    }

    form_desc = form_desc + this.i18n.t('dict.order.comment', {
      args: { comment: order.comment || this.i18n.t(`dict.no`) }
    });

    if (showStatus) {
      const status = this.i18n.t(`dict.admin_panel.status.${order.status}`);
      const desc = this.i18n.t(`dict.admin_panel.current_status`);

      return product_desc + '\n\n' + form_desc + is_order_dropship + '\n' + desc + status;
    }

    return product_desc + '\n\n' + form_desc + is_order_dropship;
  }

  getOrderViewDescription(ctx, order, showStatus = false) {
    let form_desc = this.i18n.t('dict.order.view_order_user', {
      args: {
        fio: order.fio,
        deliveryMethod: this.i18n.t(`dict.order.${order.delivery_method}`),
        deliveryAddress: `${this.textWithComma(order.city)}${order.delivery_address}`,
        phone: order.phone,
        reserve: order.pay_by_reserve ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`),
        summ: order.amount,
        payForDelivery: this.i18n.t(`dict.order.${order.pay_for_delivery}`)
      }
    });

    const product_desc = this.i18n.t('dict.order.view_order_product', {
      args: {
        article: order.product.article,
        model: `${order.product.brand.name} ${order.product.name}`,
        size: order.size.size,
        price: order.amount,
      }
    })

    if (order.delivery_method === Delivery.POSTRU) {
      form_desc = this.i18n.t('dict.order.view_order_user_post', {
        args: {
          fio: order.fio,
          deliveryMethod: this.i18n.t(`dict.order.${order.delivery_method}`),
          deliveryAddress: `${this.textWithComma(order.country)}${this.textWithComma(order.city)}${order.delivery_address}`,
          city: order.city,
          phone: order.phone,
          reserve: order.pay_by_reserve ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`),
          summ: order.amount,
          cashOnDelivery: this.i18n.t(`dict.${order.cash_on_delivery}`),
          postType: this.i18n.t(`dict.order.${order.post_type}`),
        }
      });
    }

    if (order.cash_on_delivery === 'yes' && order.is_club_member) {
      form_desc = form_desc + '\n' + this.i18n.t('dict.order.view_order_user_post_cash_delivery', {
        args: {
          fio_recipient: order.recipient_fio,
          recipientAddress: order.recipient_address,
          recipientPhone: order.recipient_phone,
          recipientAmountDelivery: order.recipient_amount_delivery,
          passportRecipient: order.recipient_passport,
          birthdayRecipient: order.recipient_birthday,
        }
      });
    }

    form_desc = form_desc + this.i18n.t('dict.order.comment', {
      args: { comment: order.comment || this.i18n.t(`dict.no`) }
    });

    let trackCode = '';

    if (order.track_code) {
      trackCode = this.i18n.t('dict.order.track_code', {
        args: { track_code: order.track_code }
      });
    }

    if (showStatus) {
      const status = this.i18n.t(`dict.admin_panel.status.${order.status}`);
      const desc = this.i18n.t(`dict.admin_panel.current_status`);

      return product_desc + '\n\n' + form_desc + trackCode + '\n' + desc + status;
    }

    return product_desc + '\n\n' + form_desc + trackCode;
  }
}
