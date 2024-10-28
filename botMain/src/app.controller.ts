import {Controller, Get, Param, Post} from '@nestjs/common';
import {AppService} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
  }

  @Get('/api/import/gdrive/')
  async getHello() {
    return 'Not available on HTTP';
    // await this.appService.importProducts(params);
  }
}
