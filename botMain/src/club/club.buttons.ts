import {Markup} from "telegraf";
import {I18nService} from "nestjs-i18n";
import {Injectable} from "@nestjs/common";

@Injectable()
export class ClubButtons {
  constructor(
    private readonly i18n: I18nService,
  ) {}

  public actionButtons(showUpdateBtn = false) {
    let btns = [
      Markup.button.callback(this.i18n.t("dict.club.buttons.button_description"), "description"),
      Markup.button.callback(this.i18n.t("dict.club.buttons.button_pay"), "to_pay"),
    ]

    if (showUpdateBtn) {
      btns = [
        Markup.button.callback(this.i18n.t("dict.club.buttons.button_description"), "description"),
        Markup.button.callback(this.i18n.t("dict.club.buttons.button_pay"), "to_pay"),
        Markup.button.callback(this.i18n.t("dict.club.buttons.update_club_link"), "show_passphrase"),
      ]
    }
    return Markup.inlineKeyboard(btns, { columns: 1 })
  }

  public buttonPrev() {
    return Markup.inlineKeyboard([
        Markup.button.callback(this.i18n.t("dict.club.buttons.back"), "to_start"),
      ],
    )
  }

  public buttonPassphrase(key) {
    return Markup.inlineKeyboard([
        Markup.button.callback(key, "dummy"),
        Markup.button.callback(this.i18n.t("dict.club.buttons.back"), "to_start"),
      ],
    )
  }

  public buttonPayment(link) {
    return Markup.inlineKeyboard([
        Markup.button.url(this.i18n.t("dict.club.buttons.button_transaction"), link),
      ],
    )
  }

  public buttonClubLink(link) {
    return Markup.inlineKeyboard([
        Markup.button.url(this.i18n.t("dict.club.buttons.go_to_club"), link),
      ],
    )
  }
}
