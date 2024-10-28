import {Controller, Get, HttpStatus, Query, Res} from '@nestjs/common';
import {BrandsService} from "./brands.service";
import {Response} from "express";

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
  async findAllWithProducts(@Query('withSize') withSize: boolean, @Res() res: Response) {
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
