import {Action, Ctx, InjectBot, On, Scene, SceneEnter} from "nestjs-telegraf";
import {Context, Markup, Scenes, Telegraf} from "telegraf";
import {
  deleteUserMessage,
  Delivery,
  getOrderStep,
  getSceneSessionState, getUserFromCtx, PostType,
  putToSceneSessionState, sendErrorNotify,
  setOrderStep,
  setSceneSessionState,
  setSessionOrderFormParam,
  updateMessageById,
} from "../helpers/ctx";
import {ShopButtons} from "./shop.buttons";
import {I18nService} from "nestjs-i18n";
import {ShopUpdate} from "./shop.update";
import {HttpService} from '@nestjs/axios'
import * as fs from "fs";
import {InjectModel} from "@nestjs/sequelize";
import {Order} from "./catalog/order/order.model";
import {Repository} from "sequelize-typescript";
import {Size} from "./catalog/sizes/sizes.model";
import {OrderDto} from "./catalog/order/dto/Order.dto";
import {ShopSettingsModel} from "./settings/shop.settings.model";
import {TextHelper} from "../helpers/textHelper";
import {Product} from "./catalog/products/products.model";
import {Brand} from "./catalog/brands/brands.model";

enum OrderTextType {
  CITY = 'choose_city',
  COUNTRY = 'choose_country',
  ADDRESS_CDEK = 'choose_address_cdek',
  CLIENT_ADDRESS = 'choose_client_address',
  INDEX = 'choose_index',
  PHONE = 'choose_phone',
  FIO_RECIPIENT = 'fio_recipient',
  RECIPIENT_ADDRESS = 'recipient_address',
  RECIPIENT_PHONE = 'choose_recipient_phone',
  AMOUNT_DELIVERY = 'amount_cash_on_delivery',
  PASSPORT_RECIPIENT = 'passport_recipient',
  BIRTHDAY_RECIPIENT = 'birthday_recipient',
}

@Scene('ProductOrderScene')
export class ProductOrderScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private shopUpdate: ShopUpdate,
    private readonly httpService: HttpService,
    private textHelper: TextHelper,
    @InjectModel(Order) private orderRepository: Repository<Order>,
    @InjectModel(Size) private sizeRepository: Repository<Size>,
    @InjectModel(ShopSettingsModel) private shopSettings: Repository<ShopSettingsModel>,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx) {
    setOrderStep(ctx, 'fio');
    try {
      const state = getSceneSessionState(ctx);
      const result = await ctx.reply(this.i18n.t('dict.order.fio'),
        { parse_mode: 'HTML', reply_markup: this.appButtons.buttonsList([], 'cancel-order').reply_markup });

      setSceneSessionState(ctx, {
        ...state,
        lastSentMessage: result.message_id,
      });
    } catch (e) {
      console.error(e);
      await sendErrorNotify(ctx);
    }
  }

  async stepRouter(ctx, value, mode = 'next') {
    const currentStep = getOrderStep(ctx);
    if (mode === 'next') {
      const delivery = getSceneSessionState(ctx)?.orderForm?.delivery_method;
      const postType = getSceneSessionState(ctx)?.orderForm?.post_type;

      switch (currentStep) {
        case 'fio':
          setSessionOrderFormParam(ctx, { fio: value }); // save user data
          await this.setDelivery(ctx); // go to next step
          break;
        case 'delivery_method':
          setSessionOrderFormParam(ctx, { delivery_method: value });
          if (value === Delivery.CDEK) {
            await this.writeOrderText(ctx, OrderTextType.CITY, 'city'); // go to next step
          } else {
            await this.selectPostType(ctx); // go to next step
          }
          break;
        case 'post_type_russia':
          setSessionOrderFormParam(ctx, { post_type: value });
          await this.writeOrderText(ctx, OrderTextType.CITY, 'city');
          break;
        case 'post_type_world':
          setSessionOrderFormParam(ctx, { post_type: value });
          await this.writeOrderText(ctx, OrderTextType.COUNTRY, 'country');
          break;
        case 'country':
          setSessionOrderFormParam(ctx, { country: value });
          await this.writeOrderText(ctx, OrderTextType.CITY, 'city');
          break;

        case 'city':
          setSessionOrderFormParam(ctx, { city: value });
          if (delivery === Delivery.CDEK) {
            await this.writeOrderText(ctx, OrderTextType.ADDRESS_CDEK, 'cdek_address');
          } else {
            await this.writeOrderText(ctx, OrderTextType.CLIENT_ADDRESS, 'client_address');
          }
          break;
        case 'client_address':
          setSessionOrderFormParam(ctx, { delivery_address: value });
          await this.writeOrderText(ctx, OrderTextType.INDEX, 'client_index');
          break;
        case 'client_index':
          setSessionOrderFormParam(ctx, { index: value });
          await this.writeOrderText(ctx, OrderTextType.PHONE, 'phone');
          break;
        case 'cdek_address':
          setSessionOrderFormParam(ctx, { delivery_address: value });
          await this.writeOrderText(ctx, OrderTextType.PHONE, 'phone');
          break;
        case 'phone':
          setSessionOrderFormParam(ctx, { phone: value });
          if (delivery === Delivery.CDEK) {
            await this.payForDelivery(ctx);
          } else if (postType === PostType.RUSSIA){
            await this.selectCashOnDelivery(ctx);
          } else {
            await this.payForOrder(ctx);
          }
          break;
        case 'cash_on_delivery_no':
          setSessionOrderFormParam(ctx, { cash_on_delivery: value });
          await this.payForOrder(ctx);
          break;
        case 'cash_on_delivery_yes':
          setSessionOrderFormParam(ctx, { cash_on_delivery: value });
          if (getSceneSessionState(ctx)?.is_club_member) {
            await this.writeOrderText(ctx, OrderTextType.FIO_RECIPIENT, 'set_fio_recipient');
          } else {
            await this.commentForOrder(ctx);
          }
          break;
        case 'set_fio_recipient':
          setSessionOrderFormParam(ctx, { fio_recipient: value });
          await this.writeOrderText(ctx, OrderTextType.RECIPIENT_ADDRESS, 'set_recipient_address');
          break;
        case 'set_recipient_address':
          setSessionOrderFormParam(ctx, { recipient_address: value });
          await this.writeOrderText(ctx, OrderTextType.RECIPIENT_PHONE, 'set_recipient_phone');
          break;
        case 'set_recipient_phone':
          setSessionOrderFormParam(ctx, { recipient_phone: value });
          await this.writeOrderText(ctx, OrderTextType.AMOUNT_DELIVERY, 'set_recipient_amount_delivery');
          break;
        case 'set_recipient_amount_delivery':
          setSessionOrderFormParam(ctx, { recipient_amount_delivery: value });
          await this.writeOrderText(ctx, OrderTextType.PASSPORT_RECIPIENT, 'set_recipient_passport');
          break;
        case 'set_recipient_passport':
          setSessionOrderFormParam(ctx, { passport_recipient: value });
          await this.writeOrderText(ctx, OrderTextType.BIRTHDAY_RECIPIENT, 'set_recipient_birthday');
          break;
        case 'set_recipient_birthday':
          setSessionOrderFormParam(ctx, { birthday_recipient: value });
          await this.commentForOrder(ctx);
          break;

        case 'pay_for_delivery':
          setSessionOrderFormParam(ctx, { pay_for_delivery: value });
          await this.payForOrder(ctx);
          break;
        case 'pay_for_order':
          await this.photoProcess(ctx);
          break;
        case 'pay_by_reserve':
          setSessionOrderFormParam(ctx, { pay_by_reserve: 'yes' });
          await this.commentForOrder(ctx);
          break;
        case 'upload_receipt':
          setSessionOrderFormParam(ctx, { uploaded_receipt: value });
          await this.commentForOrder(ctx);
          break;
        case 'order_preview':
          await deleteUserMessage(ctx);
          setSessionOrderFormParam(ctx, { comment: value });
          await this.getOrderPreview(ctx);
          break;
      }
    }
  }

  @On("message")
  async checkUserText(@Ctx() ctx) {
    // @ts-ignore
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
      } catch (e) {
        console.log(e, 'checkUserText');
      }
      return;
    }
    await this.stepRouter(ctx, ctx.message.text);
  }

  async setDelivery(ctx) {
    try {
      await deleteUserMessage(ctx);
      await updateMessageById(ctx, this.i18n.t('dict.order.delivery'),
        this.appButtons.buttonsList(
          [
            {
              name: this.i18n.t('dict.order.cdek'),
              id: Delivery.CDEK,
            },
            {
              name: this.i18n.t('dict.order.post_ru'),
              id: Delivery.POSTRU,
            },
          ], 'cancel-order', 'delivery').reply_markup,
        {
          message_id: Number(getSceneSessionState(ctx).lastSentMessage),
          chat_id: ctx.chat.id,
        }
      )
    } catch (e) {
      console.error(e);
    }
  }

  @Action(/^delivery-(\w+)$/)
  async onSelectedDelivery(@Ctx() ctx: Scenes.SceneContext) {
    // @ts-ignore
    const delivery = ctx.match[1];
    setOrderStep(ctx,'delivery_method');
    await this.stepRouter(ctx, delivery);
  }

  @Action(/^sent_in_(\w+)$/)
  async onSelectedPostType(@Ctx() ctx: Scenes.SceneContext) {
    // @ts-ignore sent_in_world
    const type_sent = ctx.match[1];
    setOrderStep(ctx,`post_type_${type_sent}`);
    await this.stepRouter(ctx, type_sent);
  }

  @Action(/^cash_on_delivery_(\w+)$/)
  async onSelectedCashDelivery(@Ctx() ctx: Scenes.SceneContext) {
    // @ts-ignore sent_in_world
    const value = ctx.match[1];
    setOrderStep(ctx,`cash_on_delivery_${value}`);
    await this.stepRouter(ctx, value);
  }

  async selectPostType(ctx) {
    await deleteUserMessage(ctx);
    await updateMessageById(ctx, this.i18n.t('dict.order.choose_type_sent'),
      this.appButtons.buttonsList([
        {
          name: this.i18n.t('dict.order.russia'),
          id: 'sent_in_russia',
        },
        {
          name: this.i18n.t('dict.order.world'),
          id: 'sent_in_world',
        },
      ], 'cancel-order').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      }
    );
  }

  async payForDelivery(ctx) {
    await deleteUserMessage(ctx);
    await updateMessageById(ctx, this.i18n.t('dict.order.choose_payment_delivery'),
      this.appButtons.buttonsList([
        {
          name: this.i18n.t('dict.order.now'),
          id: 'now',
        },
        {
          name: this.i18n.t('dict.order.after'),
          id: 'after',
        },
      ], 'cancel-order', 'pay_method').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      },
    );
  }

  @Action(/^pay_method-(\w+)$/)
  async onPayForDelivery(ctx) {
    // @ts-ignore
    const payment_method = ctx.match[1];
    setOrderStep(ctx,'pay_for_delivery');
    await this.stepRouter(ctx, payment_method);
  }

  @Action('pay_by_reserve')
  async onPayByReserve(ctx) {
    setOrderStep(ctx,'pay_by_reserve');
    await this.stepRouter(ctx, 'pay_by_reserve');
  }

  async selectCashOnDelivery(ctx) {
    //cash_on_delivery
    setOrderStep(ctx,'cash_on_delivery');
    await deleteUserMessage(ctx);
    await updateMessageById(ctx, this.i18n.t('dict.order.cash_on_delivery'),
      this.appButtons.buttonsList([
        {
          name: this.i18n.t('dict.yes'),
          id: 'cash_on_delivery_yes',
        },
        {
          name: this.i18n.t('dict.no'),
          id: 'cash_on_delivery_no',
        },
      ], 'cancel-order').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      }
    );
  }


  async payForOrder(ctx) {
    setOrderStep(ctx,'pay_for_order');
    await deleteUserMessage(ctx);
    const buttons = getSceneSessionState(ctx).is_club_member ? [
        {
          name: this.i18n.t('dict.order.pay_by_reserve'),
          id: 'pay_by_reserve',
        },
      ] : [];
    await updateMessageById(ctx, this.i18n.t('dict.order.send_receipt'),
      this.appButtons.buttonsList(buttons, 'cancel-order').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      }
    );
  }

  async photoProcess(ctx) {
    if (ctx.message.text === '/start') {
      await ctx.scene.leave();
      await this.shopUpdate.startCommand(ctx);
      return;
    }

    if (!ctx?.update.message?.photo) {
      try {
        await deleteUserMessage(ctx);
        const buttons = getSceneSessionState(ctx).is_club_member ? [
          {
            name: this.i18n.t('dict.order.pay_by_reserve'),
            id: 'pay_by_reserve',
          },
        ] : [];
        await updateMessageById(ctx, this.i18n.t('dict.order.receipt_error'),
          this.appButtons.buttonsList(buttons, 'cancel-order').reply_markup,
          {
            message_id: Number(getSceneSessionState(ctx).lastSentMessage),
            chat_id: ctx.chat.id,
          }
        );
      } catch (e) {
        console.error(e);
        await sendErrorNotify(ctx);
      }

      return;
    }

    try {
      const fileId = ctx?.update.message?.photo[2].file_id || ctx?.update.message?.photo[1].file_id;
      const url = await ctx.telegram.getFileLink(fileId);
      const response = await this.httpService.axiosRef({
        url: url.href,
        method: 'GET',
        responseType: 'stream',
      });

      response.data.pipe(fs.createWriteStream(`./uploads/${ctx.update.message.from.id}_${fileId}.jpg`))
        .on('finish', async () => {
          await deleteUserMessage(ctx);
          setOrderStep(ctx,'upload_receipt');
          setSessionOrderFormParam(ctx, { receipt_id: fileId });
          await this.stepRouter(ctx, `./uploads/${ctx.update.message.from.id}_${fileId}.jpg`)
        })
        .on('error', e => console.error(e, 'error'));
    } catch (e) {
      console.error(e, 'photo_file_write');
    }
  }

  async commentForOrder(ctx) {
    if (!ctx.update?.message?.photo) {
      await deleteUserMessage(ctx);
    }
    await updateMessageById(ctx, this.i18n.t('dict.order.order_comment'),
      this.appButtons.buttonsList([
        {
          name: this.i18n.t('dict.order.skip'),
          id: 'get_order_preview',
        },
      ], 'cancel-order').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      }
    );
    setOrderStep(ctx,'order_preview');
  }

  async writeOrderText(ctx, type, step) {
    let postfixText = '';

    if (getSceneSessionState(ctx).orderForm.post_type === PostType.WORLD &&
      type !== OrderTextType.RECIPIENT_PHONE &&
      type !== OrderTextType.PHONE &&
      type !== OrderTextType.INDEX &&
      type !== OrderTextType.AMOUNT_DELIVERY &&
      type !== OrderTextType.PASSPORT_RECIPIENT &&
      type !== OrderTextType.BIRTHDAY_RECIPIENT
    ) {
      postfixText = this.i18n.t(`dict.order.latin_letters`);
    }

    await deleteUserMessage(ctx);
    await updateMessageById(ctx, this.i18n.t(`dict.order.${type}`) + postfixText,
      this.appButtons.buttonsList([], 'cancel-order', 'pay_method').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      },
    );
    setOrderStep(ctx,step);
  }

  textWithComma(text) {
    return text ? `${text}, ` : ``
  }

  @Action("get_order_preview")
  async getOrderPreview(ctx) {
    const { article, name, brand, price } = getSceneSessionState(ctx).orderedProduct;
    const { selectedSize } = getSceneSessionState(ctx);
    const {
      fio,
      delivery_method,
      delivery_address,
      pay_for_delivery,
      city,
      country = '',
      phone,
      summ,
      pay_by_reserve,
      cash_on_delivery,
      fio_recipient,
      recipient_address,
      recipient_phone,
      recipient_amount_delivery,
      passport_recipient,
      birthday_recipient,
      comment = this.i18n.t(`dict.no`),
      post_type,
    } = getSceneSessionState(ctx).orderForm;

    const postType = this.i18n.t(`dict.order.${post_type}`);
    const deliveryMethod = this.i18n.t(`dict.order.${delivery_method}`);
    const reserve = pay_by_reserve ? this.i18n.t(`dict.yes`) : this.i18n.t(`dict.no`);
    // view_order_user_post

    let form_view_1 = this.i18n.t('dict.order.view_order_user', {
      args: {
        fio,
        deliveryMethod,
        deliveryAddress: `${this.textWithComma(city)}${delivery_address}`,
        phone,
        reserve,
        summ,
        payForDelivery: this.i18n.t(`dict.order.${pay_for_delivery}`)
      }
    });

    if (delivery_method === Delivery.POSTRU) {
      form_view_1 = this.i18n.t('dict.order.view_order_user_post', {
        args: {
          fio,
          deliveryMethod,
          postType,
          deliveryAddress: `${this.textWithComma(country)}${this.textWithComma(city)}${delivery_address}`,
          city,
          phone,
          reserve,
          summ,
          cashOnDelivery: this.i18n.t(`dict.${cash_on_delivery}`),
        }
      });
    }

    if (getSceneSessionState(ctx).orderForm.cash_on_delivery === 'yes' && getSceneSessionState(ctx).is_club_member) {
      form_view_1 = form_view_1 + '\n' + this.i18n.t('dict.order.view_order_user_post_cash_delivery', {
        args: {
          fio_recipient,
          recipientAddress: recipient_address,
          recipientPhone: recipient_phone,
          recipientAmountDelivery: recipient_amount_delivery,
          passportRecipient: passport_recipient,
          birthdayRecipient: birthday_recipient,
        }
      });
    }

    form_view_1 = form_view_1 + this.i18n.t('dict.order.comment', { args: { comment } });

    const viewTextForm = this.i18n.t('dict.order.please_check_order') + '\n\n' +
      this.i18n.t('dict.order.view_order_product', {
        args: { article, model: `${brand.name} ${name}`, size: selectedSize, price }
      }) + '\n\n' + form_view_1

    await updateMessageById(ctx, viewTextForm,
      this.appButtons.buttonsList([
        {
          name: this.i18n.t('dict.buttons.common.accept'),
          id: 'accept_order',
        },
      ], 'cancel-order').reply_markup,
      {
        message_id: Number(getSceneSessionState(ctx).lastSentMessage),
        chat_id: ctx.chat.id,
      }
    );
    setOrderStep(ctx,'order_send');
  }

  @Action("accept_order")
  async acceptOrder(ctx) {
    const orderedProduct = getSceneSessionState(ctx).orderedProduct;
    const userData = getSceneSessionState(ctx).orderForm;
    const selectedSize = await this.sizeRepository.findOne({
      where: { size: getSceneSessionState(ctx).selectedSize }
    });

    const params: OrderDto = {
      product_id: orderedProduct.id,
      size_id: selectedSize.id,
      fio: userData.fio,
      city: userData.city,
      country: userData.country,
      delivery_method: userData.delivery_method,
      post_type: userData.post_type,
      phone: userData.phone,
      amount: orderedProduct.price,
      discount: userData.discount,
      username: getUserFromCtx(ctx).username,
      chat_id: ctx.update?.message?.chat?.id || ctx.update?.callback_query?.message?.chat?.id,
      user_id: getUserFromCtx(ctx).id,
      is_club_member: getSceneSessionState(ctx).is_club_member || false,
      pay_by_reserve: userData.pay_by_reserve,
      pay_for_delivery: userData.pay_for_delivery,
      cash_on_delivery: userData.cash_on_delivery,
      delivery_address: userData.delivery_address,
      uploaded_receipt: userData.uploaded_receipt,
      recipient_fio: userData.fio_recipient,
      recipient_address: userData.recipient_address,
      recipient_passport: userData.passport_recipient,
      recipient_birthday: userData.birthday_recipient,
      recipient_amount_delivery: userData.recipient_amount_delivery,
      recipient_phone: userData.recipient_phone,

      comment: userData.comment,
      is_active: true,
    }

    try {
       const newOrder = await this.orderRepository.create(params);
      await deleteUserMessage(ctx);
      await updateMessageById(ctx, this.i18n.t('dict.order.thanks_for_order'),
        Markup.inlineKeyboard([
          Markup.button.callback(this.i18n.t('dict.buttons.common.ok'), 'to_start'),
        ]).reply_markup,
        {
          message_id: Number(getSceneSessionState(ctx).lastSentMessage),
          chat_id: ctx.chat.id,
        },
      );


      const notificationsChat = await this.shopSettings.findOne({where: { setting_name: 'club_link', 'is_active': true }})
      const orderWithProduct = await this.orderRepository.findByPk(newOrder.id,
        {
          include: [{model: Product, include: [Brand]}, Size]
        }
      );

      if (notificationsChat?.value) {
        const orderCaption = this.textHelper.getShortOrderViewDescription(ctx, orderWithProduct);
        const product = getSceneSessionState(ctx).orderedProduct;

        if (orderWithProduct.uploaded_receipt && orderWithProduct.uploaded_receipt.length) {
          const recieptImgId = getSceneSessionState(ctx).orderForm?.receipt_id;
          if (recieptImgId && product?.picture) {
            await this.bot.telegram.sendMediaGroup(
              notificationsChat.value,
              [{
                type: 'photo',
                media: recieptImgId,
                caption: orderCaption,
                parse_mode: 'HTML'
              }, {
                type: 'photo',
                media: product.picture,
              }]);
          } else {
            await this.bot.telegram.sendPhoto(notificationsChat.value, {source: orderWithProduct.uploaded_receipt}, {
              caption: orderCaption,
              parse_mode: 'HTML',
            });
          }
        } else if (product?.picture) {
          await this.bot.telegram.sendPhoto(notificationsChat.value, product?.picture, {
            caption: orderCaption,
            parse_mode: 'HTML',
          });
        } else {
          await ctx.telegram.sendMessage(
            notificationsChat.value,
            orderCaption,
            { parse_mode: 'HTML' },
          );
        }
      }
    } catch (e) {
      console.error(e, new Date());
    }
  }

  @Action("to_start")
  async toStart(ctx) {
    try {
      await ctx.scene.leave();
      await this.shopUpdate.startCommand(ctx);
      return;
    } catch (e) {
      console.error(e);
      await sendErrorNotify(ctx);
    }
  }

  @Action("cancel-order")
  async cancelOrder(ctx: Scenes.SceneContext) {
    const prevScene = getSceneSessionState(ctx)?.router?.prevScene;

    putToSceneSessionState(ctx, {
      ...getSceneSessionState(ctx),
      orderForm: null,
    });
    try {
      await ctx.scene.enter(prevScene || 'ProductsViewScene', { ...getSceneSessionState(ctx) });
    } catch (e) {
      console.error(e);
    }
  }
}
