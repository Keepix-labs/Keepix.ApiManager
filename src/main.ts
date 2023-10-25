import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { environment } from './environment';
import { ApiService } from './api.service';
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
import next from 'next';
import { parse } from 'url';

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
    // .addTag(environment.appTag)
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

  // Load Properties at startUp
  app.get(LoggerService).log(`------------------- Loaders ----------------------`);
  app.get(PropertiesService).load();
  app.get(AnalyticsService).load();

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

  const sshApp = express();
  const sshServer = https.createServer(await httpsOptions(), sshApp).listen(9001, environment.ip);
  keepixSsh.runSshApp(sshApp, sshServer, path.join(__dirname, '..'), {
    name: 'orangepi',
    password: 'orangepi'
  });
  
  const hostname = 'localhost'
  const port = 3000
  console.log(`${environment.appDirectory[environment.platform]}/../`);
  // when using middleware `hostname` and `port` must be provided below
  const nextApp = next({ dev: false, hostname, port, dir: environment.ENV == 'prod' ? `${environment.appDirectory[environment.platform]}/release/keepix.application-interface` : `${environment.appDirectory[environment.platform]}/../keepix.application-interface` })
  const handle = nextApp.getRequestHandler()
  
  await nextApp.prepare();
  const nextServerHandler = async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling')
      res.statusCode = 500
      res.end('internal server error')
    }
  };
  const nextHttpServer = http.createServer(nextServerHandler).listen(environment.webAppHttpPort, environment.ip);
  const nextHttpsServer = https.createServer(await httpsOptions(), nextServerHandler).listen(environment.webAppHttpsPort, environment.ip);

  app.get(LoggerService).log(`Api started on (https ${environment.ip}:${environment.httpsPort}), (http ${environment.ip}:${environment.httpPort})`);
  app.get(LoggerService).log(`WebApp started on (https ${environment.ip}:${environment.webAppHttpsPort}), (http ${environment.ip}:${environment.webAppHttpPort})`);
  app.get(ApiService).schedule(); // run api Scheduler

  // ssl auto update
  schedule.scheduleJob('*/1 * * * *' /* 10min */, async () => {
    console.log('ssl auto-update');
    let options = await httpsOptions();
    httpsServer.setSecureContext(options);
    sshServer.setSecureContext(options);
    nextHttpsServer.setSecureContext(options);
  });
}
bootstrap();
