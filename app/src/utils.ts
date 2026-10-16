import { GoldCoin, CalculatorSettings, CalculationResult } from "./types";
import { TROY_ONCE_GRAMS } from "./data";

export function calculateCoinValue(
  coin: GoldCoin,
  settings: CalculatorSettings
): CalculationResult {
  const {
    ouncePriceUsd,
    discountArgentinaPercent,
    usdExchangeRateArs,
    buySpreadPercent,
    sellSpreadPercent,
  } = settings;

  // Calculate fine gold in grams
  const fineGoldGrams = coin.fineGoldWeight > 0 
    ? coin.fineGoldWeight 
    : (coin.totalWeight * coin.purity);
    
  const fineGoldOunces = fineGoldGrams / TROY_ONCE_GRAMS;

  // 1. International Spot Value (Spot Internacional)
  const spotValueUsd = fineGoldOunces * ouncePriceUsd;
  const spotValueArs = spotValueUsd * usdExchangeRateArs;

  // 2. Argentina Reference Value (Spot Internacional ajustado por Descuento local)
  const discountFraction = discountArgentinaPercent / 100;
  const localRefValueUsd = spotValueUsd * (1 - discountFraction);
  const localRefValueArs = localRefValueUsd * usdExchangeRateArs;

  // 3. Purchase price (Compra - Lo que paga la casa/comprador por la moneda)
  // Se le resta un margen/spread de compra
  const buyFraction = buySpreadPercent / 100;
  const buyPriceUsd = localRefValueUsd * (1 - buyFraction);
  const buyPriceArs = buyPriceUsd * usdExchangeRateArs;

  // 4. Sale price (Venta - El precio que pide la casa/vendedor al cliente)
  // Se le suma un margen/spread de venta (o se ajusta según preferencia)
  const sellFraction = sellSpreadPercent / 100;
  const sellPriceUsd = localRefValueUsd * (1 + sellFraction);
  const sellPriceArs = sellPriceUsd * usdExchangeRateArs;

  // Detailed adjustment figures
  const discountAmountUsd = spotValueUsd * discountFraction;
  const buySpreadAmountUsd = localRefValueUsd * buyFraction;
  const sellSpreadAmountUsd = localRefValueUsd * sellFraction;

  return {
    coin,
    fineGoldGrams,
    fineGoldOunces,
    spotValueUsd,
    spotValueArs,
    localRefValueUsd,
    localRefValueArs,
    buyPriceUsd,
    buyPriceArs,
    sellPriceUsd,
    sellPriceArs,
    discountAmountUsd,
    buySpreadAmountUsd,
    sellSpreadAmountUsd,
  };
}

export function formatCurrency(value: number, currency: "USD" | "ARS", decimals = 2): string {
  const safeValue = (typeof value === "number" && !isNaN(value) && isFinite(value)) ? value : 0;
  if (currency === "USD") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safeValue);
  } else {
    // In Argentina we usually round pesos to whole integers for premium feel and realistic transactions
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeValue);
  }
}

export function formatNumber(value: number, decimals = 3): string {
  const safeValue = (typeof value === "number" && !isNaN(value) && isFinite(value)) ? value : 0;
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeValue);
}
