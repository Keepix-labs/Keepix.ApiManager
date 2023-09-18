import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class ApiController {

    constructor() {

    }

    @Get()
    get() {
        return 'Keepix Api';
    }
}
