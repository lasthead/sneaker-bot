import {Controller, Get, Param, Post} from '@nestjs/common';
import {AppService} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get('/api/import/gdrive/')
  async getHello(params) {
    await this.appService.importProducts(params);
  }

  @Get('/api/getupdate/')
  async getUpdate(@Param() params) {
    console.log(123, params);
  }

  @Post('/api/getupdate/')
  async postUpdate(@Param() params) {
    console.log(1323, params);
  }
}
