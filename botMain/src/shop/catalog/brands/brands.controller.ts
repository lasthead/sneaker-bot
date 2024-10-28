import {Controller, Get} from '@nestjs/common';
import {BrandsService} from "./brands.service";

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
  async findAllWithProducts() {
    const brands = await this.brandService.getAllBrandsWithProducts();
    return {
      data: brands || [],
      message: brands ? 'success' : 'failed or empty',
    }
  }
}
