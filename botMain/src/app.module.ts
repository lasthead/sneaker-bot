import {Module} from '@nestjs/common';

import {TelegrafModule} from "nestjs-telegraf";
import * as LocalSession from "telegraf-session-local"
import * as path from 'path';
import { AcceptLanguageResolver,
    I18nModule,
    QueryResolver, } from 'nestjs-i18n';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {SequelizeModule} from "@nestjs/sequelize";
import {User} from "./shop/users/users.model";
import {Brand} from "./shop/catalog/brands/brands.model";
import {Collection} from "./shop/catalog/collections/collections.model";
import { ProductsController } from './shop/catalog/products/products.controller';
import {Product} from "./shop/catalog/products/products.model";
import {Size} from "./shop/catalog/sizes/sizes.model";
import {ProductSizes} from "./shop/catalog/products/product-sizes.model";
import {ClubModule} from "./club/club.module";
import {ShopModule} from "./shop/shop.module";
import {AppService} from "./app.service";
import {AppController} from "./app.controller";
import {ProductsService} from "./shop/catalog/products/products.service";

const session = new LocalSession({ database: "session_db.json" })
const configService = ConfigService
const i18nPath = process.env?.NODE_ENV === 'development' ? '/i18n/' : '/i18n/';

@Module({
  imports: [
      ConfigModule.forRoot({
        envFilePath: `../.${process.env.NODE_ENV}.env`
      }),
      TelegrafModule.forRootAsync({
        imports: [ConfigModule],
        botName: "shop",
        useFactory: (ctx) => ({
          token: process.env.SHOP_BOT_TOKEN,
          middlewares: [ session ],
          include: [ShopModule],
        }),
      }),
      TelegrafModule.forRootAsync({
        imports: [ConfigModule],
        botName: 'club',
        useFactory: (ctx) => {
          return {
            token: process.env.SIGNER_BOT_TOKEN,
            middlewares: [ session ],
            include: [ClubModule],
          }
        },
        inject: [ConfigService],
      }),
      SequelizeModule.forRoot({
        dialect: 'mysql',
        host: process.env.HOSTNAME,
        port: Number(process.env.DB_PORT),
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        models: [User, Brand, Collection, Product, Size, ProductSizes],
        autoLoadModels: true,
      }),
      SequelizeModule.forFeature([User, Brand, Collection, Product, Size, ProductSizes]),
      I18nModule.forRoot({
          fallbackLanguage: 'ru',
          loaderOptions: {
              path: path.join(__dirname, i18nPath),
              watch: true,
          },
          resolvers: [
              { use: QueryResolver, options: ['lang'] },
              AcceptLanguageResolver,
          ],
      }),

      ClubModule,
      ShopModule,
  ],
  controllers: [AppController, ProductsController],
  providers: [AppService, ProductsService],
})
export class AppModule {}
