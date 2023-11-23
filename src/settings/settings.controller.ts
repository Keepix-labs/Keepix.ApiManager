import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from 'src/shared/storage/properties.service';
import { getLocalIP, getLocalIpId } from 'src/shared/utils/get-local-ip';
import { subdomains } from 'src/shared/utils/subdomains';
import { coins, tokens } from "keepix-tokens";

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get a settings' })
    async get() {
        const overridedRpcs = this.propertiesService.getProperty('rpcs', []);
        const getRpcs = Object.entries(coins).reduce((acc: any, entry: any) => {
            let type = entry[0];
            let value = entry[1];
            if (value.rpcs !== undefined) {
                const chainId = value.rpcs.map(x => x.chainId).find(x => x !== undefined);
                const foundRpc = overridedRpcs.find(x => x.type === type);
                acc.push({
                    type: type,
                    url: foundRpc !== undefined ? foundRpc.url : "",
                    chainId: chainId
                });
            }
            return acc;
        }, []);

        let data = {
            formInputs: [
                {
                    "key": "rpcs",
                    "type": "list",
                    "label": "Override Public RPCS",
                    "add": false,
                    "inputs": [
                        {
                            "key": "type",
                            "type": "inputText",
                            "label": "Blockchain",
                            "disabled": true
                        },
                        {
                            "key": "url",
                            "type": "inputText",
                            "label": "Rpc Url",
                            "validator": "value === '' || /(https|http)\\:\\/\\/.+/gm.test(value)"
                        },
                        {
                            "key": "chainId",
                            "type": "inputNumber",
                            "label": "Chain Id",
                            "disabled": true
                        }
                    ]
                },
                {
                    "key": "leds",
                    "type": "checkbox-2",
                    "false": "Disabled",
                    "true": "Enabled",
                    "defaultValue": true,
                    "label": "Led Display"
                }
            ],
            "settings": {
                "rpcs": getRpcs,
                "leds": this.propertiesService.getProperty('leds', true)
            }
        };

        return data;
    }

    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Set a settings' })
    @Post('')
    async set(@Body() body: any) {
        console.log("update settings", body);
        let keys = Object.keys(body);
        for (let key of keys) {
            this.propertiesService.setProperty(key, body[key]);
        }
        this.propertiesService.save();
        return true;
    }

    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Set a rpc overrided.' })
    @Post('set-rpc')
    async setRpc(@Body() body) {
        let rpcs = this.propertiesService.getProperty('rpcs', {});

        rpcs[body.type] = {
            url: body.url,
            name: body.name,
            chainId: body.chainId
        };
        this.propertiesService.save();
        return true;
    }
}
