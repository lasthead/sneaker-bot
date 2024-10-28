import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from "./products.service";
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private productService: ProductsService,
  ) {}
  @Get()
  async findAll() {
    const products = await this.productService.getAllProducts();
    return {
      data: products || [],
      message: products ? 'success' : 'failed or empty',
    }
  }

  @Get('sizes')
  async findAllWithSizes() {
    const products = await this.productService.getAllProductsWithSizes();
    return {
      data: products || [],
      message: products ? 'success' : 'failed or empty',
    }
  }

  @Get('picture')
  @ApiResponse({ status: HttpStatus.OK, description: 'Image retrieved successfully.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Article is required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Image not found.' })
  async getLocalPicture(@Query('article') article: string, @Res() res: Response) {
    if (!article) return res.status(HttpStatus.NOT_FOUND).json({
      data: null,
      message: 'Article is required!',
      status: HttpStatus.BAD_REQUEST,
    });

    const pictureStream = this.productService.findLocalPicture(article);

    if (!pictureStream) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Image not found',
        status: HttpStatus.NOT_FOUND,
      });
    }

    // Устанавливаем заголовок, чтобы указать, что ответ содержит изображение
    res.setHeader('Content-Type', 'image/png');

    // Отправляем поток изображения как ответ
    pictureStream.pipe(res);
  }
}
