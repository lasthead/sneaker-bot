import {Markup} from "telegraf";
import {I18nService} from "nestjs-i18n";
import {Injectable} from "@nestjs/common";

interface buttonListItem {
  name: string,
  id: number | string,
  products?: [],
}

@Injectable()
export class ShopButtons {
  constructor(
    private readonly i18n: I18nService,
  ) {}

  public actionButtons(isAdmin = false) {
    const link = 'https://telegra.ph/Info-04-04-4';
    const user = 'https://t.me/Po_shagamm_bot';
    const reviews = 'https://t.me/ps_feedback';
    const dropshipping = 'http://shkitov.com';

    let buttons = [
      Markup.button.callback(this.i18n.t("dict.buttons.start.catalog"), "catalog"),
      Markup.button.callback(this.i18n.t("dict.buttons.start.search"), "search"),
      Markup.button.url(this.i18n.t("dict.buttons.start.reviews"), reviews),
      Markup.button.url(this.i18n.t("dict.buttons.start.info"), link),
      Markup.button.url(this.i18n.t("dict.buttons.start.help"), user),
      Markup.button.url(this.i18n.t("dict.buttons.start.dropshipping"), dropshipping),
    ]

    if (isAdmin) {
      return Markup.inlineKeyboard([
          [buttons[0], buttons[1]],
          [buttons[2], buttons[3]],
          [buttons[4], buttons[5]],
          [ Markup.button.callback(this.i18n.t("dict.buttons.start.orders"), "orders") ],
          [ Markup.button.callback(this.i18n.t("dict.buttons.start.admin_panel"), "admin-panel") ],
        ],
      )
    }

    return Markup.inlineKeyboard([
        ...buttons,
        Markup.button.callback(this.i18n.t("dict.buttons.start.orders"), "orders"),
      ],
      { columns: 2 }
    )
  }

  public adminButtons() {
    return Markup.inlineKeyboard([
        [
          Markup.button.callback(this.i18n.t("dict.admin_panel.orders_retail"), "orders-retail"),
          Markup.button.callback(this.i18n.t("dict.admin_panel.orders_shipping"), "orders-shipping"),
        ],
        [Markup.button.callback(this.i18n.t("dict.admin_panel.orders_archive"), "orders-archive")],
        [Markup.button.callback(this.i18n.t("dict.admin_panel.products_update"), "products-update")],
        [Markup.button.callback(this.i18n.t("dict.buttons.common.back"), "exit-panel")],
      ]
    )
  }

  public searchButtons(seasonTableLink) {
    return Markup.inlineKeyboard([
        Markup.button.callback(this.i18n.t("dict.buttons.search.by_article"), "search-article"),
        Markup.button.callback(this.i18n.t("dict.buttons.search.by_size"), "search-size"),
        Markup.button.url(this.i18n.t("dict.buttons.search.by_table"), seasonTableLink, !seasonTableLink),
        Markup.button.callback(this.i18n.t("dict.buttons.common.cancel"), "cancel"),
      ],
      { columns: 1 },
    );
  }

  public buttonsList(list?, cancelAction = 'go-back', prefix?, showCounter?, columns = null) {
    let cancelButton = Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction);
    if (cancelAction && cancelAction === 'cancel-order') {
      cancelButton = Markup.button.callback(this.i18n.t("dict.buttons.common.reset"), cancelAction);
    }

    if (list && list.length) {
      return Markup.inlineKeyboard([
          ...list.map(item => {
            const title = showCounter ? `${item.name} (${item.products.length})` : item.name
            if (item?.url) {
              return Markup.button.url(title, item.id);
            } else {
              return Markup.button.callback(title, prefix ? `${prefix}-${item.id}` : item.id);
            }
          }),
          cancelButton,
        ],
        { columns: columns || (list.length > 1 ? 2 : 1) }
      )
    }

    return Markup.inlineKeyboard([
      cancelButton,
      ],
    )
  }

  public ordersList(list?, cancelAction = 'go-back', prefix?, showCounter?) {
    let cancelButton = Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction);
    if (cancelAction && cancelAction === 'cancel-order') {
      cancelButton = Markup.button.callback(this.i18n.t("dict.buttons.common.reset"), cancelAction);
    }

    if (list && list.length) {
      return Markup.inlineKeyboard([
          ...list.map(item => {
            const title = showCounter ? `${item.name} (${item.products.length})` : item.name
            return Markup.button.callback(title, prefix ? `${prefix}-${item.id}` : item.id);
          }),
          cancelButton,
        ],
        { columns: 1 }
      )
    }
    return Markup.inlineKeyboard([
        cancelButton,
      ],
    )
  }

  public sizesList(list, cancelAction?, prefix?) {
    if (list.length > 4) {
      const index = Math.ceil(list.length / 2);
      const firstRow = list.map(item => {
        return Markup.button.callback(item, prefix + "-" + item)
      }).slice(0, index);
      const secondRow = list.map(item => {
        return Markup.button.callback(item, prefix + "-" + item)
      }).splice(index);

      return Markup.inlineKeyboard([
          firstRow,
          secondRow,
          [ Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction) ],
        ],
      );
    } else {
      return Markup.inlineKeyboard([
          list.map(item => {
            return Markup.button.callback(item, prefix + "-" + item)
          }),
          [ Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction) ],
        ],
      );
    }

  }

  public searchSizesList(list, cancelAction?, columns = 3) {
    return Markup.inlineKeyboard([
        ...list.map(item => {
          return Markup.button.callback(item.name, 'size-' + item.id)
        }),
        Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction),
      ],
      { columns }
    )
  }

  public productViewButtons(cancelAction = "cancel", showSlider = true, showOrderBtn = true) {
    let sliderButtons = [];
    if (showSlider) {
      sliderButtons = [
        Markup.button.callback(this.i18n.t("dict.buttons.common.prev"), "prev"),
        Markup.button.callback(this.i18n.t("dict.buttons.common.next"), "next")
      ];
    }
    if (showOrderBtn) {
      return Markup.inlineKeyboard([
          sliderButtons,
          [ Markup.button.callback(this.i18n.t("dict.buttons.common.order_product"), "order") ],
          [ Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction) ],
        ],
      )
    } else {
      return Markup.inlineKeyboard([
          sliderButtons,
          [ Markup.button.callback(this.i18n.t("dict.buttons.common.back"), cancelAction) ],
        ],
      )
    }
  }
}
