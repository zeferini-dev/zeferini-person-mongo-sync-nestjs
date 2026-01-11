import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins (development/external access)
  app.enableCors({
    origin: true, // Allow any origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  logger.log(`🚀 MongoDB Sync Service running on port ${port}`);
  logger.log(`📊 Stats endpoint: http://localhost:${port}/sync/stats`);
  logger.log(`🔄 Force sync endpoint: POST http://localhost:${port}/sync/force`);
  logger.log(`👥 Persons query endpoint: http://localhost:${port}/persons`);
}

bootstrap();
