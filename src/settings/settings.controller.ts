import { Controller, Get, Post } from '@nestjs/common';

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
