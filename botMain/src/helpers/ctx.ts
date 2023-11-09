import {Context, Scenes, Telegraf} from "telegraf";
import {Product} from "../shop/catalog/products/products.model";
import {UsersService} from "../shop/users/users.service";

interface UserFromCtx {
  id: number,
  is_bot: boolean,
  first_name: string,
  username: string,
  language_code: string,
}

interface replyOptions {
    chat_id?: number | string,
    message_id?: number,
}

type ProductItemScene = {
  index: number | string,
  id: number | string,
}

export enum Delivery {
  CDEK = 'cdek',
  POSTRU = 'post_ru'
}

export enum PostType {
  WORLD = 'world',
  RUSSIA = 'russia'
}

export enum OrderStatuses {
  Cancelled = 'cancelled',
  Process = 'process',
  Confirmed = 'confirmed',
  WaitingToBeSent = 'waiting_to_be_sent',
  IsSent = 'is_sent',
  WaitingReceipt = 'waiting_receipt',
  Received = 'received',
  Done = 'done',
  Archived = 'archived'
}

interface RouterScene {
  prevScene: string
}

export type SceneOrderForm = {
  orderId?: string | number;
  delivery_address?: string;
  fio?: string,
  delivery_method?: Delivery.CDEK | Delivery.POSTRU,
  post_type?: 'world' | 'russia',
  pay_for_delivery?: 'now' | 'after',
  city?: string,
  country?: string,
  phone?: string,
  index?: string,
  summ?: string,
  discount?: string,
  comment?: string,
  pay_by_reserve?: 'yes' | 'no',
  uploaded_receipt?: string,
  cash_on_delivery?: 'yes' | 'no',

  fio_recipient?: string,
  recipient_address?: string,
  recipient_phone?: string,
  recipient_amount_delivery?: string,
  passport_recipient?: string,
  birthday_recipient?: string,
  receipt_id?: string,
}

interface SceneState {
  currentBrand?: number | string,
  currentProductCnt?: number,
  productsList?: ProductItemScene[],
  orderedProduct?: Product,
  sizes?: number[],
  selectedSize?: number,
  orderForm?: SceneOrderForm,
  lastSentMessage?: string,
  is_club_member?: boolean,
  router?: RouterScene,
  currentStep?: string,
}

export async function updateMessage(ctx: Context, description?, content?, options?: replyOptions) {
    const callback_query = ctx.update ? ctx.update["callback_query"] : null;
    const chat_id = options?.chat_id || ctx.chat.id
    const message_id = options?.message_id || (callback_query ? callback_query?.message?.message_id : null);

    if (message_id && chat_id) {
      try {
        // ctx.editMessageReplyMarkup()
        await ctx.editMessageText(description,{
          reply_markup: content?.reply_markup,
          // chat_id: Number(chat_id),
          // message_id: Number(message_id),
          parse_mode: 'HTML'
        });
      } catch (e) {
        console.error(e, new Date());
      }
    }
}

export async function updateMessageById(bot: Telegraf<Context>, description, reply_markup?, options?: replyOptions) {
  try {
    await bot.telegram.editMessageText(
      options.chat_id,
      options.message_id,
      '',
      description,
      {
        reply_markup,
        parse_mode: 'HTML',
      },
    );
  } catch (e) {
    console.error(e, new Date());
  }
}

export async function deleteUserMessage(ctx) {
  if (ctx.update && ctx.update.message?.from?.is_bot === false) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.error(e, 'on_delete_message', new Date());
    }
  }
}

export function getSceneSessionState (ctx: Scenes.SceneContext): SceneState {
  return ctx.session.__scenes.state
}

export function setSceneSessionState(ctx: Scenes.SceneContext, params: SceneState): void {
  ctx.session.__scenes.state = params
}

export function getOrderStep(ctx): string | null {
  return ctx.session.__scenes.state?.orderStep || null;
}

export function setOrderStep(ctx: Scenes.SceneContext, orderStep: string): void {
  ctx.session.__scenes.state = {
    ...ctx.session.__scenes.state,
    orderStep,
  }
}

export function putToSceneSessionState(ctx: Scenes.SceneContext, params: SceneState): void {
  ctx.session.__scenes.state = {
    ...ctx.session.__scenes.state,
    ...params
  }
}

export function setSessionOrderFormParam(ctx, params) {
  if (ctx.session.__scenes.state?.orderForm) {
    ctx.session.__scenes.state.orderForm = {
      ...ctx.session.__scenes.state.orderForm,
      ...params
    }
  } else {
    ctx.session.__scenes.state = {
      ...ctx.session.__scenes.state,
      orderForm: {
        ...params,
      }
    }
  }
}

export function setSceneProductViewCounter(ctx: Scenes.SceneContext, value: number): number {
  ctx.session.__scenes.state = {
    ...ctx.session.__scenes.state,
    currentProductCnt: value,
  }

  return value;
}


export function goToNextWizard(ctx, step: number): void {
  ctx.wizard.next(ctx);
  if (typeof ctx.wizard.step === 'function') {
    return ctx.wizard.step(ctx, step);
  }
}

export function getUserFromCtx(ctx): UserFromCtx {
  return ctx.update?.callback_query.from
}

export async function sendErrorNotify(ctx) {
  try {
    await ctx.reply('Упс! Что-то пошло не так... Сообщите, пожалуйста, об этой ошибке нашему менеджеру. Спасибо.');
  } catch (e) {
    console.error(e);
  }
}


export async function productSlider(ctx: Scenes.SceneContext, mode = "next", replyCallback = null) {
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
    if (replyCallback) {
      await ctx.deleteMessage();
      await replyCallback(ctx);
    } else {
      console.error('need callback function');
    }
  } catch (e) {
    console.error(e);
  }
}

export async function isUserAdmin(ctx, users: UsersService) {
  let isAdmin = false;

  try {
    const admins = await users.getAdmins();
    const username = ctx.update?.callback_query?.from.username || ctx.message?.from.username
    console.log(username);

    if (admins && admins.length && admins.find(o => o.username === username)) {
      isAdmin = true
    }
  } catch (e) {
    console.error(e, 'club_payment_start');
  }
  return isAdmin;
}
