import {Action, Ctx, InjectBot, On, Scene, SceneEnter, SceneLeave} from 'nestjs-telegraf';
import {I18nService} from "nestjs-i18n";
import {ShopButtons} from "./shop.buttons";
import {ProductsService} from "./catalog/products/products.service";
import {ShopUpdate} from "./shop.update";
import {
  deleteUserMessage,
  Delivery,
  getSceneSessionState,
  getUserFromCtx,
  OrderStatuses, putToSceneSessionState, setSceneProductViewCounter,
  setSceneSessionState,
  updateMessageById,
} from "../helpers/ctx";
import {Product} from "./catalog/products/products.model";
import {InjectModel} from "@nestjs/sequelize";
import {Order} from "./catalog/order/order.model";
import {Repository} from "sequelize-typescript";
import {Size} from "./catalog/sizes/sizes.model";
import {Context, Scenes, Telegraf} from "telegraf";
import {Brand} from "./catalog/brands/brands.model";
import {ProductsViewScene} from "./products.view.scene";

const { Op } = require("sequelize");


@Scene('SearchByArticleScene')
export class SearchByArticleScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private shopUpdate: ShopUpdate,
    private productsViewScene: ProductsViewScene,
    @InjectModel(Size) private sizeRepository: Repository<Size>,
    @InjectModel(Product) private productRepository: Repository<Product>,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx) {
    try {
      await ctx.deleteMessage();
      const reply = await ctx.reply(this.i18n.t(`dict.search.by_article`), {
        parse_mode: 'HTML',
        reply_markup: this.appButtons.buttonsList([], 'go-back').reply_markup
      });
      setSceneSessionState(ctx, {
        ...getSceneSessionState(ctx),
        lastSentMessage: reply.message_id,
      });
    } catch (e) {
      console.error(e);
    }
  }

  @Action('go-back')
  async goBack(ctx) {
    await this.shopUpdate.getSearch(ctx);
  }

  @On("message")
  async checkUserMessage(@Ctx() ctx) {
    // @ts-ignore
    const text = ctx.message.text
    if (text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    try {
      await deleteUserMessage(ctx);
      const product = await this.productRepository.findOne({
        where: { article: { [Op.like]: '%' + text + '%' } }
      });
      if (product) {
        setSceneSessionState(ctx, {
          ...getSceneSessionState(ctx),
          currentProductCnt: 0,
          productsList: [{index: 0, id: product.id }],
          router: {
            prevScene: 'SearchByArticleScene'
          }
        })
        await this.productsViewScene.replyWithProductItem(ctx);
      } else {
        try {
          await updateMessageById(ctx, this.i18n.t(`dict.search.article_not_found`) + this.i18n.t(`dict.search.by_article`),
            this.appButtons.buttonsList([], 'cancel').reply_markup,
            {
              message_id: Number(getSceneSessionState(ctx).lastSentMessage),
              chat_id: ctx.chat.id,
            }
          );
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // exit product view
  @Action("exit-view")
  async getCatalog(ctx) {
    await this.enter(ctx);
  }

  @Action("order")
  async onChooseProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productsViewScene.onChooseProduct(ctx);
  }

  @Action(/^select-size-(\d+)$/)
  async onSelectSize(ctx) {
    await this.productsViewScene.onSelectSize(ctx);
  }

  @Action("back_to_product")
  async backToProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productsViewScene.backToProduct(ctx);
  }

  @SceneLeave()
  async leave() {
    console.log('leave')
  }
}
