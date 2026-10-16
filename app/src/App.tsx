import { useState, useEffect, useMemo, FormEvent, MouseEvent } from "react";
import { 
  TrendingUp, 
  Coins, 
  Info, 
  Percent, 
  Settings, 
  DollarSign, 
  Plus, 
  Trash2, 
  RotateCcw, 
  FileText, 
  Calculator, 
  HelpCircle, 
  Check, 
  PlusCircle, 
  Scale, 
  TrendingDown, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeftRight,
  Share2,
  Printer,
  Maximize2,
  Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_COINS, TROY_ONCE_GRAMS } from "./data";
import { GoldCoin, CalculatorSettings, CalculationResult } from "./types";
import { calculateCoinValue, formatCurrency, formatNumber } from "./utils";

// Default Initial Settings
const DEFAULT_SETTINGS: CalculatorSettings = {
  ouncePriceUsd: 2380.0,
  discountArgentinaPercent: 4.5, // promedio de descuento físico en Argentina
  usdExchangeRateArs: 1240.0,    // Valor estimado de Dólar Blue
  buySpreadPercent: 5.0,         // Margen de compra que descuenta la casa (spread)
  sellSpreadPercent: 2.0,        // Margen de venta que recarga la casa
};

export default function App() {
  // --- STATE ---
  const [settings, setSettings] = useState<CalculatorSettings>(() => {
    try {
      const saved = localStorage.getItem("gold_calc_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const ouncePriceUsd = typeof parsed.ouncePriceUsd === "number" ? parsed.ouncePriceUsd : DEFAULT_SETTINGS.ouncePriceUsd;
          const discountArgentinaPercent = typeof parsed.discountArgentinaPercent === "number" ? parsed.discountArgentinaPercent : DEFAULT_SETTINGS.discountArgentinaPercent;
          const usdExchangeRateArs = typeof parsed.usdExchangeRateArs === "number" ? parsed.usdExchangeRateArs : DEFAULT_SETTINGS.usdExchangeRateArs;
          const buySpreadPercent = typeof parsed.buySpreadPercent === "number" ? parsed.buySpreadPercent : DEFAULT_SETTINGS.buySpreadPercent;
          const sellSpreadPercent = typeof parsed.sellSpreadPercent === "number" ? parsed.sellSpreadPercent : DEFAULT_SETTINGS.sellSpreadPercent;
          
          return {
            ouncePriceUsd: isNaN(ouncePriceUsd) ? DEFAULT_SETTINGS.ouncePriceUsd : ouncePriceUsd,
            discountArgentinaPercent: isNaN(discountArgentinaPercent) ? DEFAULT_SETTINGS.discountArgentinaPercent : discountArgentinaPercent,
            usdExchangeRateArs: isNaN(usdExchangeRateArs) ? DEFAULT_SETTINGS.usdExchangeRateArs : usdExchangeRateArs,
            buySpreadPercent: isNaN(buySpreadPercent) ? DEFAULT_SETTINGS.buySpreadPercent : buySpreadPercent,
            sellSpreadPercent: isNaN(sellSpreadPercent) ? DEFAULT_SETTINGS.sellSpreadPercent : sellSpreadPercent,
          };
        }
      }
    } catch (e) {
      console.error("Error loading settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [customCoins, setCustomCoins] = useState<GoldCoin[]>(() => {
    try {
      const saved = localStorage.getItem("gold_calc_custom_coins");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => 
            c && 
            typeof c === "object" && 
            typeof c.id === "string" && 
            typeof c.name === "string" &&
            typeof c.totalWeight === "number" &&
            typeof c.purity === "number" &&
            typeof c.fineGoldWeight === "number"
          );
        }
      }
    } catch (e) {
      console.error("Error loading custom coins", e);
    }
    return [];
  });

  const [selectedCoinId, setSelectedCoinId] = useState<string>(() => {
    return PRESET_COINS[0].id;
  });

  // Batch Transaction / Lote / Cartera State
  const [cartItems, setCartItems] = useState<{ coinId: string; quantity: number; isCustom: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem("gold_calc_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => 
            item && 
            typeof item === "object" && 
            typeof item.coinId === "string" && 
            typeof item.quantity === "number"
          );
        }
      }
    } catch (e) {
      console.error("Error loading cart", e);
    }
    return [];
  });

  // Modal / Form state for adding custom coin
  const [isAddingCoin, setIsAddingCoin] = useState(false);
  const [newCoinName, setNewCoinName] = useState("");
  const [newCoinTotalWeight, setNewCoinTotalWeight] = useState("");
  const [newCoinPurity, setNewCoinPurity] = useState("0.900");
  const [newCoinFineWeight, setNewCoinFineWeight] = useState("");
  const [purityInputType, setPurityInputType] = useState<"percentage" | "fine">("percentage");

  // Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Visual tab for simulator / view options
  const [activeTab, setActiveTab] = useState<"individual" | "comparativa" | "lote">("individual");
  const [isFullScreenComparativa, setIsFullScreenComparativa] = useState(false);
  const [unitSystem, setUnitSystem] = useState<"USD" | "ARS">("USD");
  const [calculatorInfoOpen, setCalculatorInfoOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Show a temporary notification helper
  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 2800);
  };

  // Live price fetching from Kitco API endpoint
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceFetchedSuccess, setPriceFetchedSuccess] = useState<boolean | null>(null);

  const fetchLiveGoldPrice = async (showNotification = false) => {
    setIsFetchingPrice(true);
    try {
      const res = await fetch("/api/gold-price");
      if (!res.ok) throw new Error("Network response error");
      const data = await res.json();
      if (data && data.success && typeof data.mid === "number") {
        setSettings(prev => ({
          ...prev,
          ouncePriceUsd: parseFloat(data.mid.toFixed(2))
        }));
        setPriceFetchedSuccess(true);
        if (showNotification) {
          triggerNotification(`Cotización de onza actualizada: U$S ${data.mid.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Kitco.com)`);
        }
      } else {
        throw new Error("Invalid response data structure");
      }
    } catch (err) {
      console.error("Failed to fetch live gold price", err);
      setPriceFetchedSuccess(false);
      if (showNotification) {
        triggerNotification("No se pudo conectar con Kitco.com. Se usará el valor local.");
      }
    } finally {
      setIsFetchingPrice(false);
    }
  };

  useEffect(() => {
    fetchLiveGoldPrice(false);
  }, []);

  // --- SAVE STATES TO LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem("gold_calc_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("gold_calc_custom_coins", JSON.stringify(customCoins));
  }, [customCoins]);

  useEffect(() => {
    localStorage.setItem("gold_calc_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // --- DERIVED DATA ---
  const allCoinsMap = useMemo(() => {
    const map = new Map<string, GoldCoin>();
    PRESET_COINS.forEach(c => map.set(c.id, c));
    customCoins.forEach(c => map.set(c.id, c));
    return map;
  }, [customCoins]);

  const allCoinsList = useMemo(() => {
    return [...PRESET_COINS, ...customCoins];
  }, [customCoins]);

  const selectedCoinObj = useMemo(() => {
    return allCoinsMap.get(selectedCoinId) || PRESET_COINS[0];
  }, [selectedCoinId, allCoinsMap]);

  // Calculation for the currently selected single coin
  const selectedCoinResult = useMemo(() => {
    return calculateCoinValue(selectedCoinObj, settings);
  }, [selectedCoinObj, settings]);

  // Calculation for ALL coins inside the system (useful for comparative table)
  const allCoinsCalculated = useMemo(() => {
    return allCoinsList.map(coin => ({
      coin,
      result: calculateCoinValue(coin, settings)
    }));
  }, [allCoinsList, settings]);

  // Calculation for Cart list (portfolio/lote)
  const cartCalculations = useMemo(() => {
    let totalFineGoldGrams = 0;
    let totalSpotValueUsd = 0;
    let totalSpotValueArs = 0;
    let totalLocalRefValueUsd = 0;
    let totalLocalRefValueArs = 0;
    let totalBuyPriceUsd = 0;
    let totalBuyPriceArs = 0;
    let totalSellPriceUsd = 0;
    let totalSellPriceArs = 0;

    const items = cartItems.map(item => {
      const coin = allCoinsMap.get(item.coinId);
      if (!coin) return null;
      const calc = calculateCoinValue(coin, settings);
      
      const subtotalFineGrams = calc.fineGoldGrams * item.quantity;
      const subtotalSpotUsd = calc.spotValueUsd * item.quantity;
      const subtotalLocalUsd = calc.localRefValueUsd * item.quantity;
      const subtotalBuyUsd = calc.buyPriceUsd * item.quantity;
      const subtotalSellUsd = calc.sellPriceUsd * item.quantity;

      totalFineGoldGrams += subtotalFineGrams;
      totalSpotValueUsd += subtotalSpotUsd;
      totalSpotValueArs += subtotalSpotUsd * settings.usdExchangeRateArs;
      totalLocalRefValueUsd += subtotalLocalUsd;
      totalLocalRefValueArs += subtotalLocalUsd * settings.usdExchangeRateArs;
      totalBuyPriceUsd += subtotalBuyUsd;
      totalBuyPriceArs += subtotalBuyUsd * settings.usdExchangeRateArs;
      totalSellPriceUsd += subtotalSellUsd;
      totalSellPriceArs += subtotalSellUsd * settings.usdExchangeRateArs;

      return {
        ...item,
        coin,
        calc,
        subtotalFineGrams,
        subtotalSpotUsd,
        subtotalBuyUsd,
        subtotalSellUsd,
      };
    }).filter(Boolean);

    return {
      items,
      totals: {
        totalFineGoldGrams,
        totalFineGoldOunces: totalFineGoldGrams / TROY_ONCE_GRAMS,
        totalSpotValueUsd,
        totalSpotValueArs,
        totalLocalRefValueUsd,
        totalLocalRefValueArs,
        totalBuyPriceUsd,
        totalBuyPriceArs,
        totalSellPriceUsd,
        totalSellPriceArs,
      }
    };
  }, [cartItems, allCoinsMap, settings]);

  // --- ACTIONS ---
  const handleAddNewCoin = (e: FormEvent) => {
    e.preventDefault();
    if (!newCoinName.trim()) return;

    let parsedTotalWeight = parseFloat(newCoinTotalWeight);
    let parsedPurity = parseFloat(newCoinPurity);
    let parsedFineWeight = parseFloat(newCoinFineWeight);

    if (isNaN(parsedTotalWeight) || parsedTotalWeight <= 0) {
      parsedTotalWeight = 0;
    }

    if (isNaN(parsedPurity) || parsedPurity < 0 || parsedPurity > 1) {
      parsedPurity = 1.0;
    }

    // Determine Fine Gold weight
    let finalFineGoldWeight = 0;
    if (purityInputType === "percentage") {
      finalFineGoldWeight = parsedTotalWeight * parsedPurity;
    } else {
      if (isNaN(parsedFineWeight) || parsedFineWeight <= 0) {
        finalFineGoldWeight = parsedTotalWeight;
      } else {
        finalFineGoldWeight = parsedFineWeight;
        // set purity automatically for display based on fine / total
        if (parsedTotalWeight > 0) {
          parsedPurity = finalFineGoldWeight / parsedTotalWeight;
          if (parsedPurity > 1) parsedPurity = 1;
        }
      }
    }

    const newCoin: GoldCoin = {
      id: "custom-" + Date.now().toString(),
      name: newCoinName,
      totalWeight: parsedTotalWeight > 0 ? parsedTotalWeight : finalFineGoldWeight,
      purity: parsedPurity,
      fineGoldWeight: finalFineGoldWeight,
      description: "Moneda personalizada creada por el usuario.",
      isCustom: true,
    };

    setCustomCoins(prev => [...prev, newCoin]);
    setSelectedCoinId(newCoin.id);
    setIsAddingCoin(false);
    triggerNotification(`Moneda "${newCoin.name}" guardada correctamente.`);

    // Reset Form Fields
    setNewCoinName("");
    setNewCoinTotalWeight("");
    setNewCoinPurity("0.900");
    setNewCoinFineWeight("");
  };

  const handleDeleteCustomCoin = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Moneda",
      message: "¿Estás seguro de eliminar esta moneda personalizada? En caso de estar en tu lote, se quitará.",
      onConfirm: () => {
        setCustomCoins(prev => prev.filter(c => c.id !== id));
        setCartItems(prev => prev.filter(item => item.coinId !== id));
        if (selectedCoinId === id) {
          setSelectedCoinId(PRESET_COINS[0].id);
        }
        triggerNotification("Moneda personalizada eliminada con éxito.");
        setConfirmDialog(null);
      }
    });
  };

  const handleResetSettings = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Restaurar Parámetros",
      message: "¿Restaurar los parámetros de cotización por defecto?",
      onConfirm: () => {
        setSettings(DEFAULT_SETTINGS);
        triggerNotification("Parámetros del mercado restaurados.");
        setConfirmDialog(null);
      }
    });
  };

  const handleAddToCart = (coinId: string) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.coinId === coinId);
      if (existing) {
        return prev.map(item => 
          item.coinId === coinId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        const coin = allCoinsMap.get(coinId);
        return [...prev, { coinId, quantity: 1, isCustom: !!coin?.isCustom }];
      }
    });
    triggerNotification(`Agregado al simulador de lote.`);
  };

  const handleUpdateCartQty = (coinId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(item => item.coinId !== coinId));
    } else {
      setCartItems(prev => prev.map(item => 
        item.coinId === coinId ? { ...item, quantity: qty } : item
      ));
    }
  };

  const handleClearCart = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Vaciar Lote",
      message: "¿Vaciar todo el lote del cotizador?",
      onConfirm: () => {
        setCartItems([]);
        triggerNotification("Lote vaciado.");
        setConfirmDialog(null);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      
      {/* Background radial gold glow decorations */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-amber-600/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Persistent Notification Badge */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/40 text-amber-200 px-5 py-3 rounded-full flex items-center gap-3 shadow-xl shadow-slate-950/50 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium tracking-wide font-display">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-600 to-yellow-400 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30">
              <Coins className="w-6 h-6 text-slate-950 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-100 bg-clip-text text-transparent">
                Valuador de Monedas de Oro
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                Cotización Física para el Mercado Argentino 
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Servicio local activo" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnitSystem(prev => prev === "USD" ? "ARS" : "USD")}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-300"
              title="Alternar moneda primaria de visualización"
              id="currency-switch-button"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              Ver en: <span className="text-amber-300 font-bold">{unitSystem}</span>
            </button>

            <button
              onClick={() => setCalculatorInfoOpen(true)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-all"
              title="Ver fórmulas y metodología de cálculo"
              id="info-modal-trigger"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className={`${isFullScreenComparativa && activeTab === "comparativa" ? "max-w-none px-4 sm:px-8 xl:px-12" : "max-w-7xl px-4 sm:px-6"} mx-auto py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 print:p-0 transition-all duration-300`}>
        
        {/* LEFT COLUMN: CONTROL BOARD & MARKET SETTINGS (lg:col-span-4) */}
        <section className={`lg:col-span-4 flex flex-col gap-6 print:hidden ${isFullScreenComparativa && activeTab === "comparativa" ? "hidden lg:hidden" : ""}`}>
          
          {/* market values config panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-base font-display text-amber-200">
                  Parámetros de Mercado
                </h2>
              </div>
              <button
                onClick={handleResetSettings}
                className="text-slate-400 hover:text-amber-400 text-xs p-1 rounded hover:bg-slate-800 transition-all flex items-center gap-1 font-mono"
                title="Restaurar valores de referencia por defecto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer
              </button>
            </div>

            <div className="flex flex-col gap-5">
              
              {/* Ounce Price Input */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    Precio Oro Spot (USD / oz)
                    <span className="text-[10px] text-slate-500 font-mono">(Londres)</span>
                  </label>
                  <button
                    onClick={() => fetchLiveGoldPrice(true)}
                    disabled={isFetchingPrice}
                    className="text-[10px] text-slate-400 hover:text-amber-400 font-mono flex items-center gap-1 transition-all p-1 bg-slate-800/40 rounded border border-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${priceFetchedSuccess ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                    {isFetchingPrice ? "Sincronizando..." : "Kitco Live"}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1 mt-0.5">
                  <span>Último valor:</span>
                  <span className="text-amber-400/90 font-semibold">
                    {formatCurrency(settings.ouncePriceUsd, "USD")}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="font-mono text-sm font-semibold">$</span>
                  </div>
                  <input
                    type="number"
                    value={settings.ouncePriceUsd || ""}
                    onChange={e => setSettings(prev => ({ ...prev, ouncePriceUsd: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2 pl-7 pr-3 text-sm font-mono font-bold tracking-wide text-amber-100"
                    placeholder="2380.00"
                  />
                </div>
                {/* Ounce quick adjustments */}
                <div className="grid grid-cols-4 gap-1">
                  {[-50, -10, 10, 50].map((adj) => (
                    <button
                      key={adj}
                      onClick={() => setSettings(prev => ({ ...prev, ouncePriceUsd: prev.ouncePriceUsd + adj }))}
                      className="bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500/10 text-[10px] font-mono text-slate-400 hover:text-amber-200 py-1 rounded transition-all"
                    >
                      {adj > 0 ? `+${adj}` : adj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Argentina Discount Input */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    Descuento Argentina %
                    <span className="text-[10px] text-slate-500 font-mono">(Brecha/Seguros)</span>
                  </label>
                  <span className="font-mono text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                    -{settings.discountArgentinaPercent}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-1">
                  En Argentina el oro bruto físico cotiza habitualmente entre 2% a 6% bajo el precio internacional por costos de acuñación, transporte e iliquidez de plaza.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={settings.discountArgentinaPercent}
                    onChange={e => setSettings(prev => ({ ...prev, discountArgentinaPercent: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 accent-amber-500 h-1 bg-slate-850 rounded"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.discountArgentinaPercent}
                    onChange={e => setSettings(prev => ({ ...prev, discountArgentinaPercent: parseFloat(e.target.value) || 0 }))}
                    className="w-14 text-center bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg py-1 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Usd Rate / Dolar Blue Input */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    Cotización Dólar Blue (ARS)
                    <span className="text-[10px] text-slate-500 font-mono">(Argentina ARS)</span>
                  </label>
                  <span className="font-mono text-emerald-400 font-bold">
                    $1 USD = {formatNumber(settings.usdExchangeRateArs, 0)} ARS
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <span className="text-xs">ARS</span>
                  </div>
                  <input
                    type="number"
                    value={settings.usdExchangeRateArs || ""}
                    onChange={e => setSettings(prev => ({ ...prev, usdExchangeRateArs: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2 pl-10 pr-3 text-sm font-mono font-bold text-emerald-300"
                    placeholder="1240"
                  />
                </div>
                {/* Presets variables in Argentina for dolar */}
                <div className="flex gap-1">
                  {[1150, 1200, 1250, 1300].map(val => (
                    <button
                      key={val}
                      onClick={() => setSettings(prev => ({ ...prev, usdExchangeRateArs: val }))}
                      className={`flex-1 text-[10px] font-mono py-1 rounded border transition-all ${
                        settings.usdExchangeRateArs === val
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* spreads buy/sell */}
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold text-amber-200/80 flex items-center gap-1 font-display">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  Márgenes de Transacción (Spread de Casa)
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400">Margen Compra (%)</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.1"
                        value={settings.buySpreadPercent}
                        onChange={e => setSettings(prev => ({ ...prev, buySpreadPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 pr-6 text-xs text-center font-mono font-bold"
                        title="Descuento aplicado al comprarle la moneda al cliente"
                      />
                      <span className="absolute right-2 text-[10px] text-slate-500 font-mono">%</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400">Margen Venta (%)</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.1"
                        value={settings.sellSpreadPercent}
                        onChange={e => setSettings(prev => ({ ...prev, sellSpreadPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 pr-6 text-xs text-center font-mono font-bold"
                        title="Recargo aplicado al venderle la moneda al cliente"
                      />
                      <span className="absolute right-2 text-[10px] text-slate-500 font-mono">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-relaxed font-mono">
                  * Compra = Valor local × (1 - MargenCompra%). <br />
                  * Venta = Valor local × (1 + MargenVenta%).
                </p>
              </div>

            </div>
          </div>

          {/* Quick Gold Equivalent Conversion Guide Box */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-400 flex flex-col gap-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5 font-display">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Equivalencias de Peso de Referencia
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">1 Oz Troy:</span><span>31.1035 gramos</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oro 18k (Ley 750):</span><span>75% pureza</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oro 22k (Ley 916):</span><span>91.6% pureza</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oro 24k (Ley 999):</span><span>99.9% o más pureza</span></div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: INTERACTIVE CALCULATOR ENGINE (lg:col-span-8) */}
        <section className={`${isFullScreenComparativa && activeTab === "comparativa" ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-6 transition-all duration-300`}>
          
          {/* NAVIGATION TABS */}
          <div className="flex border-b border-slate-800/80 pb-px gap-2 scrollbar-none overflow-x-auto print:hidden">
            <button
              onClick={() => setActiveTab("individual")}
              className={`pb-3 px-4 text-sm font-medium transition-all relative shrink-0 font-display flex items-center gap-2 ${
                activeTab === "individual" ? "text-amber-400 border-b-2 border-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Coins className="w-4 h-4" />
              Simulador de Moneda
            </button>
            <button
              onClick={() => setActiveTab("comparativa")}
              className={`pb-3 px-4 text-sm font-medium transition-all relative shrink-0 font-display flex items-center gap-2 ${
                activeTab === "comparativa" ? "text-amber-400 border-b-2 border-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              Pizarra Comparativa
            </button>
            <button
              onClick={() => setActiveTab("lote")}
              className={`pb-3 px-4 text-sm font-medium transition-all relative shrink-0 font-display flex items-center gap-2 ${
                activeTab === "lote" ? "text-amber-400 border-b-2 border-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Cotizador de Lote / Cartera
              {cartItems.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: INDIVIDUAL CALCULATOR */}
          {activeTab === "individual" && (
            <div className="flex flex-col gap-6">
              
              {/* COIN SELECTOR CAROUSEL & ACTIONS */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 font-mono">
                    Seleccione una Moneda
                  </h3>
                  
                  {/* Create Custom Coin Trigger Button */}
                  <button
                    onClick={() => setIsAddingCoin(prev => !prev)}
                    className="p-1 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    Nueva Moneda
                  </button>
                </div>

                {/* ANIMATED ADD COIN FORM PANEL */}
                <AnimatePresence>
                  {isAddingCoin && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddNewCoin}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 overflow-hidden flex flex-col gap-4"
                    >
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1 border-b border-slate-800 pb-2">
                        <PlusCircle className="w-4 h-4 text-amber-400" />
                        Añadir Nueva Moneda al Registro
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* Name */}
                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-medium">Nombre de la Moneda</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Libra Oro Isabel II"
                            value={newCoinName}
                            onChange={e => setNewCoinName(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-semibold focus:border-amber-500"
                          />
                        </div>

                        {/* Input strategy chooser */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-medium">Método de Carga</label>
                          <select
                            value={purityInputType}
                            onChange={e => setPurityInputType(e.target.value as "percentage" | "fine")}
                            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-semibold focus:border-amber-500 text-slate-200"
                          >
                            <option value="percentage">Peso Bruto + Pureza</option>
                            <option value="fine">Solo gramos Oro Fino</option>
                          </select>
                        </div>

                        {/* Total Weight */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-medium">Peso Bruto (gramos)</label>
                          <input
                            type="number"
                            step="0.0001"
                            required={purityInputType === "percentage"}
                            placeholder="Sujeto a aleación"
                            value={newCoinTotalWeight}
                            onChange={e => setNewCoinTotalWeight(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {purityInputType === "percentage" ? (
                          <>
                            {/* Purity / Ley */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400 font-medium">Ley / Pureza de Oro (0 a 1)</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max="1"
                                  placeholder="0.900"
                                  value={newCoinPurity}
                                  onChange={e => setNewCoinPurity(e.target.value)}
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono focus:border-amber-500 text-amber-200 font-semibold"
                                />
                                <div className="text-[10px] text-slate-400 bg-slate-850 p-1.5 rounded border border-slate-800">
                                  {parseFloat(newCoinPurity) >= 0.999 ? "24k" : parseFloat(newCoinPurity) >= 0.916 ? "22k" : parseFloat(newCoinPurity) >= 0.750 ? "18k" : "Oro bajo"}
                                </div>
                              </div>
                            </div>

                            {/* Fine Gold Preview */}
                            <div className="flex flex-col gap-1 justify-end">
                              <div className="bg-slate-950 border border-dashed border-slate-700 rounded-lg p-2 text-xs font-mono flex items-center justify-between text-slate-400 leading-none h-[34px]">
                                <span>Gramos calculados:</span>
                                <span className="font-bold text-amber-400">
                                  {formatNumber((parseFloat(newCoinTotalWeight) || 0) * (parseFloat(newCoinPurity) || 0), 3)} g
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Fine Gold Weight DIRECT */
                          <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-[10px] text-slate-400 font-medium">Gramos Neto Oro Fino (Fine Gold)</label>
                            <input
                              type="number"
                              step="0.0001"
                              required
                              placeholder="Gramos de oro puro contenidos"
                              value={newCoinFineWeight}
                              onChange={e => setNewCoinFineWeight(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-amber-300 focus:border-amber-500"
                            />
                          </div>
                        )}

                        <div className="flex items-end justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingCoin(false)}
                            className="p-2 px-3 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-all border border-slate-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="p-2 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-amber-500/10 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Grabar Moneda
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* CHIPS SCROLLABLE LIST */}
                <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800">
                  {allCoinsList.map((coin) => {
                    const isSelected = coin.id === selectedCoinId;
                    return (
                      <button
                        key={coin.id}
                        onClick={() => setSelectedCoinId(coin.id)}
                        className={`flex items-center gap-2 p-2.5 px-4 shrink-0 rounded-2xl text-xs font-medium cursor-pointer transition-all border relative ${
                          isSelected 
                            ? "bg-slate-900 border-amber-500 text-amber-200 ring-1 ring-amber-500/20 shadow-md"
                            : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <span className={`${isSelected ? 'text-amber-100 font-semibold' : 'text-slate-350'}`}>
                            {coin.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 mt-0.5">
                            Fino: {formatNumber(coin.fineGoldWeight, 3)}g ({formatNumber(coin.fineGoldWeight / TROY_ONCE_GRAMS, 3)} oz)
                          </span>
                        </div>
                        {coin.isCustom && (
                          <button
                            onClick={(e) => handleDeleteCustomCoin(coin.id, e)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors font-mono ml-1.5"
                            title="Eliminar moneda personalizada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE COIN ANALYSIS BOARD */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Visual specifications block (md:col-span-5) */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                      <Info className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Moneda Seleccionada</span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-slate-200 leading-tight">
                      {selectedCoinObj.name}
                    </h3>
                    
                    {selectedCoinObj.description && (
                      <p className="text-xs text-slate-400 leading-relaxed mt-2.5 italic border-l-2 border-amber-500/30 pl-2.5 font-display">
                        {selectedCoinObj.description}
                      </p>
                    )}

                    <div className="mt-5 space-y-3.5 border-t border-slate-800/80 pt-4 font-mono text-xs text-slate-300">
                      <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                        <span className="text-slate-500 font-sans">Peso Bruto Total:</span>
                        <span className="font-bold">{formatNumber(selectedCoinObj.totalWeight, 3)} g</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                        <span className="text-slate-500 font-sans">Pureza Ley:</span>
                        <span className="font-bold text-amber-400">
                          {formatNumber(selectedCoinObj.purity, 3)} 
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            ({selectedCoinObj.purity >= 0.999 ? "Fine Gold" : `${Math.round(selectedCoinObj.purity * 24)}K`})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                        <span className="text-slate-500 font-sans">Contenido Oro Fino:</span>
                        <span className="font-bold text-slate-200 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                          {formatNumber(selectedCoinResult.fineGoldGrams, 3)} g
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                        <span className="text-slate-500 font-sans">Contenido en Onzas:</span>
                        <span className="font-bold">{formatNumber(selectedCoinResult.fineGoldOunces, 4)} oz t</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => handleAddToCart(selectedCoinObj.id)}
                      className="w-full bg-slate-950 hover:bg-slate-800 active:scale-[0.98] border border-slate-700 hover:border-amber-500/40 text-xs text-center py-2.5 px-4 rounded-xl text-amber-200 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-400" />
                      Agregar a mi Cartera / Lote
                    </button>
                  </div>
                </div>

                {/* COMPRA Y VENTA BIG VALUES CONTAINER (md:col-span-7) */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  
                  {/* COMPRA CARD (Casa Compra - can be thought of as user sells) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
                        <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">La Casa Compra / Pagamos</span>
                      </div>
                      <h2 className="text-[10px] text-slate-500 leading-normal mb-1 font-sans">
                        Valor de compra para el cliente por su {selectedCoinObj.name}
                      </h2>
                      
                      {unitSystem === "USD" ? (
                        <>
                          <div className="text-3xl font-extrabold text-emerald-300 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.buyPriceUsd, "USD")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en Pesos: <span className="text-emerald-400/80">{formatCurrency(selectedCoinResult.buyPriceArs, "ARS")}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-extrabold text-emerald-300 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.buyPriceArs, "ARS")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en USD: <span className="text-emerald-400/80">{formatCurrency(selectedCoinResult.buyPriceUsd, "USD")}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xxs font-bold uppercase py-1.5 px-3 rounded-xl font-mono text-center tracking-wider">
                      Compra
                    </div>
                  </div>

                  {/* VENTA CARD (Casa Venta - can be thought of as user buys) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden flex justify-between items-center group hover:border-amber-500/30 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                        <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">La Casa Venta / Ofrecemos</span>
                      </div>
                      <h2 className="text-[10px] text-slate-500 leading-normal mb-1 font-sans">
                        Valor de venta para el cliente si compra {selectedCoinObj.name}
                      </h2>
                      
                      {unitSystem === "USD" ? (
                        <>
                          <div className="text-3xl font-extrabold text-amber-200 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.sellPriceUsd, "USD")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en Pesos: <span className="text-amber-400/80">{formatCurrency(selectedCoinResult.sellPriceArs, "ARS")}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-extrabold text-amber-200 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.sellPriceArs, "ARS")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en USD: <span className="text-amber-400/80">{formatCurrency(selectedCoinResult.sellPriceUsd, "USD")}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xxs font-bold uppercase py-1.5 px-3 rounded-xl font-mono text-center tracking-wider">
                      Venta
                    </div>
                  </div>

                  {/* PRECIO BASE EN ARGENTINA CARD (Destacado) */}
                  <div className="bg-slate-900 border border-sky-500/30 rounded-3xl p-5 relative overflow-hidden flex justify-between items-center group hover:border-sky-400/60 transition-all shadow-lg ring-1 ring-sky-500/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-colors" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-sky-400">
                        <Scale className="w-4 h-4 stroke-[2.5]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Precio Base en Argentina (Referencia)</span>
                      </div>
                      <h2 className="text-[10px] text-slate-400 leading-normal mb-1 font-sans">
                        Valor del oro físico en plaza local (con -{settings.discountArgentinaPercent}% descto.)
                      </h2>
                      
                      {unitSystem === "USD" ? (
                        <>
                          <div className="text-3xl font-extrabold text-sky-300 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.localRefValueUsd, "USD")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en Pesos: <span className="text-sky-400/80">{formatCurrency(selectedCoinResult.localRefValueArs, "ARS")}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-extrabold text-sky-300 font-display tracking-tight">
                            {formatCurrency(selectedCoinResult.localRefValueArs, "ARS")}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            Equivalente en USD: <span className="text-sky-400/80">{formatCurrency(selectedCoinResult.localRefValueUsd, "USD")}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xxs font-bold uppercase py-1.5 px-3 rounded-xl font-mono text-center tracking-wider shadow-sm">
                      Precio Base
                    </div>
                  </div>

                  {/* SPOT INTERNATIONAL REFERENCE STRIP */}
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 px-4 text-xs flex items-center justify-between font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      Spot Internacional Puro (sin descto.):
                    </span>
                    <span className="font-bold text-slate-300">
                      {formatCurrency(selectedCoinResult.spotValueUsd, "USD")}
                      <span className="text-slate-500 ml-1">({formatCurrency(selectedCoinResult.spotValueArs, "ARS")})</span>
                    </span>
                  </div>

                </div>

              </div>

              {/* CALCULATION MATH VISUAL FLOW */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 relative overflow-hidden backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-amber-200 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-display">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Desglose del Cálculo Matemático en Argentina
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative text-[11px] font-mono select-none">
                  
                  {/* Step 1: International spot */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] font-bold block mb-1">1. SPOT INTERNACIONAL</span>
                      <span className="text-xs text-slate-300 block">{formatNumber(selectedCoinResult.fineGoldOunces, 4)} oz t de Oro puro</span>
                    </div>
                    <div className="mt-3 text-right text-slate-400 font-bold border-t border-slate-900 pt-1.5">
                      {formatCurrency(selectedCoinResult.spotValueUsd, "USD")}
                    </div>
                  </div>

                  {/* Icon connector */}
                  <div className="hidden md:flex items-center justify-center p-0 text-slate-600">
                    <ChevronRight className="w-5 h-5 text-amber-500/40" />
                  </div>

                  {/* Step 2: Local Discount */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] font-bold block mb-1">2. DESCUENTO LOCAL (-{settings.discountArgentinaPercent}%)</span>
                      <span className="text-xs text-slate-400 block">Menor liquidez física en plaza local</span>
                    </div>
                    <div className="mt-3 text-right text-amber-400/80 font-bold border-t border-slate-900 pt-1.5">
                      -{formatCurrency(selectedCoinResult.discountAmountUsd, "USD")}
                    </div>
                  </div>

                  {/* Icon connector */}
                  <div className="hidden md:flex items-center justify-center p-0 text-slate-600">
                    <ChevronRight className="w-5 h-5 text-amber-500/40" />
                  </div>

                  {/* Step 3: Base Local Value */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/20 flex flex-col justify-between">
                    <div>
                      <span className="text-amber-400 text-[10px] font-bold block mb-1">3. VALOR BASE FÍSICO</span>
                      <span className="text-xs text-slate-300 block">Referencia en Argentina</span>
                    </div>
                    <div className="mt-3 text-right text-amber-400 font-bold border-t border-slate-900 pt-1.5">
                      {formatCurrency(selectedCoinResult.localRefValueUsd, "USD")}
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-slate-800 pt-4 text-xs">
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 flex flex-col gap-1 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold block mb-1">CÁLCULO PRECIO COMPRA (Casa Compra)</span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Base Físico:</span>
                      <span>{formatCurrency(selectedCoinResult.localRefValueUsd, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Margen de Compra (-{settings.buySpreadPercent}%):</span>
                      <span>-{formatCurrency(selectedCoinResult.buySpreadAmountUsd, "USD")}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-emerald-300 text-xs">
                      <span>Total Neto Compra (USD):</span>
                      <span>{formatCurrency(selectedCoinResult.buyPriceUsd, "USD")}</span>
                    </div>
                    <div className="text-[10px] text-right text-slate-400 mt-1">
                      Pesos ARS ({settings.usdExchangeRateArs} / USD) = <span className="font-bold text-emerald-400">{formatCurrency(selectedCoinResult.buyPriceArs, "ARS")}</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 flex flex-col gap-1 text-[11px] font-mono">
                    <span className="text-amber-300 font-bold block mb-1">CÁLCULO PRECIO VENTA (Casa Venta)</span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Base Físico:</span>
                      <span>{formatCurrency(selectedCoinResult.localRefValueUsd, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Margen de Venta (+{settings.sellSpreadPercent}%):</span>
                      <span>+{formatCurrency(selectedCoinResult.sellSpreadAmountUsd, "USD")}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-amber-300 text-xs">
                      <span>Total Neto Venta (USD):</span>
                      <span>{formatCurrency(selectedCoinResult.sellPriceUsd, "USD")}</span>
                    </div>
                    <div className="text-[10px] text-right text-slate-400 mt-1">
                      Pesos ARS ({settings.usdExchangeRateArs} / USD) = <span className="font-bold text-amber-200">{formatCurrency(selectedCoinResult.sellPriceArs, "ARS")}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: COMPARATIVE GRID */}
          {activeTab === "comparativa" && (
            <div className="flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                      Pizarra General de Cotizaciones
                    </h3>
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">
                      Spot Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Comparación en tiempo real de todas las monedas del sistema con el Oro Spot a <span className="text-amber-400 font-bold">{formatCurrency(settings.ouncePriceUsd, "USD")} / oz</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right font-mono text-[11px] text-slate-400 border-r border-slate-800 pr-4 hidden md:block">
                    <div>Descto. Arg: <span className="font-bold text-amber-300">-{settings.discountArgentinaPercent}%</span></div>
                    <div>Dólar Blue: <span className="font-bold text-emerald-400">${formatNumber(settings.usdExchangeRateArs, 0)} ARS</span></div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsFullScreenComparativa(prev => !prev);
                      triggerNotification(!isFullScreenComparativa ? "Modo Pantalla Completa activado" : "Modo normal restaurado");
                    }}
                    className={`flex items-center gap-2 p-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
                      isFullScreenComparativa 
                        ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 font-bold" 
                        : "bg-slate-900 hover:bg-slate-800/80 text-amber-400 border-slate-700 hover:border-amber-500/50"
                    }`}
                    title={isFullScreenComparativa ? "Restaurar Pantalla Normal" : "Expandir a Pantalla Completa"}
                    id="fullscreen-board-toggle"
                  >
                    {isFullScreenComparativa ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Vista Normal</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Pantalla Completa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Moneda</th>
                        <th className="py-3 px-4 text-center">Peso Bruto (g)</th>
                        <th className="py-3 px-4 text-center">Ley / Pureza</th>
                        <th className="py-3 px-4 text-center">Oro Fino (g)</th>
                        <th className="py-3 px-4 text-right text-sky-400 bg-sky-500/5">Precio Base (Arg)</th>
                        <th className="py-3 px-4 text-right text-emerald-400 bg-emerald-500/5">Compra (Casa Compra)</th>
                        <th className="py-3 px-4 text-right text-amber-350 bg-amber-500/5">Venta (Casa Venta)</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {allCoinsCalculated.map(({ coin, result }) => (
                        <tr 
                          key={coin.id}
                          className={`hover:bg-slate-850/60 transition-colors ${
                            selectedCoinId === coin.id ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                            <div className="flex flex-col">
                              <span>{coin.name}</span>
                              {coin.isCustom && (
                                <span className="inline-block self-start font-mono text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded mt-0.5">
                                  Personalizada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-300">
                            {formatNumber(coin.totalWeight, 2)}g
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-450">
                            {formatNumber(coin.purity, 3)} 
                            <span className="text-[10px] text-slate-500 block">
                              ({coin.purity >= 0.999 ? "24k" : `${Math.round(coin.purity * 24)}K`})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                            {formatNumber(result.fineGoldGrams, 3)}g
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-sky-300 bg-sky-500/5">
                            <div className="flex flex-col">
                              <span>{formatCurrency(result.localRefValueUsd, "USD")}</span>
                              <span className="text-[10px] text-sky-400/70 font-normal">
                                {formatCurrency(result.localRefValueArs, "ARS")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-emerald-300 bg-emerald-500/5">
                            <div className="flex flex-col">
                              <span>{formatCurrency(result.buyPriceUsd, "USD")}</span>
                              <span className="text-[10px] text-emerald-400/70 font-normal">
                                {formatCurrency(result.buyPriceArs, "ARS")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-amber-200 bg-amber-500/5">
                            <div className="flex flex-col">
                              <span>{formatCurrency(result.sellPriceUsd, "USD")}</span>
                              <span className="text-[10px] text-amber-300/70 font-normal">
                                {formatCurrency(result.sellPriceArs, "ARS")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-sans">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedCoinId(coin.id);
                                  setActiveTab("individual");
                                }}
                                className="text-[10px] text-amber-300 hover:text-amber-100 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md transition-colors"
                              >
                                Seleccionar
                              </button>
                              <button
                                onClick={() => handleAddToCart(coin.id)}
                                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-all"
                                title="Agregar al Estimador de Lotes"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TRADING CART / PORTFOLIO ESTIMATOR */}
          {activeTab === "lote" && (
            <div className="flex flex-col gap-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Cotizador de Lote / Cartera Física
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Cargue múltiples piezas para simular transacciones completas de compra y venta. ideal para herencias o tasaciones corporativas.
                  </p>
                </div>

                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-red-400 hover:text-red-200 font-mono border border-red-900/30 bg-red-950/20 py-1.5 px-3 rounded-lg flex items-center gap-1 hover:bg-red-950/40 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vaciar Todo
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                /* EMPTY SLOT CARTERA */
                <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="bg-slate-900 p-4 rounded-full border border-slate-800 mb-4 text-amber-400/60 shadow-inner">
                    <Calculator className="w-8 h-8 stroke-[1.2]" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300 font-display">No hay monedas en tu lote</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                    Usa los botones de "Agregar a Cartera" en la pestaña del Simulador o de la Pizarra para cotizar múltiples monedas o calcular una tasación masiva de manera consolidada.
                  </p>
                  <button
                    onClick={() => setActiveTab("individual")}
                    className="mt-4 text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 py-2 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    Agregar Monedas del Sistema
                  </button>
                </div>
              ) : (
                /* CONSOLIDATED TRADING SIMULATOR BOARD */
                <div className="flex flex-col gap-6" id="printable-quote-section">
                  
                  {/* PRINT TICKET OVERVIEW (EXCLUDES FROM PRINT VIA UTILITY UNLESS PRINT TRIGGERED) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Items selected checklist (md:col-span-7) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:col-span-7 flex flex-col gap-4">
                      <div className="text-slate-300 font-bold text-xs tracking-wide border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>DETALLE DEL LOTE TRADED</span>
                        <span className="text-[10px] text-slate-500 font-mono">DÓLAR VALUACIÓN: ${settings.usdExchangeRateArs} / USD</span>
                      </div>

                      <div className="divide-y divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                        {cartCalculations.items.map((item) => {
                          if (!item) return null;
                          return (
                            <div key={item.coinId} className="py-3 flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-xs font-bold text-slate-200 font-display flex items-center gap-1.5">
                                  {item.coin.name}
                                  {item.isCustom && (
                                    <span className="font-mono text-[8px] tracking-wide text-amber-400 bg-amber-500/10 px-1 py-px rounded">PERS</span>
                                  )}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 space-x-2 mt-0.5">
                                  <span>Fino c/u: {formatNumber(item.calc.fineGoldGrams, 2)}g</span>
                                  <span>|</span>
                                  <span>Subtotal Fino: {formatNumber(item.subtotalFineGrams, 2)}g</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Quantities changer */}
                                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-inner font-mono text-xs font-bold">
                                  <button
                                    onClick={() => handleUpdateCartQty(item.coinId, item.quantity - 1)}
                                    className="px-2.5 py-1 text-slate-400 hover:text-red-400 active:bg-slate-900 transition-all text-xs"
                                    title="Restar 1"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-amber-300 text-xs min-w-[20px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateCartQty(item.coinId, item.quantity + 1)}
                                    className="px-2.5 py-1 text-slate-400 hover:text-amber-400 active:bg-slate-900 transition-all text-xs"
                                    title="Sumar 1"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Compra and venta subtotals shown in unit style */}
                                <div className="text-right font-mono text-[11px] min-w-[100px]">
                                  <div className="text-emerald-300 font-bold" title="Subtotal de compra para la cartera">
                                    C: {formatCurrency(unitSystem === "USD" ? item.subtotalBuyUsd : item.subtotalBuyUsd * settings.usdExchangeRateArs, unitSystem)}
                                  </div>
                                  <div className="text-amber-300 font-bold" title="Subtotal de venta para la cartera">
                                    V: {formatCurrency(unitSystem === "USD" ? item.subtotalSellUsd : item.subtotalSellUsd * settings.usdExchangeRateArs, unitSystem)}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleUpdateCartQty(item.coinId, 0)}
                                  className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors leading-none"
                                  title="Quitar del lote"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add coin trigger quick box */}
                      <div className="border-t border-slate-800 pt-3 mt-auto flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/20 p-2.5 rounded-xl">
                        <span>Peso Fino Acumulado Tot: <strong className="text-slate-200">{formatNumber(cartCalculations.totals.totalFineGoldGrams, 3)} gramos</strong></span>
                        <span>(~{formatNumber(cartCalculations.totals.totalFineGoldOunces, 3)} Onzas Troy)</span>
                      </div>
                    </div>

                    {/* Consolidated results overview card (md:col-span-5) */}
                    <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-5 md:col-span-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div>
                        {/* Header totals */}
                        <div className="border-b border-slate-800 pb-3 mb-4">
                          <span className="text-[10px] font-bold tracking-wider text-amber-400 block uppercase font-mono">Consolidación Total Local</span>
                          <h4 className="text-base font-bold text-slate-200 font-display mt-0.5">Tasación del Lote Completo</h4>
                        </div>

                        {/* Large values displayed */}
                        <div className="space-y-4">
                          {/* Compra consolidada */}
                          <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/10">
                            <span className="text-[9px] text-emerald-400 font-mono font-bold block mb-1">TOTAL VALOR COMPRA (Vos cobrás si vendés)</span>
                            <div className="text-2xl font-extrabold text-emerald-300 font-display leading-tight">
                              {formatCurrency(cartCalculations.totals.totalBuyPriceUsd, "USD")}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              Pesos ARS: <span className="text-emerald-400 font-bold">{formatCurrency(cartCalculations.totals.totalBuyPriceArs, "ARS")}</span>
                            </div>
                          </div>

                          {/* Venta consolidada */}
                          <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/10">
                            <span className="text-[9px] text-amber-450 font-mono font-bold block mb-1">TOTAL VALOR VENTA (Vos pagás si comprás)</span>
                            <div className="text-2xl font-extrabold text-amber-200 font-display leading-tight">
                              {formatCurrency(cartCalculations.totals.totalSellPriceUsd, "USD")}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              Pesos ARS: <span className="text-amber-200 font-bold">{formatCurrency(cartCalculations.totals.totalSellPriceArs, "ARS")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Mid-spot values references */}
                        <div className="bg-slate-950 p-3 rounded-2xl border border-sky-500/20 mt-4 text-xs">
                          <span className="text-[9px] text-sky-400 font-mono font-bold block uppercase tracking-wider mb-1">TOTAL VALOR BASE EN ARGENTINA (-{settings.discountArgentinaPercent}%)</span>
                          <div className="text-xl font-extrabold text-sky-300 font-display leading-tight">
                            {formatCurrency(cartCalculations.totals.totalLocalRefValueUsd, "USD")}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex justify-between items-center border-t border-slate-900 pt-1.5">
                            <span>Pesos ARS: <strong className="text-sky-400">{formatCurrency(cartCalculations.totals.totalLocalRefValueArs, "ARS")}</strong></span>
                            <span className="text-[10px] text-slate-500">Spot Intl: {formatCurrency(cartCalculations.totals.totalSpotValueUsd, "USD")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons print share */}
                      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 print:hidden">
                        <button
                          onClick={handlePrint}
                          className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-center py-2 px-3 rounded-xl text-slate-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-slate-450" />
                          Imprimir Ficha
                        </button>
                        <button
                          onClick={() => {
                            const detailsText = `Detalle de Tasación de Lote en Argentina:` +
                              `\n• Peso Fino Total: ${formatNumber(cartCalculations.totals.totalFineGoldGrams, 3)}g (~${formatNumber(cartCalculations.totals.totalFineGoldOunces,3)} oz)` +
                              `\n• Valor Compra: ${formatCurrency(cartCalculations.totals.totalBuyPriceUsd, "USD")} (${formatCurrency(cartCalculations.totals.totalBuyPriceArs, "ARS")})` +
                              `\n• Valor Venta: ${formatCurrency(cartCalculations.totals.totalSellPriceUsd, "USD")} (${formatCurrency(cartCalculations.totals.totalSellPriceArs, "ARS")})` +
                              `\n• Cotizado Dolar Blue: ${settings.usdExchangeRateArs} ARS y Spot ${settings.ouncePriceUsd} USD/oz.`;
                            
                            navigator.clipboard.writeText(detailsText);
                            triggerNotification("Cotización del lote copiada al portapapeles.");
                          }}
                          className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-700 text-xs text-center py-2 px-3 rounded-xl text-amber-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          Copiar Ficha
                        </button>
                      </div>

                    </div>

                  </div>

                  {/* PRINT-ONLY TICKET BANNER - SHOWN ONLY ON PRINT CALL */}
                  <div className="hidden print:block p-8 border-2 border-dashed border-slate-800 rounded-3xl text-black bg-white my-8 font-mono text-xs leading-relaxed max-w-2xl mx-auto">
                    <div className="text-center border-b-2 border-black pb-4 mb-4">
                      <h2 className="text-lg font-extrabold uppercase font-display tracking-tight">TICKET DE COTIZACIÓN - METALES PRECIOSOS</h2>
                      <p className="text-[10px] text-gray-500 mt-1">Calculado en base a cotización nacional argentina e internacional de spot oro</p>
                      <p className="text-[10px] text-gray-500">Fecha del Mercado: {new Date().toLocaleDateString("es-AR")} (UTC 2026)</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="font-bold underline block uppercase text-[10px]">1. Parámetros Generales de Referencia:</span>
                        <div className="grid grid-cols-2 mt-1">
                          <span>Precio Oro Spot: <strong>{formatCurrency(settings.ouncePriceUsd, "USD")} / oz</strong></span>
                          <span>Dolar de Conversión: <strong>{settings.usdExchangeRateArs} ARS (Dólar Blue)</strong></span>
                          <span>Porcentaje Descuento AR: <strong>{settings.discountArgentinaPercent}%</strong></span>
                          <span>Margen Compra / Venta: <strong>{settings.buySpreadPercent}% / {settings.sellSpreadPercent}%</strong></span>
                        </div>
                      </div>

                      <div className="border-t border-b border-black py-2 my-2">
                        <span className="font-bold block uppercase text-[10px] mb-1">2. Detalle de Monedas en el Lote:</span>
                        <div className="space-y-1">
                          {cartCalculations.items.map((item) => {
                            if (!item) return null;
                            return (
                              <div key={item.coinId} className="flex justify-between">
                                <span>{item.quantity}x {item.coin.name} ({formatNumber(item.calc.fineGoldGrams,2)}g c/u Fino):</span>
                                <div className="space-x-3">
                                  <span>C: {formatCurrency(item.subtotalBuyUsd, "USD")}</span>
                                  <span>V: {formatCurrency(item.subtotalSellUsd, "USD")}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold underline block uppercase text-[10px]">3. Consolidación Total Declarada:</span>
                        <div className="grid grid-cols-2 mt-2 gap-4">
                          <div className="border p-2 rounded border-black bg-gray-50">
                            <span className="font-bold text-[9px] block">TOTAL COMPRA (Casa Compra):</span>
                            <span className="text-base font-extrabold block">{formatCurrency(cartCalculations.totals.totalBuyPriceUsd, "USD")}</span>
                            <span className="text-xs font-semibold block">{formatCurrency(cartCalculations.totals.totalBuyPriceArs, "ARS")} pesos</span>
                          </div>
                          
                          <div className="border p-2 rounded border-black bg-gray-50">
                            <span className="font-bold text-[9px] block">TOTAL VENTA (Casa Venta):</span>
                            <span className="text-base font-extrabold block">{formatCurrency(cartCalculations.totals.totalSellPriceUsd, "USD")}</span>
                            <span className="text-xs font-semibold block">{formatCurrency(cartCalculations.totals.totalSellPriceArs, "ARS")} pesos</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-[10px] text-gray-500 border-t border-dashed border-black pt-4 mt-6">
                        Para fines informativos y de tasación física. Los valores pueden oscilar de acuerdo a la ley metálica particular de la pieza, el estado físico y flete de plaza.
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </section>

      </main>

      {/* DETAILED INFORMATION MODAL ABOUT HOW WE CALCULATE THE VALUE */}
      <AnimatePresence>
        {calculatorInfoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
            onClick={() => setCalculatorInfoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold font-display text-amber-200">
                    Metodología de Valuación de Oro físico
                  </h3>
                </div>
                <button
                  onClick={() => setCalculatorInfoOpen(false)}
                  className="p-1 text-slate-400 hover:text-amber-400 font-mono text-sm uppercase font-semibold"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                <p>
                  El comercio de monedas de oro bruto (como centenarios, krugerrands, argentinos o libras) responde a fórmulas matemáticas estrictas, ajustadas por condiciones locales en Argentina. Aquí se describe el proceso paso a paso:
                </p>

                <h4 className="font-bold text-amber-300 font-display text-xs sm:text-sm">
                  1. Obtención del Peso Fino (Gramos Neto de Oro)
                </h4>
                <p className="text-xs text-slate-400">
                  Las monedas casi nunca son de oro 100% puro en su bruto ya que el oro puro es demasiado blando y se rayaría con facilidad. Se mezclan con cobre o plata (aleación). <br />
                  <code className="text-amber-400 font-mono text-[11px] bg-slate-950 p-1 rounded mt-1 inline-block block border border-slate-850">
                    Gramos de Oro Fino = Peso Bruto × Ley (Purity)
                  </code>
                  Por ejemplo, un Soberano pesa 7.988 gramos brutos pero tiene pureza de 22 quilates (ley 0.9167), lo que resulta en 7.322 gramos de oro fino.
                </p>

                <h4 className="font-bold text-amber-300 font-display text-xs sm:text-sm">
                  2. Conversión a Onza Troy Spot
                </h4>
                <p className="text-xs text-slate-400">
                  La unidad estándar internacional en el mercado de metales preciosos es la <strong>Onza Troy (31.1034768 gramos de metal puro)</strong>. El precio Spot cotiza por Onza Troy en dólares estadounidenses (USD). <br />
                  <code className="text-amber-400 font-mono text-[11px] bg-slate-950 p-1 rounded mt-1 inline-block block border border-slate-850">
                    Onzas Troy = Gramos de Oro Fino / 31.1034768
                  </code>
                </p>

                <h4 className="font-bold text-amber-300 font-display text-xs sm:text-sm">
                  3. El Ajuste de Descuento Local en Argentina
                </h4>
                <p className="text-xs text-slate-400">
                  En Argentina, el lingote físico o moneda cotiza normalmente con un <strong>descuento</strong> (habitualmente de entre el 2% y el 8%) respecto a la cotización internacional de Londres. Esto se debe a la brecha de exportación/importación, seguros de custodia y costos financieros locales. El cotizador aplica este descuento para hallar el <i>Precio Base Físico</i>.
                </p>

                <h4 className="font-bold text-emerald-300 font-display text-xs sm:text-sm">
                  4. Spread / Márgenes de Compra y Venta (La Casa)
                </h4>
                <p className="text-xs text-slate-400">
                  Como cualquier mercado físico de divisas o metales, las mesas de dinero y joyerías comerciales aplican un margen de intermediación:
                  <br />
                  • <strong>Compra (vos vendés):</strong> La casa te paga menos del precio base para retener un beneficio. (e.g., -5%)<br />
                  • <strong>Venta (vos comprás):</strong> La casa cobra un recargo por sobre el precio de referencia para cubrir los costos. (e.g., +2%)
                </p>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-400">
                  <strong className="text-slate-200 block mb-1">Resumen del Flujo de Cotización:</strong>
                  1. Peso Fino = Peso Bruto x Ley <br />
                  2. Valor Spot USD = (Peso Fino / 31.1035) x Precio Spot de la Onza <br />
                  3. Valor Base Argentina USD = Valor Spot USD x (1 - DescuentoArgentina / 100) <br />
                  4. Compra Cliente USD = Valor Base Argentina USD x (1 - MargenCompra / 100) <br />
                  5. Venta Cliente USD = Valor Base Argentina USD x (1 + MargenVenta / 100) <br />
                  6. En Pesos ARS = Valor en USD x Cotización de Dólar Blue
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setCalculatorInfoOpen(false)}
                  className="bg-amber-500 text-slate-950 text-xs font-bold py-2.5 px-5 rounded-xl cursor-pointer hover:bg-amber-400 transition-all"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 pt-8 pb-12 mt-12 text-slate-500 text-center text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center items-center gap-1 mb-2 font-display text-slate-400 font-semibold">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Valuador Profesional de Metales Preciosos v2.4</span>
          </div>
          <p className="max-w-md mx-auto leading-relaxed">
            Herramienta premium optimizada para joyerías, mesas numismáticas e inversores de monedas de oro en la República Argentina.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-[10px] font-mono text-slate-600">
            <span>Dólar Blue: {formatCurrency(settings.usdExchangeRateArs, "ARS", 0)}</span>
            <span>•</span>
            <span>Oro Spot: {formatCurrency(settings.ouncePriceUsd, "USD")} / Oz t</span>
            <span>•</span>
            <span>Parámetros 100% Personalizables</span>
          </div>
          <p className="mt-6 text-[10px] text-slate-700">
            © 2026 Reservados todos los derechos. Hecho por encargo en mercado local.
          </p>
        </div>
      </footer>

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              {/* Gold glow decoration inside modal */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <h3 className="font-bold font-display text-base text-slate-100 flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                {confirmDialog.title}
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-6">
                {confirmDialog.message}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-350 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
