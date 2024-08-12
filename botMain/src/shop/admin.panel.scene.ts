import {Action, Ctx, InjectBot, On, Scene, SceneEnter} from "nestjs-telegraf";
import {Context, Scenes, Telegraf} from "telegraf";
import {getSceneSessionState, isUserAdmin, OrderStatuses, sendErrorNotify, setSceneSessionState,} from "../helpers/ctx";
import {ShopButtons} from "./shop.buttons";
import {I18nService} from "nestjs-i18n";
import {ShopUpdate} from "./shop.update";
import {HttpService} from '@nestjs/axios'
import {InjectModel} from "@nestjs/sequelize";
import {Order} from "./catalog/order/order.model";
import {Repository} from "sequelize-typescript";
import {Size} from "./catalog/sizes/sizes.model";
import {ProductInterface} from "../googleDriveParser/interfaces";
import {initImport} from "../googleDriveParser/gDriveImport";
import {ProductsService} from "./catalog/products/products.service";
import {Op, or} from "sequelize";
import {Product} from "./catalog/products/products.model";
import * as dayjs from 'dayjs'
import {OrdersViewScene} from "./order.view.scene";
import {Brand} from "./catalog/brands/brands.model";
import {TextHelper} from "../helpers/textHelper";
import {UsersService} from "./users/users.service";

@Scene('AdminPanelScene')
export class AdminPanelScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private shopUpdate: ShopUpdate,
    private readonly httpService: HttpService,
    @InjectModel(Order) private orderRepository: Repository<Order>,
    @InjectModel(Size) private sizeRepository: Repository<Size>,
    private readonly productService: ProductsService,
    private ordersViewScene: OrdersViewScene,
    private textHelper: TextHelper,
    private readonly users: UsersService,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx) {
    try {
      const isAdmin = await isUserAdmin(ctx, this.users);
      if (!isAdmin) {
        try {
          await ctx.reply(this.i18n.t('dict.admin_panel.error_access'),
            {
              parse_mode: 'HTML',
            }
          );
        } catch (e) {
          console.log(e);
        }
        return;
      }

      await ctx.deleteMessage();
      const result = await ctx.reply(this.i18n.t('dict.admin_panel.desc'),
        {
          parse_mode: 'HTML',
          reply_markup: this.appButtons.adminButtons().reply_markup,
        });

      setSceneSessionState(ctx, {
        lastSentMessage: result.message_id,
      });
    } catch (e) {
      console.error(e);
      await sendErrorNotify(ctx);
    }
  }

  @Action("products-update")
  async productUpdate(ctx) {
    let status = null;

    try {
      const msg = await ctx.reply(this.i18n.t('dict.admin_panel.download_process'));

      const productsList: ProductInterface[] = await initImport({
        fileId: process.env.GOOGLE_DRIVE_FILE_ID,
      },false);

      await ctx.deleteMessage(msg.message_id);

      const msg2 = await ctx.reply(this.i18n.t('dict.admin_panel.import_process'));
      status = await this.productService.createProducts(productsList);

      await ctx.deleteMessage(msg2.message_id);
    } catch (e) {
      try {
        await ctx.deleteMessage();
        await ctx.reply(this.i18n.t('dict.admin_panel.products_update_fatal_error'),
          {
            parse_mode: 'HTML',
            reply_markup: this.appButtons.adminButtons().reply_markup,
          });
        console.error(e);
      } catch (e) {
        console.error(e);
      }
    }

    if (status === 'success') {
      try {
        await ctx.reply(this.i18n.t('dict.admin_panel.products_update_success'),
          {
            parse_mode: 'HTML',
            reply_markup: this.appButtons.adminButtons().reply_markup,
          });
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        await ctx.reply(this.i18n.t('dict.admin_panel.products_update_error'),
          {
            parse_mode: 'HTML',
            reply_markup: this.appButtons.adminButtons().reply_markup,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  @Action("orders-retail")
  async ordersListRetail(ctx) {
    await this.getOrdersList(ctx);
  }

  @Action("orders-shipping")
  async ordersListShipping(ctx) {
    await this.getOrdersList(ctx, true);
  }

  @Action("orders-archive")
  async ordersListArchive(ctx) {
    await this.getOrdersList(ctx, true, true);
  }

  async getOrdersList(ctx, clubMember = false, archive = false) {
    try {
      const requestCondition = archive
      ? {
        status: { [Op.or]: [OrderStatuses.Cancelled, OrderStatuses.Archived, OrderStatuses.Done] },
      }
      : {
        is_club_member: clubMember,
        status: { [Op.not]: [OrderStatuses.Cancelled, OrderStatuses.Archived, OrderStatuses.Done] },
      }

      const orders = await this.orderRepository.findAll(
        {
          where: requestCondition,
          limit: 20,
          order: [
            ['createdAt', 'DESC'],
          ],
          include: [Product, Size]
        }
      );

      const dateTemplate = 'DD.MM.YY HH:MM';
      const ordersList = orders.map((order) => ({
        id: order.id,
        name: this.i18n.t(`dict.admin_panel.${order.status}`) +
          `(${order.fio.slice(0,35)}) `
          + dayjs(order.createdAt).format(dateTemplate)
          + ` - ${order.product.article} - ${order.size.size}`,
      }));

      await ctx.deleteMessage();
      await ctx.reply(this.i18n.t(`dict.admin_panel.choose_order`),
        {
          parse_mode: 'HTML',
          reply_markup: this.appButtons.ordersList(ordersList, 'exit-orders-list', 'order').reply_markup
        });
    } catch (e) {
      console.error(e);
    }
  }

  @Action("exit-panel")
  async exitPanel(ctx: Scenes.SceneContext) {
    try {
      await this.shopUpdate.startCommand(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action("exit-orders-list")
  async exitOrdersList(ctx: Scenes.SceneContext) {
    try {
      await this.enter(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action(/^order-(\w+)$/)
  async orderView(ctx, id = null) {
    if ("callback_query" in ctx.update) {
      const orderId = ctx.match[1] || id;
      try {
        ctx.deleteMessage();
        await this.showOrder(ctx, orderId);

      } catch (e) {
        console.error(e);
      }
    }
  }


  @Action(/^change-order-status-(\w+)$/)
  async showOrderStatus(ctx) {
    if ("callback_query" in ctx.update) {
      const orderId = ctx.match[1];
      try {
        await ctx.deleteMessage();
        setSceneSessionState(ctx, {
          orderForm: { orderId }
        });
        await ctx.reply(this.i18n.t('dict.admin_panel.write_track_code'),
          {
            parse_mode: 'HTML',
            reply_markup: this.appButtons.buttonsList([
              {
                name: this.i18n.t('dict.admin_panel.status.cancelled'),
                id: `set-status-${OrderStatuses.Cancelled}`,
              },
              {
                name: this.i18n.t('dict.admin_panel.status.process'),
                id: `set-status-${OrderStatuses.Process}`,
              },
              {
                name: this.i18n.t('dict.admin_panel.status.confirmed'),
                id: `set-status-${OrderStatuses.Confirmed}`,
              },
              {
                name: this.i18n.t('dict.admin_panel.status.is_sent'),
                id: `set-status-${OrderStatuses.IsSent}`,
              },
              {
                name: this.i18n.t('dict.admin_panel.status.archived'),
                id: `set-status-${OrderStatuses.Archived}`,
              },
            ], `order-${orderId}`, '', false, 1).reply_markup
          });
      } catch (e) {
        console.error(e);
      }
    }
  }

  @Action(/^set-status-(\w+)$/)
  async changeOrderStatus(ctx) {
    if ("callback_query" in ctx.update) {
      const status = ctx.match[1];
      const orderId = getSceneSessionState(ctx)?.orderForm?.orderId;
      if (orderId) {
        try {
          await this.orderRepository.update({
            status,
          }, { where: { id: orderId } });
          await ctx.deleteMessage();
          setSceneSessionState(ctx, {});

          if ([OrderStatuses.Confirmed, OrderStatuses.IsSent].includes(status)) {
            const order = await this.orderRepository.findByPk(orderId,
              {
                include: [{model: Product, include: [Brand]}, Size]
              }
            );
            const orderName = `${order.product.brand.name} ${order.product.name} ${order.size.size} (EU)`;
            if (order.chat_id) {
              await this.shopUpdate.startCommand(ctx, order.chat_id, status, orderName);
            }
          }

          await this.showOrder(ctx, orderId);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  @Action(/^set-track-code-(\w+)$/)
  async goToClientChat(ctx) {
    if ("callback_query" in ctx.update) {
      const orderId = ctx.match[1];
      try {
        await ctx.deleteMessage();
        setSceneSessionState(ctx, {
          ...getSceneSessionState(ctx),
          currentStep: 'set-track-code',
          orderForm: { orderId },
        });
        await ctx.reply(this.i18n.t('dict.admin_panel.write_track_code'),
          {
            parse_mode: 'HTML',
            reply_markup: this.appButtons.buttonsList([], `order-${orderId}`).reply_markup
          });
      } catch (e) {
        console.error(e);
      }
    }
  }

  @On("message")
  async actionOnMessage(ctx) {
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
      } catch (e) {
        console.log(e, 'actionOnMessage in admin panel')
      }
      return;
    }

    const currentStep = getSceneSessionState(ctx)?.currentStep;
    const orderId = getSceneSessionState(ctx)?.orderForm?.orderId;
    if (currentStep === 'set-track-code') {

      await this.updateOrderTrackCode(ctx, orderId);
    }
  }

  async updateOrderTrackCode(ctx, orderId) {
    const track = ctx.message.text;
    try {
      await this.orderRepository.update({
        track_code: track,
      }, { where: { id: orderId } });
      await ctx.deleteMessage();
      setSceneSessionState(ctx, {});
      await this.showOrder(ctx, orderId);
    } catch (e) {
      console.error(e);
    }
  }

  @Action(/^back-to-list-(\w+)$/)
  async backToList(ctx) {
    if ("callback_query" in ctx.update) {
      const shippingList = ctx.match[1] === 'shipping';
      setSceneSessionState(ctx, {});
      await this.getOrdersList(ctx, shippingList);
    }
  }

  @Action(/^show-receipt-(\w+)$/)
  async showReceipt(ctx) {
    if ("callback_query" in ctx.update) {
      const orderId = ctx.match[1];
      try {
        ctx.deleteMessage();
        const chat_id = ctx?.update?.callback_query?.message.chat.id || ctx.update.message.chat.id;
        const order = await this.orderRepository.findByPk(orderId);

        await this.bot.telegram.sendPhoto(chat_id, {source: order.uploaded_receipt}, {
          reply_markup: this.appButtons.buttonsList([], `order-${orderId}`, '', false, 1).reply_markup,
          caption: this.i18n.t('dict.admin_panel.receipt'),
          parse_mode: 'HTML',
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  async showOrder(ctx, orderId) {
    const order = await this.orderRepository.findByPk(orderId,
      {
        include: [{model: Product, include: [Brand]}, Size]
      }
    );

    const chat_id = ctx?.update?.callback_query?.message.chat.id || ctx.update.message.chat.id;

    const orderCaption = this.textHelper.getOrderViewDescription(ctx, order, true);

    let buttonsList = [
      {
        name: this.i18n.t('dict.admin_panel.set_track_code'),
        id: `set-track-code-${order.id}`,
      },
      {
        name: this.i18n.t('dict.admin_panel.upload_photo_product'),
        id: `upload-photo-product-${order.id}`,
      },
      {
        name: this.i18n.t('dict.admin_panel.change_order_status'),
        id: `change-order-status-${order.id}`,
      },
    ];

    if (order?.user_id && order?.username) {
      buttonsList = [
        ...buttonsList,
        {
          name: this.i18n.t('dict.admin_panel.go_to_client_chat'),
          // @ts-ignore
          url: true,
          id: `tg://user?id=${order.user_id}`,
        }
      ];
    } else {
      buttonsList = [
        ...buttonsList,
        {
          name: this.i18n.t('dict.admin_panel.client_chat_error'),
          // @ts-ignore
          id: `empty-button`,
        }
      ];
    }

    if (order.uploaded_receipt) {
      buttonsList = [
        ...buttonsList,
        {
          name: this.i18n.t('dict.admin_panel.show_receipt'),
          id: `show-receipt-${order.id}`,
        },
      ]
    }

    const cancelButton = `back-to-list-${order.is_club_member ? 'shipping' : 'retail'}`;

    try {
      const picName = order.product.article;
      let picUrl = this.productService.findLocalPicture(picName);

      if (!picUrl) {
        picUrl = await this.productService.downloadImage(picName, order.product.picture);
      }

      if (order.sended_product_photo) {
        try {
          await this.bot.telegram.sendPhoto(chat_id, {source: order.sended_product_photo}, {
            reply_markup: this.appButtons.buttonsList(buttonsList, cancelButton, '', false, 1).reply_markup,
            caption: orderCaption,
            parse_mode: 'HTML',
          });
        } catch (e) {
          await this.bot.telegram.sendPhoto(chat_id, {source: picUrl || this.productService.getPlaceholder()}, {
            reply_markup: this.appButtons.buttonsList(buttonsList, cancelButton, '', false, 1).reply_markup,
            caption: orderCaption,
            parse_mode: 'HTML',
          });
        }
      } else {
        try {
          await this.bot.telegram.callApi('sendPhoto',
            {
              chat_id,
              photo: order.product.picture,
              caption: orderCaption,
              reply_markup: this.appButtons.buttonsList(buttonsList, cancelButton, '', false, 1).reply_markup,
              parse_mode: 'HTML'
            },
          );
        } catch (e) {
          await this.bot.telegram.sendPhoto(chat_id, {source: picUrl || this.productService.getPlaceholder()}, {
            reply_markup: this.appButtons.buttonsList(buttonsList, cancelButton, '', false, 1).reply_markup,
            caption: orderCaption,
            parse_mode: 'HTML',
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
