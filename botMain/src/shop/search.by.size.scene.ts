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
import {PRODUCT_EXTRA_CHARGE} from "../helpers/constants";
import * as fs from 'fs';
import * as path from 'path';

const { Op } = require("sequelize");


@Scene('SearchBySizeScene')
export class SearchBySizeScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private shopUpdate: ShopUpdate,
    private productService: ProductsService,
    private productsViewScene: ProductsViewScene,
    @InjectModel(Size) private sizeRepository: Repository<Size>,
    @InjectModel(Product) private productRepository: Repository<Product>,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx) {
    await this.showSizesList(ctx);
  }

  async showSizesList(ctx) {
    try {
      const sizes = await this.sizeRepository.findAll({
        include: [Product],
      });

      const sizesList = sizes.filter(o => o.products.length > 0)
        .map((size) => ({
          id: size.id,
          name: size.size + ' (EU)',
        }));

      await ctx.deleteMessage();
      const columns = !(sizesList.length % 3) ? 3 : 2;
      await ctx.reply(this.i18n.t(`dict.search.by_size`),
        {
          parse_mode: 'HTML',
          reply_markup: this.appButtons.searchSizesList(sizesList, 'go-back', columns).reply_markup
        });
    } catch (e) {

      console.error(e);
    }
  }

  @Action(/^size-(\d+)$/)
  async showSizeProducts(ctx) {
    const { currentProductCnt } = getSceneSessionState(ctx);

    const sizeId = ctx.match[1];
    const sizeProducts = await this.sizeRepository.findOne({
      where: {id: sizeId},
      include: [{
        model: Product,
        include: [Brand],
      }],
    });

    setSceneSessionState(ctx, {
      // todo: переделать: надо отдавать id а не size
      selectedSize: sizeProducts.size,
      is_club_member: getSceneSessionState(ctx).is_club_member,
      currentProductCnt: currentProductCnt || 0,
      productsList: sizeProducts.products.map((product, index) => {
        return { index, id: product.id }
      })
    });

    try {
      await ctx.deleteMessage();
      await this.replyWithProductItem(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action("next")
  async getNextProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productSlider(ctx, "next");
  }

  @Action("prev")
  async getPrevProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productSlider(ctx, "prev");
  }

  @Action("order")
  async onChooseProduct(@Ctx() ctx: Scenes.SceneContext) {
    try {
      await ctx.deleteMessage();
      await ctx.scene.enter('ProductOrderScene', {
        ...getSceneSessionState(ctx),
        router: { prevScene: 'SearchBySizeScene' }
      });
    } catch (e) {
      console.log(e, new Date());
    }
  }

  async productSlider(ctx: Scenes.SceneContext, mode = "next") {
    let {productsList, currentProductCnt} = getSceneSessionState(ctx);

    if (!productsList) return;

    if (mode === "prev") {
      currentProductCnt--;
      if (currentProductCnt < 0) {
        currentProductCnt = productsList.length - 1;
      }
    } else {
      currentProductCnt++;
      if (currentProductCnt > productsList.length - 1) {
        currentProductCnt = 0;
      }
    }

    setSceneProductViewCounter(ctx, currentProductCnt);
    try {
      await ctx.deleteMessage();
      await this.replyWithProductItem(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  async replyWithProductItem(ctx: Scenes.SceneContext) {
    if ("callback_query" in ctx.update) {
      let {productsList, currentProductCnt} = getSceneSessionState(ctx);
      const currProductId = productsList.find((o) => o.index === currentProductCnt)?.id
      const product = await Product.findByPk(currProductId, {
        include: [
          {
            model: Brand
          }
        ]
      });

      //todo вынести в отдельный метод, дубль-код есть еще в каталоге
      const discountPrice = product?.price || 0;
      const extraPrice = product?.price ? product.price + PRODUCT_EXTRA_CHARGE : 0;
      let price = '';

      if (getSceneSessionState(ctx).is_club_member) {
        price = this.i18n.t('dict.price', {
          args: {'price': extraPrice}
        }) + this.i18n.t('dict.your_price', {
          args: {'price': discountPrice}
        });
      } else {
        price = this.i18n.t('dict.price', {
          args: {'price': extraPrice}
        });
        product.price = extraPrice;
      }

      const chat_id = ctx.update.callback_query.message.chat.id;

      const counterText = this.i18n.t('dict.counter', {
        args: {'cnt': currentProductCnt + 1, 'total': productsList.length}
      });

      const articleText = this.i18n.t('dict.article', {
        args: {'article': product.article}
      });

      const material = this.i18n.t('dict.material', {
        args: {'material': product.description}
      });

      const link = product.link ? this.i18n.t('dict.link', {
        args: {'link': product.link}
      }): '';

      const productName = `${product.brand.name} ${product.name}`;

      const description = this.i18n.t('dict.product_description', {
        args: {counterText, articleText, productName, price, link, material}
      });

      await setSceneSessionState(ctx, {
        ...getSceneSessionState(ctx),
        orderedProduct: product,
      });

      try {
        const picName = product.article;
        let picUrl = this.productService.findLocalPicture(picName);

        if (!picUrl) {
          picUrl = await this.productService.downloadImage(picName, product.picture);
        }

        await this.bot.telegram.callApi('sendPhoto',
          {
            chat_id,
            photo: picUrl ? { source: picUrl } : product.picture,
            caption: description,
            reply_markup: this.appButtons.productViewButtons('go-to-sizes').reply_markup,
            parse_mode: 'HTML'
          },
        );
      } catch (e) {
        console.error(e);
        try {
          const picturePath = 'assets/pictures/placeholder.png';
          const filePath = path.join(process.cwd(), 'src/', picturePath);
          const photo = fs.createReadStream(filePath);

          await this.bot.telegram.callApi('sendPhoto',
            {
              chat_id,
              photo: { source: photo },
              caption: description,
              reply_markup: this.appButtons.productViewButtons('go-to-sizes').reply_markup,
              parse_mode: 'HTML'
            },
          );
        } catch (e) {
          console.error(e, ' on send placeholder');
        }
      }
    }
  }

  @On("message")
  async checkUserMessage(@Ctx() ctx) {
    const text = ctx.message.text;
    if (text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
        return;
      } catch (e) {
        console.error(e);
      }
    }
  }

  @Action('go-to-sizes')
  async goToSizes(ctx) {
    console.log('go-to-sizes');
    await this.showSizesList(ctx);
  }

  @Action('go-back')
  async goBack(ctx) {
    await this.shopUpdate.getSearch(ctx);
  }

  textWithComma(text) {
    return text ? `${text}, ` : ``
  }

  @SceneLeave()
  async leave() {
    console.log('leave')
  }
}
