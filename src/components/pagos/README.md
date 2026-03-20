# Modulo pagos

Componentes para flujo de pagos y conciliacion.

## Componentes implementados

- `PagosView.tsx`: lista y gestion de pagos.
- `BancosView.tsx`: carga/conciliacion por franquicia y seguimiento de cargas.

## Relacion con otros modulos

- `BancosView` tambien se usa desde el menu de contabilidad en `App.tsx`.

## Estado del menu asociado

Desde `App.tsx`, varias opciones de pagos y facturacion aun usan `Placeholder`:

- boletas
- facturas
- niubiz
- agora
- izipay
- presupuestos
- cajas chicas
