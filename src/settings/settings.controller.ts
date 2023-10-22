import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {

    constructor() {}

    // Appliquer un nombre maximum d'app runnable en meme temp
    @Post('running-apps')
    async setNumberOfRunningApps() {
        return '';
    }

    // Enable ou disable les leds
    @Post('leds')
    async setLeds() {
        return '';
    }
}
