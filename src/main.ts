import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { environment } from './environment';
import { ApiService } from './api.service';
import { PluginController } from './plugin/plugin.controller';
import * as fs from 'fs';
import { PropertiesService } from './shared/storage/properties.service';
import { LoggerService } from './shared/logger.service';
import { AnalyticsService } from './shared/storage/analytics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: environment.ENV === 'production' ? ['warn', 'error'] : ['debug', 'log', 'verbose']
  });

  app.get(LoggerService).log(`--------------------------------------------------`);
  app.get(LoggerService).log(` ____  __.                   .__`);
  app.get(LoggerService).log(`|    |/ _|____   ____ ______ |__|__  ___`);
  app.get(LoggerService).log(`|      <_/ __ \\_/ __ \\\\____ \\|  \\  \\/  /`);
  app.get(LoggerService).log(`|    |  \\  ___/\\  ___/|  |_| |  |>    < `);
  app.get(LoggerService).log(`|____|__ \\___  >\\___  >   __/|__/__/\\_ \\`);
  app.get(LoggerService).log(`        \\/   \\/     \\/| /             \\/ API ${environment.appVersion}`);
  app.get(LoggerService).log(`----------------------|/--------------------------`);

  // SWAGGER
  const config = new DocumentBuilder()
    .setTitle(environment.appTitle)
    .setDescription(environment.appDescription)
    .setVersion(environment.appVersion)
    .addTag('ApiManager')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
      next();
  });

  app.enableCors({
      allowedHeaders:"*",
      origin: "*"
  });

  if (fs.existsSync('/root') && !fs.existsSync('/root/.keepix')) {
    fs.mkdirSync('/root/.keepix');
  }

  // load Properties at startUp
  app.get(LoggerService).log(`------------------- Loaders ----------------------`);
  app.get(PropertiesService).load();
  app.get(AnalyticsService).load();

  app.get(LoggerService).log(`------------------- Running ----------------------`);
  await app.listen(environment.port, environment.ip); // run api server
  app.get(LoggerService).log(`Api started on ${environment.ip}:${environment.port}`);
  app.get(ApiService).schedule(); // run api Scheduler
  app.get(PluginController).app = app;
}
bootstrap();
