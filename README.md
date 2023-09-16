## Keepix.ApiManager

#### Pre-requires

node v18.16.0

#### Plugin Creation and Management

This section explains how to create and manage plugins in this project. Plugins are standalone modules that can be added to the main application to extend its functionality.

###### Plugin Structure

Each plugin should be created in the `src/plugin/` directory. The filename of the plugin should follow the kebab case convention. A plugin consists of three mandatory files, as illustrated in this example:

```shell
src/plugin/eth-proof-of-stake/
|-- eth-proof-of-stake.controller.ts
|-- eth-proof-of-stake.module.ts
|-- eth-proof-of-stake.service.ts
```

The three essential files of a plugin are as follows:

- eth-proof-of-stake.controller.ts: This file contains the logic of the plugin's controller. It exposes API endpoints or routes associated with the plugin.

- eth-proof-of-stake.module.ts: This file defines the module of the plugin. It specifies the components, controllers, services, and modules imported by the plugin.

- eth-proof-of-stake.service.ts: This file contains the core business logic of the plugin. Services are typically used to handle operations and processing related to the plugin.

###### Plugin Module Structure

The plugin module should be written as follows:

```ts
import { DynamicModule, Module } from '@nestjs/common';
import { EthProofOfStakeController } from './eth-proof-of-stake.controller';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';

export const register = (): DynamicModule => {
    return {
      module: class {},
      imports: [],
      controllers: [EthProofOfStakeController],
      providers: [EthProofOfStakeService],
      exports: [EthProofOfStakeService],
    };
}
```

- `register` is a function exported by the plugin module. It returns a DynamicModule object that specifies the module's configuration.
- `controllers` contains the plugin's controllers, such as EthProofOfStakeController.
- `providers` contains the plugin's services, such as EthProofOfStakeService.
- `exports` specifies the elements of the plugin module that should be exposed to other modules in the main application.