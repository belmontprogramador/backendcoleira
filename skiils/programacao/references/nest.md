# NestJS — Referencia Detalhada

## 1. Ciclo de Vida da Request

Request -> Middleware -> Guard -> Interceptor (before) -> Pipe -> Controller -> Interceptor (after) -> Exception Filter (se erro)

1. Middleware: antes de tudo (CORS, logging)
2. Guard: autenticacao/autorizacao (retorna true/false)
3. Interceptor (before): transforma input
4. Pipe: validacao DTO (class-validator)
5. Controller: handler -> delega para Use Case (DDD)
6. Interceptor (after): transforma output
7. Exception Filter: captura erros

## 2. Guard (Auth)

```typescript
@Injectable()
class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    const user = await this.authService.validateToken(token);
    request.user = user;
    return true;
  }
}
```

## 3. Pipe (Validacao)

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true
}));

class CreateOrderDto {
  @IsString() customerId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
  @IsOptional() @IsIn(['BRL','USD','EUR']) currency?: string;
}
```

## 4. Interceptor (Logging/Metricas/Envelope)

```typescript
@Injectable()
class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`${context.getArgs()[0].method} ${context.getArgs()[0].url} ${Date.now()-start}ms`)),
    );
  }
}
```

## 5. Exception Filter (Erros DDD)

```typescript
@Catch(DomainException)
class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(422).json({
      success: false, error: { code: exception.code, message: exception.message }
    });
  }
}
```

## 6. Module Pattern (Organizacao DDD)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), RedisModule],
  controllers: [OrdersController],
  providers: [
    CreateOrderUseCase, GetOrderUseCase, SubmitOrderUseCase,
    PricingService, ShippingCalculator,
    { provide: 'OrderRepositoryPort', useClass: PostgresOrderRepository },
    { provide: 'CachePort', useClass: RedisCacheService },
    { provide: 'EventBusPort', useClass: KafkaEventBus },
  ],
})
class OrdersModule {}
```

## 7. Custom Providers

```typescript
// Factory: criacao condicional
{ provide: 'CachePort', useFactory: (config: ConfigService) =>
    config.get('NODE_ENV') === 'test' ? new InMemoryCache() : new RedisCacheService(config.get('REDIS_URL')),
  inject: [ConfigService] }

// Token string (desacopla de classe concreta)
@Inject('OrderRepositoryPort') private readonly repo: OrderRepositoryPort
```

## 8. Lifecycle Hooks
```typescript
@Injectable()
class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.redis.connect(); }
  async onModuleDestroy() { await this.redis.disconnect(); }
}
```
