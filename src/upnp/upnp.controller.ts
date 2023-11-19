import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UpnpService } from './upnp.service';

@ApiTags('Upnp')
@Controller('upnp')
export class UpnpController {

    constructor(
        private upnpService: UpnpService
    ) {}

    @Get('enabled')
    @ApiOperation({ summary: 'Upnp is enabled' })
    async enabled() {
        return await this.upnpService.isEnabled();
    }

    @Get('external-ip')
    @ApiOperation({ summary: 'Get keepix external IP' })
    async getExternalIp() {
        console.log('GETEXTERNAL');
        return await this.upnpService.getExternalIp();
    }

    @Get('gateway/device')
    @ApiOperation({ summary: 'Get Gateway device informations' })
    async gatewayDevice() {
        return await this.upnpService.getGatewayDevice();
    }

    @Get('gateway/services')
    @ApiOperation({ summary: 'Get list of Gateway Services available' })
    async gatewayServices() {
        return await this.upnpService.getGatewayServices();
    }

    @Get('mapping')
    @ApiOperation({ summary: 'Get keepix upnp mapping' })
    async getUpnpMapping() {
        return await this.upnpService.getMapping();
    }

    @ApiParam({ name: 'protocol', type: 'string', description: 'TCP|UDP' })
    @ApiParam({ name: 'port', type: 'string' })
    @Get('mapping/:protocol/:port')
    @ApiOperation({ summary: 'Get keepix upnp specific mapping' })
    async getUpnpSpecificMapping(
        @Param('protocol') protocol,
        @Param('port') port,
    ) {
        return await this.upnpService.getSpecificMapping(port, protocol);
    }

    @ApiBody({ type: Object })
    @Post('map')
    @ApiOperation({ summary: 'Map port on keepix upnp.' })
    async mapUpnp(@Body() body) {
        const result = await this.upnpService.map(body.port, body.protocol, body.description, body.ttl);
        return result !== undefined;
    }

    @ApiBody({ type: Object })
    @Post('unmap')
    @ApiOperation({ summary: 'Unmap port on keepix upnp.' })
    async unmapUpnp(@Body() body) {
        const result = await this.upnpService.unmap(body.port, body.protocol);
        return result !== undefined;
    }
}
