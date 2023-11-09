import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import {ShopUpdate} from "./shop.update";
import {UsersModule} from "./users/users.module";
import {BrandsModule} from "./catalog/brands/brands.module";
import {CollectionsModule} from "./catalog/collections/collections.module";
import {ProductsModule} from "./catalog/products/products.module";
import {SizesModule} from "./catalog/sizes/sizes.module";
import {UsersService} from "./users/users.service";
import {BrandsService} from "./catalog/brands/brands.service";
import {CollectionsService} from "./catalog/collections/collections.service";
import {ShopButtons} from "./shop.buttons";
import {ClubButtons} from "../club/club.buttons";
import {ProductsService} from "./catalog/products/products.service";
import {SizesService} from "./catalog/sizes/sizes.service";
import {SequelizeModule} from "@nestjs/sequelize";
import {User} from "./users/users.model";
import {Brand} from "./catalog/brands/brands.model";
import {Collection} from "./catalog/collections/collections.model";
import {Product} from "./catalog/products/products.model";
import {Size} from "./catalog/sizes/sizes.model";
import {ProductSizes} from "./catalog/products/product-sizes.model";
import {ProductsViewScene} from "./products.view.scene";
import {ProductOrderScene} from "./product.order.scene";
import {OrdersViewScene} from "./order.view.scene";
import {HttpModule} from "@nestjs/axios";
import {TgGroup} from "../club/tgGroups/tgGroups.model";
import {TgGroupsModule} from "../club/tgGroups/tgGroups.module";
import {TgGroupsService} from "../club/tgGroups/tgGroups.service";
import {OrderService} from "./catalog/order/order.service";
import {Order} from "./catalog/order/order.model";
import {SearchBySizeScene} from "./search.by.size.scene";
import {SearchByArticleScene} from "./search.by.article.scene";
import {AdminPanelScene} from "./admin.panel.scene";
import {TextHelper} from "../helpers/textHelper";
import {ShopSettingsModel} from "./settings/shop.settings.model";

@Module({
  // controllers: [UsersController],
  providers: [
    ShopUpdate,
    UsersService,
    TgGroupsService,
    BrandsService,
    CollectionsService,
    ShopButtons,
    ClubButtons,
    ProductsService,
    SizesService,
    ProductsViewScene,
    ProductOrderScene,
    OrderService,
    OrdersViewScene,
    SearchBySizeScene,
    SearchByArticleScene,
    AdminPanelScene,
    TextHelper,
  ],
  imports: [
    HttpModule,
    UsersModule,
    BrandsModule,
    CollectionsModule,
    ProductsModule,
    SizesModule,
    TgGroupsModule,
    SequelizeModule.forFeature([
      User,
      Brand,
      Collection,
      Product,
      Size,
      ProductSizes,
      TgGroup,
      Order,
      ShopSettingsModel,
    ]),
  ]
})
export class ShopModule {}
