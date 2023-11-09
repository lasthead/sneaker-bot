import {Ctx, On, Scene, SceneEnter, SceneLeave} from 'nestjs-telegraf';
import * as dayjs from 'dayjs'
import {I18nService} from "nestjs-i18n";
import * as EmailValidator from 'email-validator';
import {ClubButtons} from "./club.buttons";
import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';
import {InjectModel} from "@nestjs/sequelize";
import {TgGroup} from "./tgGroups/tgGroups.model";
import {Repository} from "sequelize-typescript";

@Scene('getEmailScene')
export class AppGetEmailScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ClubButtons,
  ) {}

  @SceneEnter()
  async enter(@Ctx() context) {
    const chat_id = context.update.callback_query.message.chat.id
    const message_id = context.update.callback_query.message.message_id

    context.editMessageText(this.i18n.t('dict.club.send_email'), {
      chat_id,
      message_id,
      parse_mode: 'HTML'
    });
  }

  @SceneLeave()
  async leave() {
    console.log('leave')
  }

  @On('message')
  async validEmail(ctx) {
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave()
        await ctx.reply(this.i18n.t('dict.club.start_description'), this.appButtons.actionButtons());
      } catch (e) {
        console.error(e, 'on valid email');
      }
      return
    }

    if (EmailValidator.validate(ctx.message.text)) {
      ctx.scene.enter('paymentScene')
    } else {
      ctx.reply(this.i18n.t('dict.club.validate.email.error'), {parse_mode: 'HTML'})
    }
  }
}

interface Timer {
  timeOut: {},
  timeBegin: number
}

@Scene('paymentScene')
export class ClubPaymentScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ClubButtons,
    @InjectModel(TgGroup) private tgGroupsService: Repository<TgGroup>,
  ) {}

  private timerId: Timer[] = []

  @SceneEnter()
  async enter(@Ctx() ctx) {
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave()
        await ctx.reply(this.i18n.t('dict.club.start_description'), this.appButtons.actionButtons());
      } catch (e) {
        console.error(e, 'on SceneEnter club.payment')
      }
      return
    }

    const activeGroup = await this.tgGroupsService.findOne({ where: { is_active: true } });

    let amount = '15000.00'

    // changes the amount 7 days before the end of the month (actually start's in 00:00)
    const d = new Date();
    const daysInMonth = dayjs(d).daysInMonth();
    const currentDay = Number(dayjs(d).format('D'));

    if (currentDay >= daysInMonth - 6) {
      amount = '3000.00';
    }

    const text = this.i18n.t('dict.club.payment_product_description', { args: { name: activeGroup.name }}) +
      this.i18n.t('dict.club.to_paid', {args: {amount}}) +
      this.i18n.t('dict.club.oferta', {
        args: {
          link: 'https://telegra.ph/Dogovor-oferta-na-predostavlenie-informacionno-konsultacionnyh-uslug-07-21'}
      }) +
      this.i18n.t('dict.club.payment_description2')

    const checkout = new YooCheckout({shopId: process.env.BILLING_SHOP_ID, secretKey: process.env.BILLING_SECRET_KEY})

    const idempotenceKey = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Date.now();

    const createPayload: ICreatePayment = {
      amount: {
        value: amount,
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: 'https://t.me/' + ctx.botInfo.username
      },
      receipt: {
        email: ctx.message.text,
        phone: null,
        items: [
          {
            description: `Подписка на ${activeGroup.name}`,
            quantity: '1',
            amount: {
              value: amount,
              currency: 'RUB'
            },
            vat_code: 1
          }
        ]
      },
      capture: 'true',
      description: `telegram-user: ${ctx.message.from.username || ctx.message.from.id}`
    }

    try {
      const payment = await checkout.createPayment(createPayload, idempotenceKey);

      const checkPayment = () => {
        const currTime = Math.floor(Date.now() / 1000)

        Promise.all([checkout.getPayment(payment.id)]).then(async (res) => {
          if (res[0].status === 'succeeded') {
            console.log("payment succeeded")

            const link = await ctx.telegram.createChatInviteLink(
              Number(activeGroup.group_id), {
                name: `link_for_@` + ctx.message.from.username || ctx.message.from.id,
                member_limit: 1
              }
            )

            await ctx.replyWithHTML(
              this.i18n.t('dict.club.payment_success', {args: {
                name: activeGroup.name
              }}), {
              reply_markup: this.appButtons.buttonClubLink(link.invite_link).reply_markup,
            })
            clearTimeout(this.timerId[payment.id]);
            // clear after succeed
            delete this.timerId[payment.id];
            await ctx.scene.leave()

          } else {
            if (!this.timerId[payment.id]) {
              this.timerId[payment.id] = {}

              this.timerId[payment.id].timeExpires = Math.floor(Date.now() / 1000) + 920
              this.timerId[payment.id].timeOut = setTimeout(() => {
                // pending
                checkPayment()
              }, 3000)

            } else if (currTime <= this.timerId[payment.id].timeExpires) {
              this.timerId[payment.id].timeOut = setTimeout(() => {
                // pending
                checkPayment()
              }, 3000)
            } else {
              console.log(currTime, this.timerId[payment.id].timeExpires, 'clear')
              ctx.reply('Что-то пошло не так. Платеж не прошел. Пожалуйста, введите /start, чтобы создать новый платеж и получить ссылку')
              clearTimeout(this.timerId[payment.id]);
              delete this.timerId[payment.id];
            }
          }
        })
      }

      checkPayment()

      await ctx.replyWithHTML(text, {
        reply_markup: this.appButtons.buttonPayment(payment.confirmation.confirmation_url).reply_markup,
        disable_web_page_preview: true,
      })
    } catch (error) {
      console.error(error);
    }
  }

  @SceneLeave()
  async leave() {
    console.log('leave')
  }
}
