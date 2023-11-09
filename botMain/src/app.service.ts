import { Injectable } from '@nestjs/common';
import { initImport } from './googleDriveParser/gDriveImport.js';
import {ProductsService} from "./shop/catalog/products/products.service";
import {ProductInterface} from "./googleDriveParser/interfaces";

@Injectable()
export class AppService {
  constructor(
    private readonly productService: ProductsService
  ) {}

  async importProducts(params) {
    const productsList: ProductInterface[] = await initImport({
      fileId: process.env.GOOGLE_DRIVE_FILE_ID,
    },false);

    try {
      await this.productService.createProducts(productsList);
    } catch (e) {
      console.error(e);
    }
  }
}
