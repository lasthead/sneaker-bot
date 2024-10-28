import {Injectable} from '@nestjs/common';
import {Product} from "./products.model";
import {Repository} from "sequelize-typescript";
import {InjectModel} from "@nestjs/sequelize";
import {ProductDto} from "./dto/product.dto";
import {Brand} from "../brands/brands.model";
import {Size} from "../sizes/sizes.model";
import {BrandDto} from "../brands/dto/brand.dto";
import {CreateSizeDto} from "../sizes/dto/create-size.dto";
import {ProductInterface} from "../../../googleDriveParser/interfaces";
import {ProductSizes} from "./product-sizes.model";
import {HttpService} from '@nestjs/axios'

import * as path from 'path';
import * as fs from 'fs';
import {ReadStream} from "fs";
import {Op} from "sequelize";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Brand) private brandRepository: Repository<Brand>,
    @InjectModel(Size) private sizeRepository: Repository<Size>,
    @InjectModel(Product) private productRepository: Repository<Product>,
    private readonly httpService: HttpService,
  ) {
  }

  picturesPath = 'docs/pictures/products/';
  placeholderPath = 'assets/pictures/placeholder.png';

  async getAllProducts() {
    try {
      return await this.productRepository.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
      })
    } catch (e) {
      return e
    }
  }

  async getAllProductsWithSizes() {
    try {
      return await this.productRepository.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
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
      })
    } catch (e) {
      return e
    }
  }

  async getProductsByBrand(brandId) {
    try {
      return await this.productRepository
        .findAll({
          where: { 'brand_id': Number(brandId) },
        })
    } catch (e) {
      return e
    }
  }

  async createProduct() {
    // TODO temp test data
    const params = {
      brand_id: 1,
      collection_id: 1,
      name: "test",
      article: "2",
      price: 5000,
      discount: 1000,
      is_active: true,
      size: [],
    }
    try {
      const product = await this.productRepository.create(params)
      // TODO temp test data
      await product.$set("sizes", [1], {through: {count: 7}})
      return product
    } catch (e) {
      console.log(e)
      return e
    }
  }

  private async findOrCreateBrands(list: ProductInterface[]) {
    let brandsList = await this.brandRepository.findAll();
    let sizesList = await this.sizeRepository.findAll();
    const newBrandsList = [];
    const newSizesList = [];

    list.map((product) => {
      const brandAlias = product.brand.trim().replace(' ', '').toLowerCase();
      const brand = brandsList.find((o) => o.alias === brandAlias);

      if (!brand && !(newBrandsList.find((o) => o.alias === brandAlias))) {
        const newBrand: BrandDto = {
          name: product.brand.trim(),
          alias: product.brand.trim().replace(' ', '').toLowerCase(),
        };
        newBrandsList.push(newBrand);
      }

      product.sizes.map((size) => {
        if (!sizesList.find((o) => o.size === Number(size.size))) {
          if (size.size) {
            const newSize: CreateSizeDto = {
              size: Number(size.size)
            }
            newSizesList.push(newSize);
          }
        }
      })
    });

    try {
      if (newBrandsList.length > 0) {
        await this.brandRepository.bulkCreate(newBrandsList, { updateOnDuplicate: ['alias'] });
        brandsList = await this.brandRepository.findAll();
      }

      if (newSizesList.length > 0) {
        await this.sizeRepository.bulkCreate(newSizesList, { updateOnDuplicate: ['size'] });
        sizesList = await this.sizeRepository.findAll();
      }
    } catch (e) {
      console.error(e);
    }
    return {brandsList, sizesList};
  }

  async createProducts(list: ProductInterface[]) {
    if (!list) return;

    const formattedProducts = [];
    const {brandsList, sizesList} = await this.findOrCreateBrands(list);
    const updatedProductsSizes = [];

    list.map(async (product) => {
      const findBrand = brandsList.find((o =>
        o.name.trim().replace(' ', '').toLowerCase() ===
        product.brand.trim().replace(' ', '').toLowerCase()));

      const newProduct: ProductDto = {
        name: product?.collection || '',
        picture: product?.picture || '',
        article: product.article.trim(),
        description: product?.material || '',
        price: product?.price || 0,
        link: product?.link || '',
        brand: findBrand?.name,
        brand_id: findBrand?.id,
      }
      formattedProducts.push(newProduct);
    });

    try {
      this.productRepository.addHook('afterBulkCreate', async (items, options) => {
        items.map((product) => {
          const productArticle = product.getDataValue('article');
          const itemInList = list.find((o) => o.article === product.getDataValue('article'));

          if (itemInList?.sizes) {
            itemInList.sizes.map(size => {
              if (Number(size.count) > 0) {
                const sizeId = sizesList.find((o) => o.size === Number(size.size))?.id;
                if (sizeId) {
                  updatedProductsSizes.push({
                    product_article: productArticle,
                    size_id: sizeId,
                    count: size.count,
                  })
                } else {
                  console.log('ошибка. запрашиваемый размер ', size.size, 'не обновлен', productArticle);
                }
              }
            });
          }
        });
      });

      await this.productRepository.bulkCreate(
        formattedProducts, {
          updateOnDuplicate: [
            'price',
            'picture',
            'description',
            'link',
          ],
        },
      );

      const addedProducts = await this.productRepository.findAll();
      const updatedProductsSizesWithPID = updatedProductsSizes.map((item) => {
        const findProduct = addedProducts.find((p) => p.article === item.product_article);

        return {
          ...item,
          product_id: findProduct.id,
        }
      });

      if (updatedProductsSizesWithPID && updatedProductsSizesWithPID.length > 0) {
        await ProductSizes.destroy({
          where: {},
          truncate: true,
        });

        await ProductSizes.bulkCreate(updatedProductsSizesWithPID, { updateOnDuplicate: ['count'] });
      }

      return 'success';
    } catch (e) {
      console.error(e, 'error import');
      return 'error';
    }
  }

  findLocalPicture(article) {
    try {
      const filePath = path.join(process.cwd(), this.picturesPath, `${article}.png`);

      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.createReadStream(filePath);
    } catch (e) {
      console.error(e, 'on search local pic');
      return null;
    }
  }

  getPlaceholder() {
    const filePath = path.join(process.cwd(), 'src/', this.placeholderPath);
    return fs.createReadStream(filePath);
  }

  async downloadImage(name: string, url: string): Promise<ReadStream> {
    try {
      const filePath = path.join(process.cwd(), this.picturesPath, `${name}.png`);

      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      const response = await this.httpService.axiosRef({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      console.error('статус', response);


      if (response.status >= 400) {
        console.error(`Failed to download image, status code: ${response.status}`);
        return null;
      }

      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
          resolve(fs.createReadStream(filePath));
        });
        writer.on('error', (error) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Failed to delete file: ${filePath}`, err);
            }
            reject(error);
          });
        });
      });
    } catch (e) {
      console.error(e, 'on try download pic');
    }
  }
}
