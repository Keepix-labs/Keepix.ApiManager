import { Injectable } from "@nestjs/common";
import fetch from 'node-fetch';
import xml2js from 'xml2js';

/**
 * Upnp Service
 * 
 * Service used for manage ports of the local smtp
 */
@Injectable()
export class UpnpService {

    private _saveOfGateway = undefined;

    async isEnabled() {
        const timeoutms = 3000;
        const timeout: Promise<any> = new Promise((resolve, reject) => {
            setTimeout(() => {
              const err = new Error('timeout')
              reject(err)
            }, timeoutms).unref?.()
        });
        try {
            const response = await Promise.race([this.getGatewayInfo(), timeout]);
            if (response !== undefined) {
                return true;
            }
        } catch (e) {
            console.log(e);
        }
        return false;
    }

    async getGatewayDevice() {
        let info = await this.getGatewayInfo();
        if (info?.serviceList !== undefined) {
            delete info?.serviceList;
        }
        if (info?.deviceList !== undefined) {
            delete info?.deviceList;
        }
        return info;
    }

    async getGatewayServices() {
        let info = await this.getGatewayInfo();
        if (info === undefined) {
            return undefined;
        }
        return this._parseServices(info);
    }

    async map(
            port: number,
            protocol: string = 'TCP',
            description: string = 'keepix-upnp',
            ttl: number = 60 * 30
        ) {
        const { gateway, address } = await this.findGateway();
        return await this.run('AddPortMapping', `<NewRemoteHost>${address}</NewRemoteHost><NewExternalPort>${port}</NewExternalPort><NewProtocol>${protocol}</NewProtocol><NewInternalPort>${port}</NewInternalPort><NewInternalClient>${address}</NewInternalClient><NewEnabled>1</NewEnabled><NewPortMappingDescription>${description}</NewPortMappingDescription><NewLeaseDuration>${ttl}</NewLeaseDuration>`);
    }

    async unmap(port: number, protocol: string = 'TCP') {
        const { gateway, address } = await this.findGateway();
        return await this.run('DeletePortMapping', `<NewRemoteHost>${address}</NewRemoteHost><NewExternalPort>${port}</NewExternalPort><NewProtocol>${protocol}</NewProtocol>`);
    }

    // async getSpecificMapping(port: number, protocol: string = 'TCP') {
    //     return await this.run('GetSpecificPortMappingEntry', `<NewProtocol>${protocol}</NewProtocol><NewExternalPort>${port}</NewExternalPort>`);
    // }
    //<NewManage></NewManage>
    // <NewNumberOfPorts></NewNumberOfPorts>
    // <NewPortListing></NewPortListing>

    async getListOfPortMappings() {
        const result = await this.run('GetListOfPortMappings', `<NewStartPort>1</NewProtocol><NewEndPort>64000</NewEndPort><NewProtocol>TCP</NewProtocol><NewManage>false</NewManage><NewNumberOfPorts>0</NewNumberOfPorts>`);

        if (result !== undefined && result.NewPortListing !== undefined) {
            try {
                const parser = new xml2js.Parser(xml2js.defaults['0.1']);
                const bodyJson = JSON.stringify((await parser.parseStringPromise(result.NewPortListing))).replace(/p\:/gm, '');
                const body = JSON.parse(bodyJson);

                if (body['PortMappingEntry'] === undefined) {
                    return undefined;
                }

                return undefined;
            } catch (e) {
                console.log(e);
            }
        }
        return undefined;
    }

    async getMapping() {
        let mappingList = await this.getListOfPortMappings();
        if (mappingList !== undefined) {
            return mappingList;
        }
        let listOfMapping = [];
        for (let i = 0; i < 1000; i++) {
            let result = undefined;
            try {
                result = await this.getSpecificMappingByIndex(i);
                if (result !== undefined) {
                    listOfMapping.push(result);
                } else {
                    break ;
                }
            } catch (e) {
                console.error(e);
                break ;
            }
        }
        return listOfMapping;
    }

    async getSpecificMapping(port: number, protocol: string = 'TCP') {
        return await this.run('GetSpecificPortMappingEntry', `<NewProtocol>${protocol}</NewProtocol><NewExternalPort>${port}</NewExternalPort>`);
    }

    async getSpecificMappingByIndex(index: number) {
        return await this.run('GetGenericPortMappingEntry', `<NewPortMappingIndex>${index}</NewPortMappingIndex>`);
    }

    async getExternalIp() {
        let result = await this.run('GetExternalIPAddress', '');

        if (result !== undefined && result['NewExternalIPAddress'] !== undefined) {
            result = result['NewExternalIPAddress'];
        }
        return result;
    }

    private async run(action, args) {
        const { gateway, address } = await this.findGateway();
        let result = undefined;
        try {
            const services = await this.getGatewayServices();
            const service = services[Math.floor(Math.random()*services.length)];
            const serviceType = service.serviceType;
            const requestBody = `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${serviceType}">${args}</u:${action}></s:Body></s:Envelope>`;
            const res = await fetch(gateway.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset="utf-8"',
                    'Content-Length': Buffer.byteLength(requestBody),
                    Connection: 'close',
                    SOAPAction: JSON.stringify(serviceType + '#' + action)
                },
                body: requestBody
            });
            if (res.status !== 200) {
                return undefined;
            }
            const rawBody = await res.text();
            const parser = new xml2js.Parser(xml2js.defaults['0.1']);
            const body = await parser.parseStringPromise(rawBody)
            const soapns = this._getNamespace(body,
                'http://schemas.xmlsoap.org/soap/envelope/'
            )
            result = body[soapns + 'Body'];
        } catch (e) {
            console.log(e);
            return undefined;
        }
        if (result[`u:${action}Response`] === undefined) {
            return undefined;
        }
        if (result[`u:${action}Response`]['@'] !== undefined) { // unused
            delete result[`u:${action}Response`]['@'];
        }
        return result[`u:${action}Response`];
    }

    private async getNatClient() {
        const NatAPI = await import('@silentbot1/nat-api').then(x => x.default);
        return new NatAPI({ enablePMP: true, enableUPNP: true });
    }

    private async findGateway() {
        if (this._saveOfGateway !== undefined) {
            return this._saveOfGateway;
        }
        let data = {
            gateway: undefined,
            address: undefined
        };

        for (let i = 0; i < 4; i++) {
            try {
                const client = await this.getNatClient();
                client._upnpClient.timeout = 2000; // 2 seconds;
                data = await client._upnpClient.findGateway();
                // disconnect all tcp used for discovery
                await client._upnpClient.destroy();
                break ;
            } catch (e) {
                if (!e.message.includes('timeout')) {
                    break ;
                }
            }
        }
        if (data !== undefined) {
            this._saveOfGateway = data;
        }
        return data;
    }

    private async getGatewayInfo() {
        const { gateway, address } = await this.findGateway();

        if (gateway == undefined) {
            return false;
        }
        try {
            const response = await fetch(gateway.url);
            if (response.status !== 200) throw new Error('Request failed: ' + response.status)
            const text = await response.text();
            const parser = new xml2js.Parser(xml2js.defaults['0.1']);
            const info = await parser.parseStringPromise(text);
            return info;
        } catch (e) {
            console.log(e);
        }
        return undefined;
    }

    private _getNamespace(data, uri) {
        let ns = undefined;
        if (data['@']) {
          Object.keys(data['@']).some((key) => {
            if (!/^xmlns:/.test(key)) return false
            if (data['@'][key] !== uri) return false
    
            ns = key.replace(/^xmlns:/, '')
            return true
          })
        }
        return ns ? ns + ':' : '';
    }

    private _parseServices(info) {
        const services = []
        const toArray = (item) => {
          return Array.isArray(item) ? item : [item]
        }
        const traverseServices = (service) => {
          if (!service) return
          services.push(service)
        }
        const traverseDevices = (device) => {
          if (!device) return
          if (device.deviceList && device.deviceList.device) {
            toArray(device.deviceList.device).forEach(traverseDevices)
          }
          if (device.serviceList && device.serviceList.service) {
            toArray(device.serviceList.service).forEach(traverseServices)
          }
        }
        traverseDevices(info.device)
        return services
    }
}