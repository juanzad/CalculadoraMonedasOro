# Calculadora de Monedas de Oro

Valuador de monedas de oro para el **mercado argentino**. Calcula el precio de
**compra**, **venta** y **base físico** de monedas de oro (Centenario, Krugerrand,
Soberano, Argentino, etc.) a partir del precio spot internacional, el descuento de
plaza local, los márgenes de la casa y la cotización del dólar blue.

## Funciones

- **Simulador por moneda**: desglose del cálculo (spot → descuento local → precio base → compra/venta).
- **Pizarra comparativa**: todas las monedas del sistema en una tabla, con modo pantalla completa.
- **Cotizador de lote / cartera**: sumá varias piezas y obtené la tasación consolidada (ideal para herencias o tasaciones).
- **Parámetros editables**: precio de la onza, descuento Argentina, dólar blue y márgenes de compra/venta.
- **Monedas personalizadas**: cargá tus propias piezas por peso bruto + ley o por gramos de oro fino.
- Guardado automático en el navegador (parámetros, monedas y lote).

## Estructura del repo

```
.
├── app/          Proyecto completo Vite + React + TypeScript (el original de AI Studio)
└── standalone/   Un único index.html autónomo que abre directo en el navegador
```

### `app/` — Proyecto Vite + React

La app completa, para seguir desarrollándola. Requiere Node.js.

```bash
cd app
npm install        # o: bun install
npm run dev        # levanta el servidor en http://localhost:3000
```

El servidor (`server.ts`) incluye un endpoint `/api/gold-price` que trae la
cotización del oro en vivo desde Kitco. Para producción: `npm run build` y `npm start`.

### `standalone/` — Un solo archivo

`standalone/index.html` es la misma calculadora empaquetada en un único archivo:
se abre con doble clic en cualquier navegador, sin instalar nada. Usa React y
Tailwind desde CDN (necesita conexión a internet la primera vez).

Diferencia respecto al proyecto completo: el precio de la onza se carga **a mano**
(con el campo editable y los botones +/−), ya que la versión de un solo archivo no
tiene servidor para conectarse a Kitco.

## Fórmula de cálculo

```
1. Peso Fino = Peso Bruto × Ley
2. Valor Spot USD = (Peso Fino / 31.1034768) × Precio Spot de la Onza
3. Valor Base Argentina USD = Valor Spot USD × (1 − DescuentoArgentina%)
4. Compra Cliente USD = Valor Base × (1 − MargenCompra%)
5. Venta Cliente USD = Valor Base × (1 + MargenVenta%)
6. En Pesos ARS = Valor en USD × Cotización Dólar Blue
```

## Nota

Herramienta para fines informativos y de tasación física. Los valores pueden
oscilar según la ley metálica de la pieza, su estado y el flete de plaza.
