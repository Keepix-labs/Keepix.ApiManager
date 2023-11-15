import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { environment } from './environment';
import { ApiService } from './api.service';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import express from 'express';
import { PropertiesService } from './shared/storage/properties.service';
import { LoggerService } from './shared/logger.service';
import { AnalyticsService } from './shared/storage/analytics.service';
import { randomIntFromInterval } from './shared/utils/random-number';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as schedule from 'node-schedule';
import { httpsOptions } from './ssl/ssl';
import * as keepixSsh from 'keepix-ssh';
import path from 'path';
import url from 'url';
import { BindService } from './shared/bind.service';
import { WalletStorageService } from './shared/storage/wallet-storage.service';

async function bootstrap() {

  const server = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server), {
      logger: environment.ENV === 'prod' ? ['warn', 'error'] : ['debug', 'log', 'verbose']
    }
  );

  app.get(LoggerService).log(`--------------------------------------------------`);
  app.get(LoggerService).log(` ____  __.                   .__`);
  app.get(LoggerService).log(`|    |/ _|____   ____ ______ |__|__  ___`);
  app.get(LoggerService).log(`|      <_/ __ \\_/ __ \\\\____ \\|  \\  \\/  /`);
  app.get(LoggerService).log(`|    |  \\  ___/\\  ___/|  |_| |  |>    < `);
  app.get(LoggerService).log(`|____|__ \\___  >\\___  >   __/|__/__/\\_ \\`);
  app.get(LoggerService).log(`        \\/   \\/     \\/| /             \\/ API ${environment.appVersion} - ${environment.ENV}`);
  app.get(LoggerService).log(`----------------------|/--------------------------`);

  // SWAGGER
  const config = new DocumentBuilder()
    .setTitle(environment.appTitle)
    .setDescription(environment.appDescription)
    .setVersion(environment.appVersion)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // CORS
  app.enableCors(environment.corsConfig);
  app.use((req, res, next) => {
      for (let header of environment.corsConfig.headers) {
        res.header(header[0], header[1]);
      }
      next();
  });

  // plugin view static files
  app.use((req, res, next) => {
    if (req?.url?.startsWith('/plugins/')) {
      const pluginIdAndSubPath = (req.url.split('/plugins/')[1]).split('/');
      const pluginId = pluginIdAndSubPath[0];
      const subPathWithView = pluginIdAndSubPath.slice(1).join('/');

      const plugins = app.get(PropertiesService).getProperty('plugins', []);
      const plugin = plugins.find(x => x.id == pluginId);

      if (subPathWithView.startsWith('view') && plugin != undefined) {
        const subPath = subPathWithView.substr(4);

        const staticPluginPath = path.join(environment.globalNodeModulesDirectory, plugin.packageName);
        
        if (!fs.existsSync(path.join(staticPluginPath, subPath.split('?')[0]))) {
          req.url = '/index.html';
        }
        req.url = subPath;

        express.static(staticPluginPath)(req, res, next);
        return ;
      }
    }
    next();
  });

  // plateform .keepix creation of the directory
  if (!fs.existsSync(environment.appDirectory[environment.platform])) {
    fs.mkdirSync(environment.appDirectory[environment.platform]);
  }

  // Load Properties at startUp
  app.get(LoggerService).log(`------------------- Loaders ----------------------`);
  app.get(PropertiesService).load();
  app.get(AnalyticsService).load();
  app.get(WalletStorageService).load();

  // Setup default keepix name
  if (app.get(PropertiesService).getProperty('keepix-name') == undefined) {
    app.get(PropertiesService).setProperty('keepix-name', `Keepix-${randomIntFromInterval(1000, 9999)}`);
  }

  // Start Application
  app.get(LoggerService).log(`------------------- Running ----------------------`);
  
  // load routes
  await app.init();

  // run api server
  const httpServer = http.createServer(server).listen(environment.httpPort, environment.ip);
  const httpsServer = https.createServer(await httpsOptions(), server).listen(environment.httpsPort, environment.ip);

  app.get(BindService).addExpressServer(server);
  app.get(BindService).addHttpServer(httpServer);
  app.get(BindService).addHttpsServer(httpsServer);
  app.get(LoggerService).log(`Api started on (https ${environment.ip}:${environment.httpsPort}), (http ${environment.ip}:${environment.httpPort})`);
  app.get(ApiService).schedule(); // run api Scheduler

  // ssh server
  const sshApp = express();
  const sshServer = https.createServer(await httpsOptions(), sshApp).listen(12042, environment.ip);
  app.get(BindService).addExpressServer(sshApp);
  app.get(BindService).addHttpsServer(sshServer);
  keepixSsh.runSshApp(sshApp, sshServer, path.join(__dirname, '..'), {
    name: 'orangepi',
    password: 'orangepi'
  });
  

  // front-end
  const fileEntry = path.parse(require.main.filename).base;
  const packageDirectory = fileEntry === 'keepix-server' ? path.join(path.dirname(require.main.filename), '..') : path.join(path.dirname(require.main.filename), '../..');
  const frontApp = express();
  app.get(BindService).addExpressServer(frontApp);
  const frontStaticDirectory = path.join(packageDirectory, 'node_modules/keepix-application-interface-build');

  frontApp.use((req, res, next) => {
    if (req.url.split('?')[0] == '/') {
      req.url = '/index.html';
    }
    const urlObj = url.parse( req.url, true, false );

    if (!fs.existsSync(path.join(frontStaticDirectory, urlObj.pathname))) {
      req.url = '/index.html';
    }
    next();
  });
  frontApp.use(express.static(frontStaticDirectory));
  let nextHttpServer = undefined;
  let nextHttpsServer = undefined;
  if (!process.argv.join(' ').includes('--disable-front')) {
    nextHttpServer = http.createServer(frontApp).listen(environment.webAppHttpPort, environment.ip);
    nextHttpsServer = https.createServer(await httpsOptions(), frontApp).listen(environment.webAppHttpsPort, environment.ip);
    app.get(LoggerService).log(`WebApp started on (https ${environment.ip}:${environment.webAppHttpsPort}), (http ${environment.ip}:${environment.webAppHttpPort})`);
    app.get(BindService).addHttpServer(nextHttpServer);
    app.get(BindService).addHttpsServer(nextHttpsServer);
  }

  // ssl auto update
  app.get(BindService).addScheduler(schedule.scheduleJob('*/1 * * * *' /* 10min */, async () => {
    app.get(LoggerService).log('ssl auto-update');
    let options = await httpsOptions();
    httpsServer.setSecureContext(options);
    sshServer.setSecureContext(options);
    if (nextHttpsServer != undefined) {
      nextHttpsServer.setSecureContext(options);
    }
  }));
}
bootstrap();
