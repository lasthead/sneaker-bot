import {Action, Ctx, InjectBot, On, Scene, SceneEnter, SceneLeave} from 'nestjs-telegraf';
import {I18nService} from "nestjs-i18n";
import {ShopButtons} from "./shop.buttons";
import {ProductsService} from "./catalog/products/products.service";
import {ShopUpdate} from "./shop.update";
import {Delivery, getSceneSessionState, getUserFromCtx, OrderStatuses, updateMessageById,} from "../helpers/ctx";
import {Product} from "./catalog/products/products.model";
import {InjectModel} from "@nestjs/sequelize";
import {Order} from "./catalog/order/order.model";
import {Repository} from "sequelize-typescript";
import {Size} from "./catalog/sizes/sizes.model";
import {Context, Telegraf} from "telegraf";
import {Brand} from "./catalog/brands/brands.model";
import {TextHelper} from "../helpers/textHelper";

const { Op } = require("sequelize");


@Scene('OrdersViewScene')
export class OrdersViewScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private productService: ProductsService,
    private shopUpdate: ShopUpdate,
    private textHelper: TextHelper,
    @InjectModel(Order) private orderRepository: Repository<Order>,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx) {
    await this.showOrdersList(ctx);
  }

  async showOrdersList(ctx) {
    const user = getUserFromCtx(ctx);
    try {
      const orders = await this.orderRepository.findAll(
        {
          where: {
            user_id: user.id,
            status: { [Op.not]: [OrderStatuses.Cancelled, OrderStatuses.Archived, OrderStatuses.Done] },
          },
          include: Product
        }
      );

      const ordersList = orders.map((order) => ({
        id: order.id,
        name: this.i18n.t(`dict.order.status.${order.status}`) + ` ${order.product.article}`,
      }));
      await ctx.deleteMessage();

      const key = ordersList.length > 0 ? 'your_orders' : 'your_dont_have_orders';

      await ctx.reply(this.i18n.t(`dict.order.${key}`),
        {
          parse_mode: 'HTML',
          reply_markup: this.appButtons.ordersList(ordersList, 'go-back', 'order').reply_markup
        });
    } catch (e) {
      console.error(e);
    }
  }

  @Action(/^order-(\w+)$/)
  async orderView(ctx) {
    if ("callback_query" in ctx.update) {
      const orderId = ctx.match[1];
      const order = await this.orderRepository.findByPk(orderId,
        {
          include: [{model: Product, include: [Brand]}, Size]
        }
      );

      const chat_id = ctx.update.callback_query.message.chat.id;
      const orderCaption = this.textHelper.getOrderViewDescription(ctx, order);

      let button = {
        name: this.i18n.t('dict.buttons.order.product_received'),
          id: `product_received-${order.id}`,
      };

      if (order.status === OrderStatuses.Process || order.status === OrderStatuses.Confirmed) {
        button = {
            name: this.i18n.t('dict.buttons.order.cancel_order'),
            id: `cancel-order-${order.id}`,
          };
      }

      const buttonsList = [
        button,
      ];

      try {
        await ctx.deleteMessage();

        if (order.sended_product_photo) {
          await this.bot.telegram.sendPhoto(chat_id, {source: order.sended_product_photo}, {
            reply_markup: this.appButtons.buttonsList(buttonsList, 'to-orders').reply_markup,
            caption: orderCaption,
            parse_mode: 'HTML',
          });
        } else {
          await this.bot.telegram.callApi('sendPhoto',
            {
              chat_id,
              photo: order.product.picture,
              caption: orderCaption,
              reply_markup: this.appButtons.buttonsList(buttonsList, 'to-orders').reply_markup,
              parse_mode: 'HTML'
            },
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  @Action("to-orders")
  async toOrders(ctx) {
    await this.showOrdersList(ctx);
  }

  @Action(/^product_received-(\w+)$/)
  async productRecived(ctx) {
    const orderId = ctx.match[1];
    try {
      await this.orderRepository.update({
        status: OrderStatuses.Done,
      }, { where: { id: orderId } });
      await this.toOrders(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action(/^cancel-order-(\w+)$/)
  async cancelOrders(ctx) {
    const orderId = ctx.match[1];
    try {
      await this.orderRepository.update({
        status: OrderStatuses.Cancelled,
      }, { where: { id: orderId } });
      await this.toOrders(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action("go-back")
  async getCatalog(ctx) {
    try {
      await this.shopUpdate.startCommand(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @On('message')
  async onUserMessage(ctx) {
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
      } catch (e) {
        console.error(e, 'onUserMessage, order view');
      }
    }
  }

  @SceneLeave()
  async leave() {
    console.log('leave')
  }
}
