import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from 'src/shared/storage/properties.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get the list of wallets' })
    async get() {
        
        return {
            // 'keepix-name': this.propertiesService.getProperty('keepix-name')
        };
    }
}
