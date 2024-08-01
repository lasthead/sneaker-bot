import {Action, Ctx, InjectBot, On, Scene, SceneEnter, SceneLeave} from 'nestjs-telegraf';
import {I18nService} from "nestjs-i18n";
import {ShopButtons} from "./shop.buttons";
import {ProductsService} from "./catalog/products/products.service";
import {Context, Scenes, Telegraf} from "telegraf";
import {ShopUpdate} from "./shop.update";
import {
  setSceneSessionState,
  getSceneSessionState,
  setSceneProductViewCounter, deleteUserMessage,
} from "../helpers/ctx";
import {Product} from "./catalog/products/products.model";
import {Size} from "./catalog/sizes/sizes.model";
import {Brand} from "./catalog/brands/brands.model";
import {PRODUCT_EXTRA_CHARGE} from "../helpers/constants";
import * as fs from 'fs';
import * as path from 'path';
const { Op } = require("sequelize");


@Scene('ProductsViewScene')
export class ProductsViewScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly appButtons: ShopButtons,
    private productService: ProductsService,
    private shopUpdate: ShopUpdate,
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
  ) {}

  @SceneEnter()
  async enter(@Ctx() ctx: Scenes.SceneContext, data) {
    const { currentProductCnt, currentBrand } = getSceneSessionState(ctx);
    if (!currentBrand) {
      // @ts-ignore
      const brand = ctx.match[1];

      if (brand) {
        const productCollection = await this.productService.getProductsByBrand(brand);

        setSceneSessionState(ctx, {
          ...getSceneSessionState(ctx),
          is_club_member: ctx.state?.is_club_member,
          currentBrand: brand,
          currentProductCnt: currentProductCnt || 0,
          productsList: productCollection.map((product, index) => {
            return { index, id: product.id }
          })
        });
      }
    }
    try {
      await ctx.deleteMessage();
      await this.replyWithProductItem(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  @Action("next")
  async getNextProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productSlider(ctx);
  }

  @Action("prev")
  async getPrevProduct(@Ctx() ctx: Scenes.SceneContext) {
    await this.productSlider(ctx, "prev");
  }

  @Action("order")
  async onChooseProduct(@Ctx() ctx: Scenes.SceneContext) {
    const sizes = getSceneSessionState(ctx).sizes;
    if (sizes && sizes.length) {
      try {
        await ctx.editMessageReplyMarkup(
          this.appButtons.sizesList(sizes, 'back_to_product', 'select-size').reply_markup
        );
      } catch (e) {
        console.error(e, 'order onChooseProduct');
      }
    }
  }

  @Action(/^select-size-(\d+)$/)
  async onSelectSize(@Ctx() ctx: Scenes.SceneContext) {
    try {
      await ctx.deleteMessage();
      // @ts-ignore
      const size = ctx.match[1];
      await ctx.scene.enter('ProductOrderScene', {
        ...getSceneSessionState(ctx),
        selectedSize: size,
        router: {prevScene: 'ProductsViewScene'}
      });
    } catch (e) {
      console.error(e);
    }
  }

  @Action("back_to_product")
  async backToProduct(@Ctx() ctx: Scenes.SceneContext) {
    let {productsList} = getSceneSessionState(ctx);

    try {
      await ctx.editMessageReplyMarkup(
        this.appButtons.productViewButtons('exit-view', productsList.length > 1).reply_markup
      );
    } catch (e) {
      console.error(e);
    }
  }

  async replyWithProductItem(ctx: Scenes.SceneContext) {
    let chat_id = null;

    if ("callback_query" in ctx.update || "callback_query" in ctx.update) {
      chat_id = ctx.update?.callback_query.message.chat.id;
    } else if ("message" in ctx.update) {
      chat_id = ctx.update?.message.chat.id;
    } else {
      return;
    }

    let {productsList, currentProductCnt} = getSceneSessionState(ctx);

    const currProductId = productsList.find((o) => o.index === currentProductCnt)?.id
    const product = await Product.findByPk(currProductId, {
      include: [
        {
          as: 'sizes',
          model: Size,
          through: {
            where: { count: { [Op.gte]: 0} }
          },
        },
        {
          model: Brand
        }
      ]
    });

    //todo вынести в отдельный метод, дубль-код есть еще в размерах
    const discountPrice = product.price;
    const extraPrice = product.price + PRODUCT_EXTRA_CHARGE;
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

    const counterText = this.i18n.t('dict.counter', {
      args: {'cnt': currentProductCnt + 1, 'total': productsList.length}
    });

    const articleText = this.i18n.t('dict.article', {
      args: {'article': product.article}
    });

    const sizes = product.sizes ? product.sizes.map((size) => {
      return size.getDataValue('size');
    }) : [];

    const material = this.i18n.t('dict.material', {
      args: {'material': product.description}
    });

    let sizesText = this.i18n.t('dict.sizes_unavailable');

    if (sizes.length > 0) {
      sizesText = this.i18n.t('dict.sizes_available', {
        args: {'sizes': sizes.join(', ')}
      });
    }

    const link = product.link ? this.i18n.t('dict.link', {
      args: {'link': product.link}
    }): '';

    const productName = `${product.brand.name} ${product.name}`;

    const description = this.i18n.t('dict.product_description', {
      args: {counterText, articleText, productName, price, sizesText, link, material}
    });

    await setSceneSessionState(ctx, {
      ...getSceneSessionState(ctx),
      orderedProduct: product,
      sizes,
    });

    try {
      await this.bot.telegram.callApi('sendPhoto',
        {
          chat_id,
          photo: product.picture,
          caption: description,
          reply_markup: this.appButtons.productViewButtons(
            'exit-view',
            productsList.length > 1,
            sizes.length > 0).reply_markup,
          parse_mode: 'HTML'
        },
      );
    } catch (e) {
      try {
        const picturePath = 'assets/pictures/placeholder.png';
        const filePath = path.join(process.cwd(), 'src/', picturePath);
        const photo = fs.createReadStream(filePath);

        await this.bot.telegram.callApi('sendPhoto',
          {
            chat_id,
            photo: { source: photo },
            caption: description,
            reply_markup: this.appButtons.productViewButtons(
              'exit-view',
              productsList.length > 1,
              sizes.length > 0).reply_markup,
            parse_mode: 'HTML'
          },
        );
      } catch (e) {
        console.error(e, ' on send placeholder');
      }
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

  @Action("exit-view")
  async getCatalog(ctx) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.error(e);
    }
    await this.shopUpdate.getCatalog(ctx, false);
  }

  @On("message")
  async onUserMessage(ctx) {
    if (ctx.message.text === '/start') {
      try {
        await ctx.scene.leave();
        await this.shopUpdate.startCommand(ctx);
      } catch (e) {
        console.log(e, 'products.view.scene onUserMessage startCommand')
      }
    } else {
      try {
        await deleteUserMessage(ctx);
      } catch (e) {
        console.error(e);
      }
    }
  }

  @SceneLeave()
  async leave() {
    console.log("leave")
  }
}
