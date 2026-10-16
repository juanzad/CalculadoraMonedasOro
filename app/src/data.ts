import { GoldCoin } from "./types";

export const PRESET_COINS: GoldCoin[] = [
  {
    id: "centenario-mex",
    name: "Centenario (50 Pesos Oro)",
    totalWeight: 41.67,
    purity: 0.900,
    fineGoldWeight: 37.5,
    description: "La moneda de oro más famosa de México y muy valorada en Argentina. Contiene exactamente 37.5 gramos de oro puro."
  },
  {
    id: "krugerrand-sa",
    name: "Krugerrand (1 oz)",
    totalWeight: 33.93,
    purity: 0.9167,
    fineGoldWeight: 31.1035,
    description: "Moneda de origen sudafricano. Su peso bruto incluye aleación de cobre para mayor durabilidad, pero contiene 1 onza troy de oro puro."
  },
  {
    id: "argentino-5pesos",
    name: "Argentino (5 Pesos Oro)",
    totalWeight: 8.0645,
    purity: 0.900,
    fineGoldWeight: 7.258,
    description: "Moneda nacional acuñada entre 1881 y 1896. Un clásico muy cotizado en el mercado numismático e inversor local."
  },
  {
    id: "soberano-uk",
    name: "Soberano (Libra Esterlina)",
    totalWeight: 7.988,
    purity: 0.9167,
    fineGoldWeight: 7.322,
    description: "Famosa moneda británica de alta liquidez internacional. Contiene 7.322 gramos de oro fino de 22 quilates."
  },
  {
    id: "double-eagle-us",
    name: "Double Eagle ($20 USD)",
    totalWeight: 33.436,
    purity: 0.900,
    fineGoldWeight: 30.092,
    description: "Moneda histórica de Estados Unidos acuñada hasta 1933. Muy popular por su valor histórico y de metal."
  },
  {
    id: "napoleon-fr",
    name: "Napoleón (20 Francos)",
    totalWeight: 6.451,
    purity: 0.900,
    fineGoldWeight: 5.806,
    description: "Moneda tradicional francesa de 20 francos (coq o napoléon). Ideal para pequeños inversores por su liquidez."
  },
  {
    id: "libertad-mex",
    name: "Libertad (1 oz)",
    totalWeight: 31.1035,
    purity: 0.999,
    fineGoldWeight: 31.1035,
    description: "Moneda moderna de acuñación mexicana de oro puro ley .999."
  },
  {
    id: "maple-leaf-ca",
    name: "Maple Leaf (1 oz)",
    totalWeight: 31.11,
    purity: 0.9999,
    fineGoldWeight: 31.1035,
    description: "Acuñada por la Real Casa de la Moneda de Canadá, es una de las monedas de oro puro más populares del mundo con ley .9999."
  }
];

export const TROY_ONCE_GRAMS = 31.1034768; // exact physical mass in grams of a troy ounce
