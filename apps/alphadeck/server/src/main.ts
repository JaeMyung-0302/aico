import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5179';
  app.enableCors({
    origin: clientOrigin.split(','),
    credentials: true,
  });

  const port = process.env.PORT || 4004;
  await app.listen(port);
};

bootstrap();
