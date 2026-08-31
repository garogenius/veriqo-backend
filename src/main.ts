import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());
  
  // Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Request ID Middleware (Basic implementation, can be replaced with a library)
  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('VERIQO Platform API')
    .setDescription('The multi-tenant financial verification infrastructure platform API.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header', description: 'Enter API Key as `Bearer vrq_live_...` or `Bearer vrq_test_...`' }, 'ApiKey')
    .addServer('https://veiw-production.up.railway.app', 'Production Server')
    .addServer('http://localhost:3000', 'Local Development Server')
    .addTag('Authentication')
    .addTag('Organizations')
    .addTag('API Keys')
    .addTag('Verification')
    .addTag('Reconciliation')
    .addTag('Webhooks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
