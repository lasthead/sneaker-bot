import {Logger} from '@nestjs/common';
import {Action, InjectBot, Start, Update, On} from "nestjs-telegraf";
import {Context, Telegraf, Scenes, Markup} from "telegraf";
import {I18nService} from "nestjs-i18n";

import {ClubButtons} from "./club.buttons";
import {isUserAdmin, updateMessage} from "../helpers/ctx";
import {UsersService} from "../shop/users/users.service";
import {InjectModel} from "@nestjs/sequelize";
import {TgGroup} from "./tgGroups/tgGroups.model";
import {Repository} from "sequelize-typescript";
import {SettingsModel} from "./settings/settings.model";

@Update ()
export class ClubUpdate {
  constructor(
    @InjectBot('club') private readonly clubBot: Telegraf<Context>,
    @InjectModel(TgGroup) private tgGroupsService: Repository<TgGroup>,
    @InjectModel(SettingsModel) private settingsService: Repository<SettingsModel>,
    private readonly i18n: I18nService,
    private readonly appButtons: ClubButtons,
    private readonly users: UsersService,
  ) {}

  private readonly logger = new Logger(ClubUpdate.name);

  @Start()
  async startCommand(ctx: Context) {
    return;

    const isAdmin = await isUserAdmin(ctx, this.users);

    try {
      await ctx.reply(
        this.i18n.t('dict.club.start_description'),
        this.appButtons.actionButtons(isAdmin),
      )
    } catch (e) {
     console.error(e, 'club_payment_start');
    }
  }

  upsert(values, condition) {
    return this.tgGroupsService
      .findOne({ where: condition })
      .then((obj) => {
        // update
        if(obj)
          return obj.update(values);
        // insert
        return this.tgGroupsService.create(values);
      })
  }

  @Action('show_passphrase')
  async showSettingPassphrase(ctx) {
    try {
      const settingKey = await this.settingsService.findOne({ where: { setting_name: 'club_key' } });
      await ctx.reply(
        `${this.i18n.t('dict.club.activation_key')}\n\n${settingKey.value}\n\n`,
        this.appButtons.buttonPrev(),
      )
    } catch (e) {
     console.error(e, 'no passphrase');
    }
  }

  @On('channel_post')
  async listener(ctx) {
    try {
      if (ctx.update.channel_post?.text) {
        const ownerCommand = ctx.update.channel_post.text.toLowerCase().trim().replace(' ', '');
        const settingKey = await this.settingsService.findOne({ where: { setting_name: 'club_key' } });
        const passphrase = settingKey.value || 'hi,bot1';

        if (ownerCommand.includes(passphrase)) {
          const group = ctx.update.channel_post.chat;
          await this.tgGroupsService.update({ is_active: false }, { where: { is_active: true } });
          this.upsert(
            { name: group.title, is_active: true, group_id: group.id },
            { group_id: group.id.toString() }
          )

          await ctx.reply(
            this.i18n.t('dict.on_add_to_channel'),
          )
        }
      }
    } catch (e) {
      console.error(e, 'channel_post');
    }
  }

  @Action("to_start")
  async backToStart(ctx) {
    const isAdmin = await isUserAdmin(ctx, this.users);

    try {
      await updateMessage(
        ctx,
        this.i18n.t('dict.club.start_description'),
        this.appButtons.actionButtons(isAdmin)
      )
    } catch (e) {
      console.error(e, 'to_start');
    }
  }

  @Action("to_pay")
  async enterScene(ctx: Scenes.SceneContext) {
    ctx.scene.enter('getEmailScene')
  }

  @Action("description")
  async showDescription(ctx: Context) {
    await updateMessage(
      ctx,
      this.i18n.t('dict.club.description'),
      this.appButtons.buttonPrev()
    )
  }
}
