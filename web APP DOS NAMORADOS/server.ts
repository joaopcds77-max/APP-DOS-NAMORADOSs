import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing for body payloads
  app.use(express.json({ limit: '10mb' }));

  // API endpoint for server-side Gemini API proxy to keep API keys hidden
  app.post("/api/generate", async (req, res) => {
    try {
      const { history } = req.body;

      if (!history || typeof history !== "string" || !history.trim()) {
        res.status(400).json({ error: "Mensagem de história vazia ou inválida." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("Chave de API GEMINI_API_KEY não encontrada nas variáveis de ambiente!");
        res.status(500).json({ error: "Chave de API do Gemini não configurada." });
        return;
      }

      // Initialize Gemini Client with standard agent build metadata
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Call Gemini 3.5 Flash for text rewriting tasks
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `História Bruta do Casal:\n"${history}"`,
        config: {
          systemInstruction: "Você é um assistente especializado em criar homenagens românticas. Você receberá o resumo da história de um casal. Seu trabalho é transformar esse texto bruto em uma declaração de amor altamente emocionante, poética e bem estruturada, contendo no máximo 3 parágrafos curtos. Corrija erros gramaticais e mantenha um tom profundamente apaixonado. Retorne apenas o texto final revisado."
        }
      });

      const text = response.text;
      if (!text) {
        res.status(500).json({ error: "A inteligência artificial retornou uma resposta em branco." });
        return;
      }

      res.json({ declaracao_ia: text });
    } catch (error: any) {
      console.error("Erro no proxy server-side do Gemini:", error);
      res.status(500).json({ error: error.message || "Erro interno de geração poética." });
    }
  });

  // YouTube Search Helper that scrapes standard YouTube search results HTML with multiple regex fallbacks and string-indexing
  async function searchYouTube(query: string) {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " audio")}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      if (!res.ok) {
        throw new Error(`YouTube search HTTP status ${res.status}`);
      }

      const html = await res.text();
      let jsonStr = "";
      
      const regex1 = /ytInitialData\s*=\s*({.+?});/;
      const regex2 = /window\["ytInitialData"\]\s*=\s*({.+?});/;
      const regex3 = /ytInitialData\s*=\s*({.+?})\s*;/;
      const regex4 = /"ytInitialData"\s*:\s*({.+?})\s*,/;

      const match = html.match(regex1) || html.match(regex2) || html.match(regex3) || html.match(regex4);

      if (!match) {
        const idx = html.indexOf("ytInitialData = ");
        if (idx !== -1) {
          const start = idx + "ytInitialData = ".length;
          const end = html.indexOf(";</script>", start);
          if (end !== -1) {
            jsonStr = html.substring(start, end).trim();
          }
        }
      } else {
        jsonStr = match[1];
      }

      if (!jsonStr) {
        throw new Error("Could not find ytInitialData in HTML");
      }

      const dataJson = JSON.parse(jsonStr);
      const renderers: any[] = [];
      
      function findVideoRenderers(obj: any) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.videoRenderer) {
          renderers.push(obj.videoRenderer);
        }
        for (const key of Object.keys(obj)) {
          findVideoRenderers(obj[key]);
        }
      }
      
      findVideoRenderers(dataJson);

      const items = renderers.slice(0, 10).map((renderer: any, i: number) => {
        const videoId = renderer.videoId;
        const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || "Música Romântica";
        const artist = renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || "YouTube Music";
        const coverUrl = renderer.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        
        return {
          id: videoId || String(i),
          title,
          artist,
          previewUrl: videoId || "",
          coverUrl
        };
      }).filter(t => t.previewUrl);

      return items;
    } catch (err) {
      console.error("[YouTube Scraper Error]", err);
      return [];
    }
  }

  // Pure YouTube Search Route
  app.get("/api/youtube/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== "string" || !query.trim()) {
        res.status(400).json({ error: "Sua busca está vazia." });
        return;
      }

      const FALLBACK_TRACKS = [
        {
          id: "2Vv-BfVoq4g",
          title: "Perfect",
          artist: "Ed Sheeran",
          previewUrl: "2Vv-BfVoq4g",
          coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop"
        },
        {
          id: "450p7gOxZqI",
          title: "All of Me",
          artist: "John Legend",
          previewUrl: "450p7gOxZqI",
          coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop"
        },
        {
          id: "rtOvBOTyX00",
          title: "A Thousand Years",
          artist: "Christina Perri",
          previewUrl: "rtOvBOTyX00",
          coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop"
        },
        {
          id: "2dRFUPWwyAs",
          title: "Like I'm Gonna Lose You",
          artist: "Meghan Trainor ft. John Legend",
          previewUrl: "2dRFUPWwyAs",
          coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=200&auto=format&fit=crop"
        },
        {
          id: "C_CSjcm-z1w",
          title: "My Girl",
          artist: "The Temptations",
          previewUrl: "C_CSjcm-z1w",
          coverUrl: "https://images.unsplash.com/photo-1487180144351-b8472da7a4c3?q=80&w=200&auto=format&fit=crop"
        }
      ];

      console.log(`[YouTube Engine] Searching for matching tracks for: "${query}"`);
      const tracks = await searchYouTube(query);

      if (tracks && tracks.length > 0) {
        res.json({ tracks, isDemo: false });
      } else {
        console.log("[YouTube Engine] Scraper returned 0 matches. Supplying popular preset items.");
        const lowercaseQuery = query.toLowerCase();
        const filtered = FALLBACK_TRACKS.filter(t => 
          t.title.toLowerCase().includes(lowercaseQuery) || 
          t.artist.toLowerCase().includes(lowercaseQuery)
        );
        res.json({ tracks: filtered.length > 0 ? filtered : FALLBACK_TRACKS, isDemo: true });
      }
    } catch (err: any) {
      console.error("Erro ao buscar no YouTube Engine:", err);
      res.status(500).json({ error: "Erro interno ao processar busca." });
    }
  });

  // Serve static assets or mount the live Vite middleware if in dev environment
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
    console.log(`[FULLSTACK SERVER] Rodando na porta http://localhost:${PORT}`);
  });
}

startServer();
