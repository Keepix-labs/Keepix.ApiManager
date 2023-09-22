import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { environment } from './environment';
import { ApiService } from './api.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SWAGGER
  const config = new DocumentBuilder()
    .setTitle(environment.appTitle)
    .setDescription(environment.appDescription)
    .setVersion(environment.appVersion)
    .addTag('ApiManager')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(80, "0.0.0.0"); // run api server
  app.get(ApiService).schedule(); // run api Scheduler
}
bootstrap();
