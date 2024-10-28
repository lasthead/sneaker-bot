import {Controller, Get, HttpStatus, Query, Res} from '@nestjs/common';
import {BrandsService} from "./brands.service";
import {Response} from "express";
import { ApiQuery } from '@nestjs/swagger';

@Controller('brands')
export class BrandsController {
  constructor(
    private brandService: BrandsService,
  ) {}
  @Get()
  async findAll() {
    const brands = await this.brandService.getAllBrands();
    return {
      data: brands || [],
      message: brands ? 'success' : 'failed or empty',
    }
  }

  @Get('products')
  @ApiQuery({ name: 'withSize', required: false, type: Boolean, description: 'Include sizes in products' })
  async findAllWithProducts(@Query('withSize') withSize: boolean = false, @Res() res: Response) {
    const brands = withSize
      ? await this.brandService.getAllBrandsWithProductsWithSize()
      : await this.brandService.getAllBrandsWithProducts();

    return res.status(HttpStatus.OK).json({
      data: brands || [],
      message: brands ? 'success' : 'failed or empty',
      status: HttpStatus.OK,
    });
  }
}
