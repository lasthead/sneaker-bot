import {Logger} from '@nestjs/common';
import {Action, Ctx, InjectBot, On, Start, Update} from "nestjs-telegraf";
import {Context, Scenes, session, Telegraf} from "telegraf";
import {ShopButtons} from "./shop.buttons";
import {I18nService} from "nestjs-i18n";
import {BrandsService} from "./catalog/brands/brands.service";
import {CollectionsService} from "./catalog/collections/collections.service";
import {deleteUserMessage, isUserAdmin, updateMessage} from "../helpers/ctx";
import {TgGroupsService} from "../club/tgGroups/tgGroups.service";
import {UsersService} from "./users/users.service";
import {InjectModel} from "@nestjs/sequelize";
import {Repository} from "sequelize-typescript";
import {ShopSettingsModel} from "./settings/shop.settings.model";

@Update ()
export class ShopUpdate {
  constructor(
    @InjectBot("shop") private readonly bot: Telegraf<Context>,
    @InjectBot('club') private readonly clubBot: Telegraf<Context>,
    private readonly i18n: I18nService,
    private readonly brandService: BrandsService,
    private readonly collectionService: CollectionsService,
    private readonly appButtons: ShopButtons,
    private readonly tgGroups: TgGroupsService,
    private readonly users: UsersService,
    @InjectModel(ShopSettingsModel) private shopSettings: Repository<ShopSettingsModel>,
  ) {}

  private readonly logger = new Logger(ShopUpdate.name);

  @Start()
  async startCommand(ctx: Context, chatId = null, updateStatus = null, orderName = null, userId = null) {
    try {
      const isAdmin = await isUserAdmin(ctx, this.users);
      let description = this.i18n.t('dict.start_description');

      if (updateStatus) {
        await ctx.telegram.sendMessage(
          chatId,
          this.i18n.t(`dict.status.${updateStatus}`, { args: {
            orderName
          }}) + '\n\n' + description,
          { parse_mode: 'HTML', reply_markup: this.appButtons.actionButtons(false).reply_markup },
        );
      } else {
        // @ts-ignore
        const firstname = ctx.update?.callback_query?.from?.first_name || ctx.message?.from?.first_name;
        if (firstname && firstname.length > 0) {
          description = `${this.i18n.t('dict.greeting', { args: { firstname }})}${description}`;
        }

        // await ctx.deleteMessage();
        await ctx.reply(description,
          { parse_mode: 'HTML', reply_markup: this.appButtons.actionButtons(isAdmin).reply_markup });
      }
    } catch (e) {
      console.error(e, 'on_shop_start');
    }
  }

  @Action("start")
  async backToStart(ctx: Context) {
    return await this.getStartMenu(ctx)
  }

  @Action("catalog")
  async getCatalog(ctx: Context, msgUpdate = true) {
      const brands = await this.brandService.getAllBrands();

      try {
        if (msgUpdate) {
          await updateMessage(
            ctx,
            this.i18n.t("dict.choose_brand"),
            this.appButtons.buttonsList(brands, "start", "brand", true),
          );
        } else {
          await ctx.reply(
            this.i18n.t("dict.choose_brand"),
            {
              parse_mode: 'HTML',
              reply_markup: this.appButtons.buttonsList(brands, "start", "brand", true).reply_markup
            },
          );
        }
      } catch (e) {
        console.error(e, 'get_catalog_error');
      }
  }

  @Action("admin-panel")
  async adminPanel(ctx) {
    ctx.scene.enter('AdminPanelScene', ctx.state);
  }

  @Action('search-size')
  async searchSize(ctx) {
    await this.checkIsClubMember(ctx);
    ctx.scene.enter('SearchBySizeScene', ctx.state);
  }

  @Action('search-article')
  async searchArticle(ctx) {
    await this.checkIsClubMember(ctx);
    ctx.scene.enter('SearchByArticleScene', ctx.state);
  }

  @Action('orders')
  async enterOrderScene(ctx) {
    ctx.scene.enter('OrdersViewScene', ctx.state);
  }

  @Action(/^brand-(\d+)$/)
  async getBrandCollections(ctx) {
    await this.checkIsClubMember(ctx);
    ctx.scene.enter('ProductsViewScene', ctx.state);
  }

  @Action("search")
  async getSearch(ctx) {
    try {
      const seasonTableLink = await this.shopSettings.findOne({
          where: {
            setting_name: 'season_table_link',
          },
      });

      const chat_id = ctx.update.callback_query.message.chat.id
      const message_id = ctx.update.callback_query.message.message_id
      await ctx.editMessageText(
        this.i18n.t("dict.search_description"),
        this.appButtons.searchButtons(seasonTableLink?.value),
        [chat_id, message_id]
      );
    } catch (e) {
      console.error(e, new Date());
    }
  }

  @Action("cancel")
  async cancelSearch(ctx) {
    return await this.getStartMenu(ctx)
  }

  async getStartMenu(ctx) {
    try {
      return await this.startCommand(ctx);
    } catch (e) {
      console.error(e, 'on_start_menu', new Date());
    }
  }

  async checkIsClubMember(ctx) {
    let chatMember = undefined;
    let chatMember2 = undefined;
    const activeGroup = await this.tgGroups.getActiveGroup();
    const userId = ctx.message?.from?.id || ctx.update?.callback_query?.from?.id;
    const userName = ctx.message?.from?.username
      || ctx.update?.callback_query?.from?.username
      || ctx.update?.callback_query?.from?.first_name
    console.log('userId:', userId, ctx.message, ctx.update?.callback_query, ctx);

    try {
      if (userId) {
        chatMember = await this.clubBot.telegram.getChatMember(Number(`${activeGroup[0].group_id}`), userId);
        console.log('check chat member');
        console.log(chatMember);
        console.log('chat1 user', userId, userName);
      }
    } catch (e) {
      console.error(userName, userId);
      console.error(e, 'check_club_member');
    }
    // try {
    //   chatMember2 = await this.clubBot.telegram.getChatMember(-, userId);
    //   console.log('chatMember2 ', chatMember2);
    //   console.log('chat2 user', userId, userName);
    // } catch (e) {
    //   console.error(userName, userId);
    //   console.error(e, 'check_club2_member');
    // }
    const is_club_member1 = chatMember && (chatMember?.status === 'member' || chatMember?.status === 'creator');
    // const is_club_member2 = chatMember2 && (chatMember2?.status === 'member' || chatMember2?.status === 'creator');

    ctx.state.is_club_member = is_club_member1; // || is_club_member2;
    // console.log(is_club_member1, is_club_member2, 'is chat member?', chatMember);
    return chatMember;
  }

  @On("message")
  async checkUserMessage(@Ctx() ctx) {
    // @ts-ignore
    const text = ctx.message.text
    if (text !== '/start') {
      try {
        await deleteUserMessage(ctx);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        await deleteUserMessage(ctx);
      } catch (e) {
        console.error(e);
      }
    }
  }

  upsert(values, condition) {
    return this.shopSettings
      .findOne({ where: condition })
      .then((obj) => {
        // update
        if(obj)
          return obj.update(values);
        // insert
        return this.shopSettings.create(values);
      })
  }

  @On('channel_post')
  async listener(ctx) {
    try {
      const ownerCommand = ctx.update.channel_post.text.toLowerCase()
        .trim().replace(/ /g,'').replace(/,/g,'');
      const settingKey = await this.shopSettings.findOne({ where: { setting_name: 'invite_to_notify_group_key' } });
      const passphrase = settingKey.value || 'hi,bot';
      if (ownerCommand.includes(passphrase)) {
        const group = ctx.update.channel_post.chat;
        await this.shopSettings.update({ is_active: false }, { where: { is_active: true, setting_name: 'club_link' } });
        this.upsert(
          { setting_name: "club_link", is_active: true, value: group.id },
          { value: group.id.toString() }
        )

        await ctx.reply(
          this.i18n.t('dict.on_add_to_system_group'),
        )
      }
    } catch (e) {
      console.error(e, 'channel_post');
    }
  }
}
