# Next.js (App Router) — Referencia Detalhada

## 1. Modelo Mental
Server: Server Components (async direto, sem useEffect). Server Actions (mutations). Client: "use client" (interatividade).

## 2. Roteamento
app/layout.tsx (root), page.tsx (/), orders/page.tsx, orders/[id]/page.tsx

## 3. Server Components (Padrao)
```typescript
export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await api.orders.getById(params.id);
  return <OrderDetail order={order} />;
}
```
HTML puro. Zero JS. SEO nativo.

## 4. Client Components
```typescript
'use client';
import { submitOrder } from './actions';
export function SubmitButton({ orderId }: { orderId: string }) {
  return <button onClick={async () => await submitOrder(orderId)}>Enviar</button>;
}
```

## 5. Server Actions
```typescript
'use server';
export async function submitOrder(id: string) {
  const useCase = new SubmitOrderUseCase(/* DI */);
  await useCase.execute(id);
  revalidatePath(`/orders/${id}`);
}
```

## 6. Data Fetching
ISR: `fetch(url, { next: { revalidate: 60 } })`. Dynamic: `{ cache: 'no-store' }`. Revalidate: `revalidatePath()`, `revalidateTag()`.

## 7. Loading/Error
loading.tsx = Suspense automatico. error.tsx = Error Boundary. `<Suspense fallback={...}>` = streaming.

## 8. API Client Tipado
```typescript
export const api = {
  orders: {
    list: () => fetchApi<OrderDTO[]>('/api/v1/orders'),
    getById: (id: string) => fetchApi<OrderDTO>(`/api/v1/orders/${id}`),
    create: (data: CreateOrderDTO) => fetchApi<OrderDTO>('/api/v1/orders', { method: 'POST', body: JSON.stringify(data) }),
    submit: (id: string) => fetchApi<OrderDTO>(`/api/v1/orders/${id}/submit`, { method: 'POST' }),
  },
};
```

## 9. Monorepo (Turborepo)
apps/api (NestJS) + apps/web (Next.js) + packages/shared (DTOs compartilhados)
