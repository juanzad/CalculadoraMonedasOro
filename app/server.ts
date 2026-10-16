import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple in-memory cache for gold price
  let cachedPrice: { bid: number; ask: number; mid: number; timestamp: number } | null = null;
  const CACHE_MS = 5 * 60 * 1000; // 5 minutes cache

  async function fetchKitcoGoldPrice() {
    const now = Date.now();
    if (cachedPrice && (now - cachedPrice.timestamp < CACHE_MS)) {
      console.log("Using cached gold price");
      return cachedPrice;
    }

    try {
      console.log("Fetching live gold price from Kitco...");
      const res = await fetch("https://www.kitco.com/charts/gold", {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) {
        throw new Error("Could not find __NEXT_DATA__ script tag");
      }

      const nextDataObj = JSON.parse(match[1]);
      const queries = nextDataObj?.props?.pageProps?.dehydratedState?.queries || [];
      
      let bid = 0;
      let ask = 0;
      let mid = 0;

      for (const q of queries) {
        const metalQuote = q?.state?.data?.GetMetalQuoteV3;
        if (metalQuote && metalQuote.symbol === "AU") {
          const result = metalQuote.results?.[0];
          if (result) {
            bid = result.bid || result.mid || 0;
            ask = result.ask || result.mid || 0;
            mid = result.mid || (bid + ask) / 2 || 0;
            break;
          }
        }
      }

      // Try fallbacks if fields are empty
      if (bid === 0 || ask === 0 || mid === 0) {
        const auMatch = html.match(/"symbol"\s*:\s*"AU"[\s\S]*?"bid"\s*:\s*([\d.]+)/);
        const askMatch = html.match(/"symbol"\s*:\s*"AU"[\s\S]*?"ask"\s*:\s*([\d.]+)/);
        const midMatch = html.match(/"symbol"\s*:\s*"AU"[\s\S]*?"mid"\s*:\s*([\d.]+)/);

        if (auMatch) bid = parseFloat(auMatch[1]);
        if (askMatch) ask = parseFloat(askMatch[1]);
        if (midMatch) mid = parseFloat(midMatch[1]);
        if (mid === 0 && bid > 0 && ask > 0) mid = (bid + ask) / 2;
      }

      if (mid > 500 && mid < 10000) { // realistic range check
        cachedPrice = {
          bid: bid || mid,
          ask: ask || mid,
          mid: mid,
          timestamp: now
        };
        console.log("Successfully fetched and cached gold price:", cachedPrice);
        return cachedPrice;
      }

      throw new Error(`Parsed price out of range: ${mid}`);
    } catch (err: any) {
      console.error("Error fetching kitco gold price:", err.message);
      // Return cached price if available, even if stale
      if (cachedPrice) {
        console.log("Returning stale cached price due to fetch error");
        return cachedPrice;
      }
      return null;
    }
  }

  // API to fetch kitco gold price
  app.get("/api/gold-price", async (req, res) => {
    const price = await fetchKitcoGoldPrice();
    if (price) {
      res.json({ success: true, ...price });
    } else {
      res.status(500).json({ success: false, error: "Failed to fetch live gold price" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
