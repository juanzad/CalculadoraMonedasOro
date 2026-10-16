export interface GoldCoin {
  id: string;
  name: string;
  totalWeight: number; // Gross weight in grams (e.g. 41.67 g for Centenario)
  purity: number;      // Purity (0 to 1, e.g. 0.900 for 90% gold, or 21k, 22k, 24k)
  fineGoldWeight: number; // Pure gold weight in grams (e.g. 37.5 g for Centenario). Can be edited directly or calculated.
  description?: string;
  isCustom?: boolean;
}

export interface CalculatorSettings {
  ouncePriceUsd: number;         // International gold ounce price (USD)
  discountArgentinaPercent: number; // Percentage discount applied in Argentina due to local market discount/discount rate (e.g. 3%)
  usdExchangeRateArs: number;    // Usd exchange rate to ARS (usually Dolar Blue in Argentina)
  buySpreadPercent: number;      // Extra margin/percentage subtracted to buy from a client (e.g. 4%)
  sellSpreadPercent: number;     // Extra margin/percentage added/subtracted to sell to a client (e.g. 2%)
}

export interface CalculationResult {
  coin: GoldCoin;
  // Weight details
  fineGoldGrams: number;
  fineGoldOunces: number;
  // Spot values (international)
  spotValueUsd: number;
  spotValueArs: number;
  // Argentina reference value (after applying Argentina discount)
  localRefValueUsd: number;
  localRefValueArs: number;
  // Final buy value (Compra)
  buyPriceUsd: number;
  buyPriceArs: number;
  // Final sell value (Venta)
  sellPriceUsd: number;
  sellPriceArs: number;
  // Detail elements
  discountAmountUsd: number;
  buySpreadAmountUsd: number;
  sellSpreadAmountUsd: number;
}
