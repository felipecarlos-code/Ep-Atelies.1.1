import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import dns from "dns";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
// DNS default order is not overridden to ensure smooth DNS resolution in Vercel serverless environment.

// Ultra-lightweight direct Supabase PostgREST helper to avoid hanging connection pools on Vercel Serverless Functions
async function callSupabaseREST(
  url: string,
  key: string,
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const method = options.method || "GET";
  // Ensure we don't have double slashes
  const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
  const targetUrl = `${baseUrl}/rest/v1/${path}`;

  const headers: Record<string, string> = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Accept": "application/json",
    "Connection": "close",
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // Strict 6-second timeout

  try {
    const res = await globalThis.fetch(targetUrl, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      keepalive: false,
    });

    clearTimeout(timeoutId);

    // Parse JSON safely
    let responseData: any = null;
    const responseText = await res.text();
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }
    }

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: responseData?.message || responseData?.details || responseText || `HTTP error ${res.status}`,
          code: responseData?.code || String(res.status),
          hint: responseData?.hint || "",
        },
      };
    }

    return { data: responseData, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      data: null,
      error: {
        message: isTimeout 
          ? "A requisição ao Supabase expirou (timeout de 6s). Verifique se o seu projeto do Supabase está ativo/pausado." 
          : err?.message || String(err),
        code: isTimeout ? "TIMEOUT" : "FETCH_ERROR",
        hint: "",
      },
    };
  }
}

export function createExpressApp() {
  const app = express();

  // Graceful Gemini initialization
  let aiClient: GoogleGenAI | null = null;
  try {
    if (process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("[Gemini] Client initialized successfully for logo search fallback.");
    } else {
      console.warn("[Gemini] GEMINI_API_KEY not found in environment. Fallback will rely on smart heuristics.");
    }
  } catch (error: any) {
    console.error("[Gemini] Failed to initialize Gemini client:", error.message);
  }

  // Middleware for JSON payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Load database status & state
  app.get("/api/db/load", async (req, res) => {
    // Ensure connection close header to prevent serverless function hangs
    res.setHeader("Connection", "close");

    const rawUrl = req.headers["x-supabase-url"] || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const rawKey = req.headers["x-supabase-key"] || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    const hasHeaderUrl = !!req.headers["x-supabase-url"];
    const hasHeaderKey = !!req.headers["x-supabase-key"];
    const diagnostics = {
      hasSupabaseUrl: !!rawUrl,
      hasSupabaseKey: !!rawKey,
      isUsingClientCredentials: hasHeaderUrl && hasHeaderKey
    };

    const urlStr = typeof rawUrl === "string" ? rawUrl.trim() : undefined;
    const keyStr = typeof rawKey === "string" ? rawKey.trim() : undefined;

    // 1. Check if Supabase is active
    if (urlStr && keyStr) {
      try {
        // Query app_state table via direct PostgREST GET call
        const { data, error } = await callSupabaseREST(
          urlStr,
          keyStr,
          "app_state?id=eq.latest&select=data"
        );

        if (error) {
          // PGRST116 is normal for empty result, but if it's "does not exist" or other postgres errors (code 42P01)
          if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("not found")) {
            console.warn("[Supabase] Table 'app_state' does not exist in your Supabase database. Prompting user to create it.");
            return res.json({ 
              success: true, 
              configured: true, 
              isSupabase: true,
              data: null, 
              warning: "A tabela 'app_state' não existe no Supabase. Crie-a no SQL Editor do Supabase.",
              diagnostics: {
                ...diagnostics,
                hasTable: false
              }
            });
          }
          throw new Error(error.message);
        }

        const row = Array.isArray(data) ? data[0] : null;

        return res.json({ 
          success: true, 
          configured: true, 
          isSupabase: true,
          data: row ? row.data : null,
          diagnostics: {
            ...diagnostics,
            hasTable: true
          }
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error("[Supabase] Error fetching database document:", errorMsg);
        return res.status(200).json({ 
          success: false, 
          configured: false, 
          error: `Erro de conexão com o Supabase: ${errorMsg}`,
          diagnostics: {
            ...diagnostics,
            connectionError: errorMsg
          }
        });
      }
    }

    // Fallback
    return res.json({ 
      success: false, 
      configured: false, 
      error: "Nenhum banco de dados configurado.", 
      diagnostics 
    });
  });

  // Save database state
  app.post("/api/db/save", async (req, res) => {
    // Ensure connection close header to prevent serverless function hangs
    res.setHeader("Connection", "close");

    const payload = req.body;
    const rawUrl = req.headers["x-supabase-url"] || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const rawKey = req.headers["x-supabase-key"] || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    const hasHeaderUrl = !!req.headers["x-supabase-url"];
    const hasHeaderKey = !!req.headers["x-supabase-key"];
    const diagnostics = {
      hasSupabaseUrl: !!rawUrl,
      hasSupabaseKey: !!rawKey,
      isUsingClientCredentials: hasHeaderUrl && hasHeaderKey
    };

    const urlStr = typeof rawUrl === "string" ? rawUrl.trim() : undefined;
    const keyStr = typeof rawKey === "string" ? rawKey.trim() : undefined;

    // 1. Check if Supabase is active
    if (urlStr && keyStr) {
      try {
        // Upsert state via direct PostgREST POST call
        const { error } = await callSupabaseREST(
          urlStr,
          keyStr,
          "app_state?on_conflict=id",
          {
            method: "POST",
            headers: {
              "Prefer": "resolution=merge-duplicates"
            },
            body: { 
              id: "latest", 
              data: payload, 
              updated_at: new Date().toISOString() 
            }
          }
        );

        if (error) {
          if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("not found")) {
            return res.status(200).json({
              success: false,
              configured: true,
              isSupabase: true,
              error: "A tabela 'app_state' não existe no Supabase.",
              code: "TABLE_NOT_FOUND",
              diagnostics: {
                ...diagnostics,
                hasTable: false
              }
            });
          }
          throw new Error(error.message);
        }

        return res.json({ success: true, isSupabase: true, diagnostics });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error("[Supabase] Error writing database document:", errorMsg);
        return res.status(200).json({ 
          success: false, 
          error: `Erro do Supabase: ${errorMsg}`,
          diagnostics: {
            ...diagnostics,
            connectionError: errorMsg
          }
        });
      }
    }

    return res.status(200).json({ success: false, error: "Database not configured.", diagnostics });
  });

  // Dynamic NPS analysis and AI report suggestions endpoint
  app.post("/api/nps/analyze", async (req, res) => {
    res.setHeader("Connection", "close");
    const { turmas = [], partners = [], atelies = [] } = req.body;

    // 1. Process data locally for statistics and fallback
    const parsedTurmas = turmas.map((t: any) => {
      let npsVal: number | null = null;
      if (t.epNps) {
        const clean = String(t.epNps).replace("%", "").trim();
        const parsed = parseFloat(clean);
        if (!isNaN(parsed)) {
          npsVal = parsed;
        }
      }
      return {
        ...t,
        npsNumeric: npsVal
      };
    });

    const activeNpsTurmas = parsedTurmas.filter((t: any) => t.npsNumeric !== null);
    
    // Stats computation
    let overallNps = 0;
    if (activeNpsTurmas.length > 0) {
      overallNps = activeNpsTurmas.reduce((sum: number, t: any) => sum + t.npsNumeric!, 0) / activeNpsTurmas.length;
    }

    // Group by Course
    const courseStats: Record<string, { sum: number; count: number; avg: number }> = {};
    // Group by Partner
    const partnerStats: Record<string, { name: string; sum: number; count: number; avg: number }> = {};
    
    // Build partner lookup
    const partnerMap = new Map<string, string>(partners.map((p: any) => [p.id as string, p.name as string]));

    activeNpsTurmas.forEach((t: any) => {
      // Course
      const courseName = t.course || "Não Especificado";
      if (!courseStats[courseName]) {
        courseStats[courseName] = { sum: 0, count: 0, avg: 0 };
      }
      courseStats[courseName].sum += t.npsNumeric!;
      courseStats[courseName].count += 1;

      // Partner
      if (t.partnerId) {
        const pName = partnerMap.get(t.partnerId) || "Parceiro Desconhecido";
        if (!partnerStats[t.partnerId]) {
          partnerStats[t.partnerId] = { name: pName, sum: 0, count: 0, avg: 0 };
        }
        partnerStats[t.partnerId].sum += t.npsNumeric!;
        partnerStats[t.partnerId].count += 1;
      }
    });

    // Finalize averages
    Object.keys(courseStats).forEach(c => {
      courseStats[c].avg = Math.round((courseStats[c].sum / courseStats[c].count) * 10) / 10;
    });
    Object.keys(partnerStats).forEach(pId => {
      partnerStats[pId].avg = Math.round((partnerStats[pId].sum / partnerStats[pId].count) * 10) / 10;
    });

    // Format local fallback
    const courseStatsList = Object.entries(courseStats).map(([course, stats]) => `- **${course}**: Média NPS de ${stats.avg} (${stats.count} projeto(s))`);
    const partnerStatsList = Object.entries(partnerStats).map(([_, stats]) => `- **${stats.name}**: Média NPS de ${stats.avg} (${stats.count} projeto(s))`);
    
    const localAnalysis = `### Resumo Executivo (Análise Local)
Atualmente, temos **${activeNpsTurmas.length}** negócios com notas de NPS registradas, de um total de **${turmas.length}** turmas.

- **NPS Geral Médio**: ${activeNpsTurmas.length > 0 ? overallNps.toFixed(1) : "N/A"}
- **Desempenho por Curso**:
${courseStatsList.length > 0 ? courseStatsList.join("\n") : "  *Nenhum dado por curso disponível.*"}

- **Desempenho por Parceiro**:
${partnerStatsList.length > 0 ? partnerStatsList.join("\n") : "  *Nenhum dado por parceiro disponível.*"}

### Sugestão de Relatório Estratégico
Como coordenador, para potencializar os resultados de NPS dos projetos do Inteli, sugerimos a criação e acompanhamento de dois novos painéis estruturados de relatórios:
1. **Painel de Alinhamento de Expectativas com Parceiros**:
   - Cruza a nota de NPS final com os feedbacks intermediários coletados nas Sprints.
   - Identifica desvios de escopo precocemente (Sprint 2/3) antes do encerramento.
2. **Relatório de Correlação Ateliê vs. NPS**:
   - Analisa quais Ateliês físicos (ou metodologias) geram os maiores índices de promotores de satisfação.
   - Permite replicar boas práticas de infraestrutura e mentoria entre turmas.`;

    // 2. Try Gemini if available
    if (aiClient) {
      try {
        const prompt = `Você é um Analista de Dados e Coordenador Acadêmico sênior do Inteli (Instituto de Tecnologia e Liderança).
Analise o seguinte conjunto de dados de NPS (Net Promoter Score) de projetos acadêmicos desenvolvidos em parceria com empresas do mercado.

DADOS DA PLATAFORMA:
- NPS Médio Geral: ${overallNps.toFixed(1)}
- Número de Projetos com NPS: ${activeNpsTurmas.length} de ${turmas.length}
- Distribuição por Curso: ${JSON.stringify(courseStats)}
- Distribuição por Parceiro: ${JSON.stringify(partnerStats)}

PROJETOS RELEVANTES:
${activeNpsTurmas.map((t: any) => `- Projeto "${t.projectTitle || t.name}" | Curso: ${t.course} | Parceiro: ${partnerMap.get(t.partnerId) || "Não informado"} | NPS: ${t.epNps}`).join("\n")}

Com base nesses dados, gere um relatório executivo de altíssimo nível em Markdown (em português brasileiro), estruturado da seguinte forma:

1. **Análise Executiva do NPS**: Um diagnóstico aprofundado e perspicaz dos dados apresentados. Discuta a média geral, destaque os cursos ou parceiros com maior engajamento e explique o que isso indica sobre as entregas dos alunos.
2. **Destaques de Sucesso (Promotores)**: Identifique de 1 a 3 projetos/parceiros que são os grandes "Promotores" de satisfação deste ciclo e por que essa relação funcionou tão bem.
3. **Pontos de Atenção e Riscos (Detratores/Passivos)**: Aponte quais cursos ou parceiros correm risco de insatisfação ou estão abaixo da meta ideal (idealmente NPS acima de 70 ou 75).
4. **💡 SUGESTÃO DE NOVO RELATÓRIO**: Faça uma recomendação inovadora e extremamente prática de um *novo tipo de relatório ou cruzamento de dados* que a plataforma deveria oferecer no futuro para ajudar a coordenação a prever notas de NPS baixas ou identificar problemas de relacionamento antes do fim do semestre.
5. **Plano de Ação Sugerido**: Liste 3 ações imediatas, práticas e claras para a coordenação acadêmica aplicar junto às equipes de alunos ou com as empresas parceiras.

Mantenha o tom profissional, encorajador, focado em dados e soluções estratégicas. Não use cabeçalhos h1 (use h2 e h3 para encaixar bem no layout).`;

        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        const text = response.text;
        if (text) {
          return res.json({
            success: true,
            analysis: text,
            isAi: true
          });
        }
      } catch (err: any) {
        console.error("[Gemini API Error] Failed to generate NPS analysis:", err);
      }
    }

    // Return local fallback if no AI or if AI failed
    return res.json({
      success: true,
      analysis: localAnalysis,
      isAi: false
    });
  });

  // Proxy endpoint to search for brand logos and domains via Clearbit Autocomplete and Gemini Fallback
  app.get("/api/logo/search", async (req, res) => {
    const query = req.query.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query parameter is required." });
    }

    const cleanQuery = query.trim();
    const suggestions: Array<{ name: string; domain: string; logo: string }> = [];
    const seenDomains = new Set<string>();

    // Helper to add unique suggestion safely
    const addSuggestion = (name: string, domain: string) => {
      const cleanDomain = domain.toLowerCase().trim().replace(/^www\./, "");
      if (cleanDomain && !seenDomains.has(cleanDomain)) {
        seenDomains.add(cleanDomain);
        suggestions.push({
          name: name.trim(),
          domain: cleanDomain,
          logo: `https://logo.clearbit.com/${cleanDomain}`
        });
      }
    };

    // 1. First Attempt: Try Clearbit Autocomplete Suggest API
    try {
      const clearbitRes = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleanQuery)}`, {
        signal: AbortSignal.timeout(3000) // 3s timeout
      });
      if (clearbitRes.ok) {
        const data = await clearbitRes.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item && item.name && item.domain) {
              addSuggestion(item.name, item.domain);
            }
          });
        }
      }
    } catch (err: any) {
      console.warn("[Logo Proxy] Clearbit API failed or timed out:", err.message);
    }

    // 2. Second Attempt: If Clearbit returned nothing/few results, try Gemini to resolve Brazilian and international brands
    if (suggestions.length < 2 && aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Dado o termo de busca de empresa ou marca: "${cleanQuery}", identifique as 1 a 3 empresas ou instituições reais mais prováveis correspondentes (especialmente brasileiras ou multinacionais).
Forneça o nome completo da empresa e seu domínio de website oficial (ex: btgpactual.com, google.com, inteli.edu.br).
Você DEVE retornar no formato JSON estrito, sem formatação markdown ou textos explicativos adicionais.
O JSON deve ser exatamente um array contendo objetos com os seguintes campos:
[
  {
    "name": "Nome Completo da Empresa",
    "domain": "dominio.com"
  }
]`,
        });

        let text = response.text || "";
        // Strip markdown formatting if any
        if (text.includes("```json")) {
          text = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) {
          text = text.split("```")[1].split("```")[0];
        }

        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item && item.name && item.domain) {
              addSuggestion(item.name, item.domain);
            }
          });
        }
      } catch (err: any) {
        console.error("[Logo Proxy] Gemini Fallback failed:", err.message);
      }
    }

    // 3. Third Attempt: Direct smart heuristic fallback based on words of the query
    if (suggestions.length === 0) {
      const normalized = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const slug = normalized.replace(/[^a-z0-9]/g, "");
      if (slug.length >= 2) {
        addSuggestion(cleanQuery, `${slug}.com.br`);
        addSuggestion(cleanQuery, `${slug}.com`);
      }
    }

    res.json({ success: true, data: suggestions });
  });

  // Google OAuth Authentication Endpoints
  app.get("/api/auth/google/status", (req, res) => {
    res.json({
      configured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID || null
    });
  });

  app.get("/api/auth/google/url", (req, res) => {
    const client_id = process.env.GOOGLE_CLIENT_ID || "";
    const redirect_uri = req.query.redirect_uri as string;

    if (!client_id) {
      return res.status(400).json({ error: "GOOGLE_CLIENT_ID não está configurado no servidor (.env)." });
    }
    if (!redirect_uri) {
      return res.status(400).json({ error: "redirect_uri é obrigatório." });
    }

    const params = new URLSearchParams({
      client_id,
      redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "consent",
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: googleAuthUrl });
  });

  app.get(["/auth/google/callback", "/auth/google/callback/", "/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: "${error}" }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Erro na autenticação: ${error}</p>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send("Código de autenticação ausente.");
    }

    const client_id = process.env.GOOGLE_CLIENT_ID || "";
    const client_secret = process.env.GOOGLE_CLIENT_SECRET || "";
    
    // Build redirect_uri dynamically based on the current request
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirect_uri = `${protocol}://${host}${req.path}`;
    
    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id,
          client_secret,
          redirect_uri,
          grant_type: "authorization_code"
        })
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      const tokens = await tokenRes.json();
      const accessToken = tokens.access_token;

      // Fetch user profile from Google UserInfo endpoint
      const userProfileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userProfileRes.ok) {
        throw new Error(`Failed to fetch user profile from Google: ${userProfileRes.statusText}`);
      }

      const userProfile = await userProfileRes.json();
      
      const safeName = String(userProfile.name || "").replace(/"/g, '\\"');
      const safeEmail = String(userProfile.email || "").replace(/"/g, '\\"');
      const safePicture = String(userProfile.picture || "").replace(/"/g, '\\"');

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  user: {
                    name: "${safeName}",
                    email: "${safeEmail}",
                    picture: "${safePicture}"
                  }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Autenticado com sucesso. Esta janela fechará automaticamente...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Erro no callback do Google OAuth:", err);
      const safeError = String(err.message || err).replace(/"/g, '\\"');
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: "${safeError}" }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Erro ao processar login: ${safeError}</p>
          </body>
        </html>
      `);
    }
  });

  // Helper to resolve HubSpot Access Token
  const getHubSpotToken = (req: express.Request): string | undefined => {
    const headerToken = req.headers["x-hubspot-token"];
    if (typeof headerToken === "string" && headerToken.trim().length > 0) {
      return headerToken.trim();
    }
    return process.env.HUBSPOT_ACCESS_TOKEN;
  };

  // 1. HubSpot Configuration Status
  app.get("/api/hubspot/status", async (req, res) => {
    const token = getHubSpotToken(req);
    const isConfigured = !!token && token.trim().length > 0;
    let portalId = null;

    if (isConfigured) {
      try {
        const response = await fetch("https://api.hubapi.com/account-info/v3/details", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          portalId = data.portalId || null;
        }
      } catch (err) {
        console.error("Non-blocking error fetching HubSpot portal ID:", err);
      }
    }

    res.json({
      configured: isConfigured,
      hasTokenEnv: !!process.env.HUBSPOT_ACCESS_TOKEN,
      hasHeaderToken: !!req.headers["x-hubspot-token"],
      portalId: portalId
    });
  });

  // 2. Fetch HubSpot Schemas / Available Object Types
  app.get("/api/hubspot/schemas", async (req, res) => {
    const token = getHubSpotToken(req);
    if (!token || token.trim().length === 0) {
      return res.status(200).json({
        configured: false,
        schemas: [
          { name: "companies", label: "Empresas (Companies)", isCustom: false },
          { name: "deals", label: "Negócios (Deals)", isCustom: false },
          { name: "contacts", label: "Contatos (Contacts)", isCustom: false }
        ],
        message: "HubSpot access token is missing. Configure HUBSPOT_ACCESS_TOKEN or input your token directly."
      });
    }

    try {
      // Call HubSpot Schemas API to list custom objects
      const response = await fetch("https://api.hubapi.com/crm/v3/schemas", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const standardSchemas = [
        { name: "companies", label: "Empresas (Companies) - Standard", isCustom: false },
        { name: "deals", label: "Negócios (Deals) - Standard", isCustom: false },
        { name: "contacts", label: "Contatos (Contacts) - Standard", isCustom: false }
      ];

      if (!response.ok) {
        // Fallback to standard if the API call fails (e.g., permission issue)
        return res.json({
          configured: true,
          schemas: standardSchemas,
          warning: "Could not fetch custom schemas. Showing standard schemas only."
        });
      }

      const data = await response.json();
      const customSchemas = (data.results || []).map((schema: any) => ({
        name: schema.fullyQualifiedName || schema.name,
        label: `${schema.labels?.plural || schema.name} (Custom)`,
        isCustom: true,
        properties: (schema.properties || []).map((p: any) => ({
          name: p.name,
          label: p.label || p.name
        }))
      }));

      res.json({
        configured: true,
        schemas: [...standardSchemas, ...customSchemas]
      });
    } catch (error: any) {
      res.json({
        configured: true,
        schemas: [
          { name: "companies", label: "Empresas (Companies)", isCustom: false },
          { name: "deals", label: "Negócios (Deals)", isCustom: false },
          { name: "contacts", label: "Contatos (Contacts)", isCustom: false }
        ],
        error: error.message
      });
    }
  });

  // 3. Perform HubSpot Data Sync Query
  app.post("/api/hubspot/fetch", async (req, res) => {
    const token = getHubSpotToken(req);
    const { mappings, syncTarget } = req.body;

    if (!token || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "HubSpot access token is not configured."
      });
    }

    try {
      const results: { partners: any[]; turmas: any[]; atelies: any[] } = {
        partners: [],
        turmas: [],
        atelies: []
      };

      // Declare variables for dynamically discovered keys to be used across extraction steps
      let discoveredAtelieKeys: string[] = [];
      let discoveredTurmaCodeKeys: string[] = [];
      let discoveredTurmaIdKeys: string[] = [];

      // Define default or custom fetcher helper with pagination support
      const fetchHubSpotObjects = async (objectType: string, properties: string[]) => {
        // Define default properties based on object type to avoid 400 Bad Request
        let defaultProps = ["createdate"];
        if (objectType === "companies") {
          defaultProps.push("name", "domain");
        } else if (objectType === "contacts") {
          defaultProps.push("firstname", "lastname", "email");
        } else if (objectType === "deals") {
          defaultProps.push("dealname", "pipeline");
        }

        const uniqueProps = Array.from(new Set([...defaultProps, ...properties])).filter(Boolean);
        let allResults: any[] = [];
        let hasMore = true;
        let afterCursor = "";
        let pageCount = 0;
        const maxPages = 50; // Safety guard: fetches up to 5,000 items total
        
        while (hasMore && pageCount < maxPages) {
          let url = `https://api.hubapi.com/crm/v3/objects/${objectType}?limit=100&properties=${uniqueProps.join(",")}`;
          if (objectType === "deals") {
            url += "&associations=companies&associations=company";
          }
          if (afterCursor) {
            url += `&after=${afterCursor}`;
          }
          
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`HubSpot Error for ${objectType}:`, errText);
            if (res.status === 403) {
              throw new Error(`Failed to fetch ${objectType} from HubSpot: Forbidden (403). O seu token de acesso privado do HubSpot não possui o escopo necessário ("crm.objects.${objectType}.read"). Por favor, adicione esta permissão em seu Private App no HubSpot.`);
            }
            throw new Error(`Failed to fetch ${objectType} from HubSpot: ${res.statusText}`);
          }

          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
          }

          if (data.paging?.next?.after) {
            afterCursor = data.paging.next.after;
            hasMore = true;
            pageCount++;
          } else {
            hasMore = false;
          }
        }
        
        return allResults;
      };

      // 1. Fetch available properties for Deals to discover actual internal names of custom properties.
      // This prevents 400 Bad Request on non-existent properties, and handles any user naming conventions!
      let dealPropertiesToRequest = ["dealname", "pipeline", "createdate", "dealstage", "description"];

      // Setup default resolved keys:
      let resolvedKeys = {
        dealstage: "dealstage",
        description: "description",
        titulo_projeto_c: "titulo_projeto_c",
        ep_ano_de_aplicacao: "ep_ano_de_aplicacao",
        ep_tri_de_aplicacao: "ep_tri_de_aplicacao",
        modulo_curso: "modulo_curso",
        codigo_turma_c: "codigo_turma_c",
        ep_id_unico_da_turma: "ep_id_unico_da_turma",
        period: "period",
        ep_descricao_curta_do_projeto: "ep_descricao_curta_do_projeto",
        ep_nps: "nps",
        ep_orientador: "ep_orientador"
      };

      try {
        console.log("Fetching HubSpot deal property schemas to discover internal custom field names...");
        const propsRes = await fetch("https://api.hubapi.com/crm/v3/properties/deals", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (propsRes.ok) {
          const propsData = await propsRes.json();
          const props = propsData.results || [];
          
          // Create a helper to find property by name or label match
          const findProp = (possibleNames: string[], labelKeywords: string[][]) => {
            // 1. Try exact name match
            const exact = props.find((p: any) => possibleNames.includes(p.name.toLowerCase()));
            if (exact) return exact.name;
            
            // 2. Try label matching (all keywords in any row must match)
            for (const p of props) {
              const label = String(p.label || "").toLowerCase();
              const name = String(p.name || "").toLowerCase();
              
              for (const keywords of labelKeywords) {
                if (keywords.every(kw => label.includes(kw) || name.includes(kw))) {
                  return p.name;
                }
              }
            }
            return null;
          };

          // Resolve each key:
          const tituloKey = findProp(["titulo_projeto_c", "titulo_projeto", "titulo_do_projeto"], [["titulo", "projeto"]]);
          if (tituloKey) resolvedKeys.titulo_projeto_c = tituloKey;

          const anoKey = findProp(["ep_ano_de_aplicacao", "ano_de_aplicacao", "ep_ano"], [["ano", "aplicacao"], ["ano", "aplicação"]]);
          if (anoKey) resolvedKeys.ep_ano_de_aplicacao = anoKey;

          const triKey = findProp(["ep_tri_de_aplicacao", "tri_de_aplicacao", "trimestre_de_aplicacao", "ep_tri"], [["trimestre", "aplicacao"], ["trimestre", "aplicação"], ["tri", "aplicacao"], ["tri", "aplicação"]]);
          if (triKey) resolvedKeys.ep_tri_de_aplicacao = triKey;

          const moduloKey = findProp(["modulo_curso", "modulo_do_curso", "modulo"], [["modulo", "curso"], ["módulo", "curso"]]);
          if (moduloKey) resolvedKeys.modulo_curso = moduloKey;

          const codigoKey = findProp(["codigo_turma_c", "codigo_da_turma", "ep_codigo_da_turma"], [["codigo", "turma"], ["código", "turma"]]);
          if (codigoKey) resolvedKeys.codigo_turma_c = codigoKey;

          const idUnicoKey = findProp(["ep_id_unico_da_turma", "id_unico_da_turma", "ep_id_unico"], [["id", "unico", "turma"], ["id", "único", "turma"], ["id", "turma"]]);
          if (idUnicoKey) resolvedKeys.ep_id_unico_da_turma = idUnicoKey;

          const periodKey = findProp(["period", "periodo", "período", "turno", "ep_turno", "ep_periodo", "turno_letivo", "periodo_letivo", "turno_c", "periodo_c"], [["turno"], ["periodo"], ["período"], ["period"]]);
          if (periodKey) resolvedKeys.period = periodKey;

          const descCurtaKey = findProp(["ep_descricao_curta_do_projeto", "descricao_curta_do_projeto", "descricao_curta"], [["descricao", "curta", "projeto"], ["descrição", "curta", "projeto"], ["descricao", "curta"], ["descrição", "curta"]]);
          if (descCurtaKey) resolvedKeys.ep_descricao_curta_do_projeto = descCurtaKey;

          const npsKey = findProp(["ep_nps", "nps", "ep_nps_c", "nps_c"], [["nps"], ["net promoter score"]]);
          if (npsKey) resolvedKeys.ep_nps = npsKey;

          const orientadorKey = findProp(["ep_orientador", "orientador", "orientador_c", "ep_orientador_c"], [["orientador"], ["advisor"]]);
          if (orientadorKey) resolvedKeys.ep_orientador = orientadorKey;

          props.forEach((p: any) => {
            const label = String(p.label || "").toLowerCase();
            const name = String(p.name || "").toLowerCase();
            
            // Ateliê field matching (e.g. "[EP] Ateliê" or "ep_atelie")
            if (label.includes("ateliê") || label.includes("atelie") || name === "ep_atelie" || name === "atelie") {
              discoveredAtelieKeys.push(p.name);
            }
          });

          console.log("Dynamically discovered HubSpot Deal properties:", resolvedKeys, {
            atelieKeys: discoveredAtelieKeys
          });

          // Append discovered properties safely to avoid any HubSpot Bad Request errors!
          dealPropertiesToRequest = Array.from(new Set([
            ...dealPropertiesToRequest,
            resolvedKeys.titulo_projeto_c,
            resolvedKeys.ep_ano_de_aplicacao,
            resolvedKeys.ep_tri_de_aplicacao,
            resolvedKeys.modulo_curso,
            resolvedKeys.codigo_turma_c,
            resolvedKeys.ep_id_unico_da_turma,
            resolvedKeys.period,
            resolvedKeys.ep_descricao_curta_do_projeto,
            resolvedKeys.ep_nps,
            resolvedKeys.ep_orientador,
            ...discoveredAtelieKeys
          ])).filter(Boolean);
        } else {
          console.warn(`Could not fetch Deal properties list from HubSpot (Status ${propsRes.status}). Using safe fallback property list.`);
          dealPropertiesToRequest = [
            "dealname", "pipeline", "createdate", "dealstage", "description",
            "titulo_projeto_c", "ep_ano_de_aplicacao", "ep_tri_de_aplicacao",
            "modulo_curso", "codigo_turma_c", "ep_id_unico_da_turma",
            "period", "periodo", "turno", "ep_turno", "ep_periodo",
            "ep_atelie", "atelie", "ateliê", "ep_descricao_curta_do_projeto", "descricao_curta_do_projeto",
            "nps", "ep_nps", "ep_orientador", "orientador"
          ];
        }
      } catch (propsErr: any) {
        console.error("Non-blocking error fetching deal properties list:", propsErr.message);
        dealPropertiesToRequest = [
          "dealname", "pipeline", "createdate", "dealstage", "description",
          "titulo_projeto_c", "ep_ano_de_aplicacao", "ep_tri_de_aplicacao",
          "modulo_curso", "codigo_turma_c", "ep_id_unico_da_turma",
          "period", "periodo", "turno", "ep_turno", "ep_periodo",
          "ep_atelie", "atelie", "ateliê", "ep_descricao_curta_do_projeto", "descricao_curta_do_projeto",
          "nps", "ep_nps", "ep_orientador", "orientador"
        ];
      }

      // Define Batch helper function for companies
      const batchReadCompanies = async (companyIds: string[]) => {
        let detailedCompanies: any[] = [];
        const chunkSize = 100;
        for (let i = 0; i < companyIds.length; i += chunkSize) {
          const chunk = companyIds.slice(i, i + chunkSize);
          try {
            console.log(`Batch-reading ${chunk.length} associated companies...`);
            const batchUrl = "https://api.hubapi.com/crm/v3/objects/companies/batch/read";
            const batchRes = await fetch(batchUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                properties: ["name", "domain"],
                inputs: chunk.map(id => ({ id }))
              })
            });
            
            if (batchRes.ok) {
              const data = await batchRes.json();
              if (data.results && Array.isArray(data.results)) {
                detailedCompanies = detailedCompanies.concat(data.results);
              }
            } else {
              const errText = await batchRes.text();
              console.error(`Batch read companies error:`, errText);
            }
          } catch (batchErr: any) {
            console.error("Non-blocking error during batch reading companies:", batchErr.message);
          }
        }
        return detailedCompanies;
      };

      // Define Batch helper function for deals to get associations reliably
      const batchReadDealsWithAssociations = async (dealIds: string[], properties: string[]) => {
        let detailedDeals: any[] = [];
        const chunkSize = 100;
        for (let i = 0; i < dealIds.length; i += chunkSize) {
          const chunk = dealIds.slice(i, i + chunkSize);
          try {
            console.log(`Batch-reading properties and associations for ${chunk.length} deals...`);
            const batchUrl = "https://api.hubapi.com/crm/v3/objects/deals/batch/read?associations=companies&associations=company";
            const batchRes = await fetch(batchUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                properties: properties,
                inputs: chunk.map(id => ({ id })),
                associations: ["companies", "company"]
              })
            });
            
            if (batchRes.ok) {
              const data = await batchRes.json();
              if (data.results && Array.isArray(data.results)) {
                detailedDeals = detailedDeals.concat(data.results);
              }
            } else {
              const errText = await batchRes.text();
              console.error(`Batch read deals error:`, errText);
            }
          } catch (batchErr: any) {
            console.error("Non-blocking error during batch reading deals:", batchErr.message);
          }
        }
        return detailedDeals;
      };

      // Define Batch helper to fetch associations from Deals to Companies using the official CRM associations batch API
      const batchGetAssociationsForDeals = async (dealIds: string[]) => {
        const associationsMap = new Map<string, string[]>(); // dealId -> companyIds[]
        const chunkSize = 100;
        for (let i = 0; i < dealIds.length; i += chunkSize) {
          const chunk = dealIds.slice(i, i + chunkSize);
          try {
            console.log(`Fetching associations from CRM associations API for ${chunk.length} deals...`);
            const assocUrl = "https://api.hubapi.com/crm/v3/associations/deals/companies/batch/read";
            const assocRes = await fetch(assocUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                inputs: chunk.map(id => ({ id }))
              })
            });
            
            if (assocRes.ok) {
              const data = await assocRes.json();
              if (data.results && Array.isArray(data.results)) {
                data.results.forEach((item: any) => {
                  const dealId = String(item.from?.id);
                  const companyIds = (item.to || []).map((t: any) => String(t.id)).filter(Boolean);
                  associationsMap.set(dealId, companyIds);
                });
              }
            } else {
              const errText = await assocRes.text();
              console.error(`Associations batch read error:`, errText);
            }
          } catch (assocErr: any) {
            console.error("Non-blocking error during batch associations reading:", assocErr.message);
          }
        }
        return associationsMap;
      };

      // 2. Set Pipeline ID strictly to 790660018 for "B2B - EP - Iniciativas"
      let targetPipelineId: string = "790660018";
      const stagesMap = new Map<string, string>([
        ["appointmentscheduled", "Agendado"],
        ["qualifiedtobuy", "Qualificado"],
        ["presentationscheduled", "Apresentação Agendada"],
        ["decisionmakerboughtin", "Tomador de Decisão Alinhado"],
        ["contractsent", "Contrato Enviado"],
        ["closedwon", "Fechado Ganho (Won)"],
        ["closedlost", "Fechado Perdido (Lost)"],
        
        // EP / B2B - EP - Iniciativas custom stage mappings
        ["appointmentscheduled_ep", "Início da Prospecção"],
        ["presentationscheduled_ep", "Reunião de Alinhamento"],
        ["proposal_sent", "Proposta Enviada"],
        ["under_review", "Em Análise"],
        ["approved", "Aprovado"],
        ["contracting", "Em Contratação"],
        ["active", "Ativo / Em Andamento"],
        ["completed", "Concluído"],
        ["cancelled", "Cancelado"]
      ]);

      try {
        const pipelinesRes = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (pipelinesRes.ok) {
          const pipelinesData = await pipelinesRes.json();
          const pipelines = pipelinesData.results || [];

          // Populate stagesMap dynamically from all pipeline stages
          pipelines.forEach((p: any) => {
            if (p.stages && Array.isArray(p.stages)) {
              p.stages.forEach((s: any) => {
                if (s.id && s.label) {
                  stagesMap.set(String(s.id), String(s.label));
                }
              });
            }
          });

          const foundPipeline = pipelines.find((p: any) => {
            const id = String(p.id || "").trim();
            const label = String(p.label || "").toLowerCase().trim();
            return id === "790660018" || 
                   label === "b2b - ep - iniciativas" || 
                   label.includes("b2b - ep") || 
                   label.includes("iniciativas");
          });
          if (foundPipeline) {
            targetPipelineId = foundPipeline.id;
            console.log(`Resolved target pipeline to ID: "${targetPipelineId}" (Label: "${foundPipeline.label}")`);
          } else {
            console.warn(`Pipeline '790660018' or 'B2B - EP - Iniciativas' not explicitly matched in pipelines list. Defaulting strictly to ID: "790660018". Available:`, pipelines.map((p: any) => `${p.label} (${p.id})`));
          }
        }
      } catch (pipelineErr: any) {
        console.error("Non-blocking error fetching pipelines list:", pipelineErr.message);
      }

      // Fetch deals using the robust CRM Search API first (targeted specifically to our pipeline) with fallback to paginated GET
      let filteredDeals: any[] = [];
      let rawDeals: any[] = [];
      let usedSearchApi = false;

      try {
        console.log(`Searching HubSpot deals directly for pipeline "${targetPipelineId}" using CRM Search API...`);
        let hasMore = true;
        let afterCursor = "";
        let pageCount = 0;
        const maxPages = 100; // Allows up to 10,000 deals in this single pipeline
        
        while (hasMore && pageCount < maxPages) {
          const searchBody: any = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "pipeline",
                    operator: "EQ",
                    value: targetPipelineId
                  }
                ]
              }
            ],
            properties: dealPropertiesToRequest,
            limit: 100
          };
          
          if (afterCursor) {
            searchBody.after = afterCursor;
          }
          
          const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(searchBody)
          });
          
          if (searchRes.ok) {
            const data = await searchRes.json();
            if (data.results && Array.isArray(data.results)) {
              rawDeals = rawDeals.concat(data.results);
            }
            if (data.paging?.next?.after) {
              afterCursor = data.paging.next.after;
              hasMore = true;
              pageCount++;
            } else {
              hasMore = false;
            }
            usedSearchApi = true;
          } else {
            const errText = await searchRes.text();
            console.error(`HubSpot CRM Search API error (status ${searchRes.status}):`, errText);
            hasMore = false; // Break loop to trigger paginated fallback
          }
        }
        
        if (usedSearchApi && rawDeals.length > 0) {
          filteredDeals = rawDeals;
          console.log(`CRM Search API completed successfully. Found ${filteredDeals.length} deals in pipeline "${targetPipelineId}".`);
        }
      } catch (searchErr: any) {
        console.error("Non-blocking error during HubSpot CRM Search API call:", searchErr.message);
      }

      // Fallback: Fetch deals using the robust pagination flow if Search API was unsuccessful or returned nothing
      if (filteredDeals.length === 0) {
        try {
          console.log("Fallback: Fetching all deals from HubSpot using paginated GET flow (with associations)...");
          rawDeals = await fetchHubSpotObjects("deals", dealPropertiesToRequest);
          console.log(`Successfully fetched ${rawDeals.length} raw Deals from HubSpot.`);
          
          filteredDeals = rawDeals.filter(d => String(d.properties?.pipeline) === targetPipelineId);
          console.log(`Filtered strictly by Pipeline ID "${targetPipelineId}". Matching deals: ${filteredDeals.length}`);

          if (filteredDeals.length === 0 && rawDeals.length > 0) {
            console.log("Strict pipeline filter returned 0 deals. Scanning pipelines to find any EP or Iniciativas related pipelines...");
            try {
              const pipelinesRes = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              });
              if (pipelinesRes.ok) {
                const pipelinesData = await pipelinesRes.json();
                const pipelines = pipelinesData.results || [];

                // Populate stagesMap dynamically from all pipeline stages
                pipelines.forEach((p: any) => {
                  if (p.stages && Array.isArray(p.stages)) {
                    p.stages.forEach((s: any) => {
                      if (s.id && s.label) {
                        stagesMap.set(String(s.id), String(s.label));
                      }
                    });
                  }
                });

                const epPipelineIds = pipelines
                  .filter((p: any) => {
                    const label = String(p.label || "").toLowerCase();
                    const id = String(p.id || "");
                    return id === "790660018" || 
                           label.includes("b2b") || 
                           label.includes("ep") || 
                           label.includes("iniciativas");
                  })
                  .map((p: any) => String(p.id));

                console.log("EP-related Pipeline IDs found in HubSpot:", epPipelineIds);

                if (epPipelineIds.length > 0) {
                  filteredDeals = rawDeals.filter(d => d.properties?.pipeline && epPipelineIds.includes(String(d.properties.pipeline)));
                  console.log(`Smart fallback: Filtered deals to EP/Iniciativas/B2B pipelines. Matching deals: ${filteredDeals.length}`);
                }
              }
            } catch (err: any) {
              console.error("Error in smart pipeline fallback:", err.message);
            }
          }

          if (filteredDeals.length === 0 && rawDeals.length > 0) {
            console.warn("Smart fallback also returned 0 deals. Falling back to all raw deals to ensure data visibility.");
            filteredDeals = rawDeals;
          }
        } catch (err: any) {
          console.error("Error in paginated deals fetching flow:", err.message);
          throw err;
        }
      }

      try {
        // Deduplicate filteredDeals by deal ID to prevent duplicate keys in UI and duplicate batch requests
        const uniqueDealsMap = new Map<string, any>();
        filteredDeals.forEach(deal => {
          if (deal && deal.id) {
            uniqueDealsMap.set(String(deal.id), deal);
          }
        });
        filteredDeals = Array.from(uniqueDealsMap.values());

        // Perform high-precision batch read on the final filtered deals and merge direct associations
        if (filteredDeals.length > 0) {
          const dealIds = filteredDeals.map(d => String(d.id));
          
          console.log(`Performing high-precision batch read with properties for ${dealIds.length} deals...`);
          const detailedDeals = await batchReadDealsWithAssociations(dealIds, dealPropertiesToRequest);
          
          console.log(`Performing high-precision batch associations read for ${dealIds.length} deals...`);
          const dealAssocMap = await batchGetAssociationsForDeals(dealIds);
          
          filteredDeals = detailedDeals.map((deal: any) => {
            const dealId = String(deal.id);
            
            // Get associations from direct batch associations read
            const apiCompanyIds = dealAssocMap.get(dealId) || [];
            
            // Get associations returned from batch properties read
            const directCompanyResults = deal.associations?.companies?.results || deal.associations?.company?.results || [];
            const directCompanyIds = directCompanyResults.map((r: any) => String(r.id)).filter(Boolean);
            
            // Merge associations from both sources to guarantee none are missed
            const mergedCompanyIds = Array.from(new Set([...apiCompanyIds, ...directCompanyIds]));
            const companyResults = mergedCompanyIds.map(id => ({ id, type: "deal_to_company" }));
            
            return {
              ...deal,
              associations: {
                ...deal.associations,
                companies: {
                  results: companyResults
                }
              }
            };
          });
          
          console.log(`Successfully batch-read ${filteredDeals.length} deals and mapped their high-precision company associations.`);
        }
      } catch (err: any) {
        console.error("Error in matching company associations to detailed deals:", err.message);
        throw err;
      }

      // Helper function to extract Partner name from Deal title
      const extractPartnerName = (dealName: string): string => {
        if (!dealName) return "Parceiro HubSpot";
        let name = dealName;

        // Strip out brackets and anything inside them first (e.g. [EP], [B2B]) to avoid splitting empty strings at the start
        name = name.replace(/\[[^\]]*\]/g, "");

        if (name.includes(" - ")) {
          name = name.split(" - ")[0];
        } else if (name.includes(" – ")) {
          name = name.split(" – ")[0];
        } else if (name.includes(" — ")) {
          name = name.split(" — ")[0];
        } else if (name.includes("(")) {
          name = name.split("(")[0];
        } else if (name.includes(":")) {
          name = name.split(":")[0];
        }

        // Clean common prefixes (case-insensitive)
        name = name.trim();
        
        // Remove "Parceiro Projeto" / "Parceiro - Projeto" etc.
        name = name.replace(/^(parceiro\s*[-–—:]*\s*projeto\s*[-–—:]*\s*)/i, "");
        
        // Remove "Parceiro" / "Parceiro -" etc.
        name = name.replace(/^(parceiro\s*[-–—:]*\s*)/i, "");
        
        // Remove "Projeto" / "Projeto-" / "Projeto - " etc.
        name = name.replace(/^(projeto\s*[-–—:]*\s*)/i, "");

        // Trim any leftover dashes, colons, spaces
        name = name.replace(/^[-–—:\s]+|[-–—:\s]+$/g, "");

        return name.trim() || "Parceiro HubSpot";
      };

      // Collect associated company IDs from the deals
      const associatedCompanyIds = new Set<string>();
      filteredDeals.forEach((deal: any) => {
        const associatedCompanies = deal.associations?.companies?.results || deal.associations?.company?.results || [];
        associatedCompanies.forEach((assoc: any) => {
          if (assoc.id) {
            associatedCompanyIds.add(String(assoc.id));
          }
        });
      });

      console.log(`Deals have ${associatedCompanyIds.size} unique associated companies. Fetching real company details...`);

      const hubspotCompaniesMap = new Map<string, { name: string; domain: string }>();

      // Populate companies map using ultra-precise batch read
      if (associatedCompanyIds.size > 0) {
        try {
          const detailedCompanies = await batchReadCompanies(Array.from(associatedCompanyIds));
          detailedCompanies.forEach((company: any) => {
            if (company.id && company.properties) {
              hubspotCompaniesMap.set(String(company.id), {
                name: company.properties.name || "",
                domain: company.properties.domain || ""
              });
            }
          });
          console.log(`Successfully batch-read ${hubspotCompaniesMap.size} associated companies from HubSpot.`);
        } catch (err: any) {
          console.error("Error batch-reading associated companies:", err.message);
        }
      }

      // Fallback: paginated companies list
      if (hubspotCompaniesMap.size === 0) {
        let rawCompanies: any[] = [];
        try {
          rawCompanies = await fetchHubSpotObjects("companies", ["name", "domain"]);
          console.log(`Successfully fetched ${rawCompanies.length} raw Companies via pagination fallback.`);
          rawCompanies.forEach((company: any) => {
            if (company.id && company.properties && !hubspotCompaniesMap.has(String(company.id))) {
              hubspotCompaniesMap.set(String(company.id), {
                name: company.properties.name || "",
                domain: company.properties.domain || ""
              });
            }
          });
        } catch (err: any) {
          console.error("Non-blocking error fetching companies via pagination fallback:", err.message);
        }
      }

      // 3. Extract Partners (Parceiros) from filtered Deals (Either associated Companies or extracted from Deal Name)
      // We key by partnerId to guarantee strict unique keys across all returned objects
      const partnersMap = new Map<string, any>();
      filteredDeals.forEach((deal: any) => {
        if (!deal.properties) return;

        // Try to get associated companies
        const associatedCompanies = deal.associations?.companies?.results || deal.associations?.company?.results || [];
        let companyFound = false;

        associatedCompanies.forEach((assoc: any) => {
          const companyId = String(assoc.id);
          const hsCompany = hubspotCompaniesMap.get(companyId);
          if (hsCompany && hsCompany.name) {
            companyFound = true;
            const partnerName = hsCompany.name.trim();
            const domain = hsCompany.domain ? hsCompany.domain.trim().toLowerCase() : "";

            const partnerId = `partner-${partnerName.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")}`;

            // Try to fetch clearbit logo if a domain is present, fallback to DiceBear
            const logoUrl = domain 
              ? `https://logo.clearbit.com/${domain}`
              : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}&backgroundColor=0f172a,1e293b,334155,475569,64748b`;

            if (partnerId && !partnersMap.has(partnerId)) {
              partnersMap.set(partnerId, {
                id: partnerId,
                name: partnerName,
                description: `Empresa associada ao Deal no HubSpot`,
                logoUrl,
                domain: domain || undefined
              });
            }
          }
        });

        // Fallback: If no associated company was mapped, extract partner name from Deal title
        if (!companyFound) {
          const dealName = deal.properties.dealname || deal.properties.name || "";
          if (dealName) {
            const partnerName = extractPartnerName(dealName);
            if (partnerName && partnerName.toLowerCase() !== "parceiro hubspot") {
              const partnerId = `partner-${partnerName.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")}`;

              if (partnerId && !partnersMap.has(partnerId)) {
                const logoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}&backgroundColor=0f172a,1e293b,334155,475569,64748b`;

                partnersMap.set(partnerId, {
                  id: partnerId,
                  name: partnerName,
                  description: `Parceiro importado via Deal do Pipeline B2B - EP - Iniciativas`,
                  logoUrl
                });
              }
            }
          }
        }
      });
      results.partners = Array.from(partnersMap.values());

      // 4. Extract Turmas (Classes/Negócios) from filtered Deals as 1-to-1 Negócios
      results.turmas = filteredDeals.map((deal: any) => {
        const props = deal.properties || {};
        const dealId = String(deal.id);
        const dealName = props.dealname || "Negócio sem Nome";

        // 1 - Etapa de Negócios (dealstage)
        const dealstageId = props.dealstage || "";
        const dealstage = stagesMap.get(String(dealstageId)) || dealstageId;

        // 2 - Titulo do Projeto (titulo_projeto_c)
        const projectTitle = props[resolvedKeys.titulo_projeto_c] || "";

        // 3 - Descrição do Negocio (description)
        const description = props.description || "";
        const epDescricaoCurta = props[resolvedKeys.ep_descricao_curta_do_projeto] || "";
        const epNps = props[resolvedKeys.ep_nps] || "";

        // 4 - Empresa (Fazer o link com a empresa cadastrada dentro da nossa aplicação)
        let linkedPartnerId = "";
        const associatedCompanies = deal.associations?.companies?.results || deal.associations?.company?.results || [];
        associatedCompanies.forEach((assoc: any) => {
          const companyId = String(assoc.id);
          const hsCompany = hubspotCompaniesMap.get(companyId);
          if (hsCompany && hsCompany.name) {
            const partnerName = hsCompany.name.trim();
            const partnerId = `partner-${partnerName.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")}`;
            linkedPartnerId = partnerId;
          }
        });

        if (!linkedPartnerId) {
          // Fallback matching using extracted name
          const partnerName = extractPartnerName(dealName);
          if (partnerName && partnerName.toLowerCase() !== "parceiro hubspot") {
            linkedPartnerId = `partner-${partnerName.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")}`;
          }
        }

        // 5 - Ano de Aplicação do Módulo (ep_ano_de_aplicacao)
        const applicationYear = props[resolvedKeys.ep_ano_de_aplicacao] || "";

        // 6 - Trimestre de Aplicação (ep_tri_de_aplicacao)
        const rawQuarter = props[resolvedKeys.ep_tri_de_aplicacao] || "";
        const normalizeQuarter = (val: any): string => {
          if (!val) return "Q1";
          const str = String(val).trim().toUpperCase();
          if (str === "Q1" || str === "Q2" || str === "Q3" || str === "Q4") {
            return str;
          }
          if (/\b1\b|1º|1O|PRIMEIRO|FIRST|T1|Q1|TRIMESTRE\s*1/i.test(str)) return "Q1";
          if (/\b2\b|2º|2O|SEGUNDO|SECOND|T2|Q2|TRIMESTRE\s*2/i.test(str)) return "Q2";
          if (/\b3\b|3º|3O|TERCEIRO|THIRD|T3|Q3|TRIMESTRE\s*3/i.test(str)) return "Q3";
          if (/\b4\b|4º|4O|QUARTO|FOURTH|T4|Q4|TRIMESTRE\s*4/i.test(str)) return "Q4";
          
          if (str.includes("PRIMEIRO") || str.includes("FIRST") || str.includes("T1") || str.includes("1")) return "Q1";
          if (str.includes("SEGUNDO") || str.includes("SECOND") || str.includes("T2") || str.includes("2")) return "Q2";
          if (str.includes("TERCEIRO") || str.includes("THIRD") || str.includes("T3") || str.includes("3")) return "Q3";
          if (str.includes("QUARTO") || str.includes("FOURTH") || str.includes("T4") || str.includes("4")) return "Q4";
          return "Q1";
        };
        const applicationQuarter = normalizeQuarter(rawQuarter);

        // 7 - Módulo do Curso (modulo_curso)
        const courseModule = props[resolvedKeys.modulo_curso] || "";

        // 8 - Código da turma (codigo_turma_c)
        const classCode = props[resolvedKeys.codigo_turma_c] || "";

        // 9 - ID Único da Turma (ep_id_unico_da_turma)
        const uniqueClassId = props[resolvedKeys.ep_id_unico_da_turma] || "";

        // UI standard fallbacks
        let course = courseModule || "Ciência da Computação";
        if (!courseModule && classCode) {
          const normalizedCode = classCode.toUpperCase();
          if (normalizedCode.includes("INCC") || normalizedCode.includes("CC")) {
            course = "Ciência da Computação";
          } else if (normalizedCode.includes("INSI") || normalizedCode.includes("SI") || normalizedCode.includes("INSF") || normalizedCode.includes("ES")) {
            course = "Engenharia de Software";
          } else if (normalizedCode.includes("INEC") || normalizedCode.includes("EC")) {
            course = "Engenharia de Computação";
          } else if (normalizedCode.includes("INDC") || normalizedCode.includes("DS")) {
            course = "Design de Computação";
          }
        }

        let rawAtelieVal = "";
        const keysToCheck = [
          ...discoveredAtelieKeys,
          "[EP] Ateliê",
          "[ep] atelie",
          "EP_atelie",
          "ep_atelie",
          "ep_ateliê",
          "_ep__ateli_",
          "ep__atelie",
          "atelie",
          "ateliê"
        ];
        
        for (const key of keysToCheck) {
          const matchedKey = Object.keys(props).find(k => k.toLowerCase() === key.toLowerCase());
          if (matchedKey) {
            const val = props[matchedKey];
            if (val && typeof val === "string" && val.trim().length > 0) {
              rawAtelieVal = val.trim();
              break;
            }
          }
        }

        // Wildcard fallback search for any key containing 'atelie' or 'ateli'
        if (!rawAtelieVal) {
          const matchedKey = Object.keys(props).find(k => k.toLowerCase().includes("atelie") || k.toLowerCase().includes("ateli"));
          if (matchedKey) {
            const val = props[matchedKey];
            if (val && typeof val === "string" && val.trim().length > 0) {
              rawAtelieVal = val.trim();
            }
          }
        }
        
        let epAtelie: string[] = [];
        if (rawAtelieVal) {
          const splitNames = rawAtelieVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          epAtelie = splitNames.map(name => {
            return `atelie-${name.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")}`;
          });
        }

        const extractModuleNumber = (text: string): number | null => {
          if (!text) return null;
          const upper = text.toUpperCase().trim();
          const keyMatch = upper.match(/(?:ECMD|ESMD|SIMD|CCMD|AMD)\s*(\d+)/);
          if (keyMatch) return parseInt(keyMatch[1], 10);
          const genericMatch = upper.match(/[A-Z]+(\d+)/);
          if (genericMatch) return parseInt(genericMatch[1], 10);
          const modMatch = upper.match(/(?:MODULO|MÓDULO|MOD)\s*(\d+)/);
          if (modMatch) return parseInt(modMatch[1], 10);
          const numbers = upper.match(/\b\d+\b/g);
          if (numbers) {
            for (const numStr of numbers) {
              const num = parseInt(numStr, 10);
              if (num >= 1 && num <= 16) return num;
            }
          }
          return null;
        };

        const getCourseYearFromModule = (moduleNum: number | null): string => {
          if (moduleNum === null || isNaN(moduleNum)) return 'Não Identificado';
          if (moduleNum >= 1 && moduleNum <= 4) return '1º Ano';
          if (moduleNum >= 5 && moduleNum <= 8) return '2º Ano';
          if (moduleNum >= 9 && moduleNum <= 12) return '3º Ano';
          if (moduleNum >= 13 && moduleNum <= 16) return '4º Ano';
          return 'Não Identificado';
        };

        const extractedModule = extractModuleNumber(courseModule);
        const courseYear = getCourseYearFromModule(extractedModule);

        // 10 - Turno/Período
        const rawPeriod = props[resolvedKeys.period] || "";
        let period = "";
        const periodStr = String(rawPeriod).trim().toLowerCase();
        if (periodStr.includes("manhã") || periodStr.includes("manha")) {
          period = "Manhã";
        } else if (periodStr.includes("tarde")) {
          period = "Tarde";
        } else if (periodStr.includes("noite") || periodStr.includes("vespertino")) {
          period = "Noite";
        }

        // Auto fill period/turno based on detected course year if not explicitly set in HubSpot
        if (!period) {
          if (courseYear === '1º Ano') {
            period = 'Manhã';
          } else if (courseYear === '2º Ano') {
            period = 'Tarde';
          } else if (courseYear === '3º Ano') {
            period = 'Manhã';
          }
        }

        return {
          id: dealId,
          name: dealName,
          course,
          period,
          projectDescription: epDescricaoCurta || description,
          dealstage,
          projectTitle,
          description,
          epDescricaoCurta,
          partnerId: linkedPartnerId,
          applicationYear,
          applicationQuarter,
          courseModule,
          classCode,
          uniqueClassId,
          epAtelie,
          epNps: epNps ? String(epNps).trim() : "",
          epOrientador: props[resolvedKeys.ep_orientador] || "",
          orientador: props[resolvedKeys.ep_orientador] || "",
          courseYear: courseYear !== 'Não Identificado' ? courseYear : undefined
        };
      });

      // 5. Extract unique Ateliês from [EP] Ateliê field in filtered Deals
      const uniqueAtelieNames = new Set<string>();
      filteredDeals.forEach((deal: any) => {
        if (!deal.properties) return;

        let rawAtelieVal = "";
        const keysToCheck = [
          ...discoveredAtelieKeys,
          "[EP] Ateliê",
          "[ep] atelie",
          "EP_atelie",
          "ep_atelie",
          "ep_ateliê",
          "_ep__ateli_",
          "ep__atelie",
          "atelie",
          "ateliê"
        ];

        for (const key of keysToCheck) {
          const matchedKey = Object.keys(deal.properties).find(k => k.toLowerCase() === key.toLowerCase());
          if (matchedKey) {
            const val = deal.properties[matchedKey];
            if (val && typeof val === "string" && val.trim().length > 0) {
              rawAtelieVal = val.trim();
              break;
            }
          }
        }

        // Wildcard fallback search for any key containing 'atelie' or 'ateli'
        if (!rawAtelieVal) {
          const matchedKey = Object.keys(deal.properties).find(k => k.toLowerCase().includes("atelie") || k.toLowerCase().includes("ateli"));
          if (matchedKey) {
            const val = deal.properties[matchedKey];
            if (val && typeof val === "string" && val.trim().length > 0) {
              rawAtelieVal = val.trim();
            }
          }
        }

        if (rawAtelieVal) {
          // Split by commas or semicolons in case multiple Ateliês are comma-separated or semicolon-separated in the deal field
          const splitNames = rawAtelieVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          splitNames.forEach(name => {
            uniqueAtelieNames.add(name);
          });
        }
      });

      const ateliesMap = new Map<string, any>();
      let atelieIndex = 0;
      const colorPresets = ["emerald", "indigo", "rose", "amber", "violet", "cyan", "orange", "teal"];
      
      Array.from(uniqueAtelieNames).forEach((name) => {
        let block = "Bloco A";
        const match = name.match(/bloco\s*([a-z0-9]+)/i);
        if (match) {
          block = `Bloco ${match[1].toUpperCase()}`;
        }

        const capacity = 36;
        const color = colorPresets[atelieIndex % colorPresets.length];
        atelieIndex++;

        const cleanId = `atelie-${name.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}`;

        if (!ateliesMap.has(cleanId)) {
          ateliesMap.set(cleanId, {
            id: cleanId,
            name,
            block,
            capacity,
            color
          });
        }
      });
      results.atelies = Array.from(ateliesMap.values());

      console.log(`Pipeline Sync Complete: Extracted ${results.partners.length} Partners, ${results.turmas.length} Turmas, ${results.atelies.length} Ateliês from pipeline.`);

      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Erro desconhecido ao sincronizar com HubSpot."
      });
    }
  });

  // Chatbot endpoint
  app.post("/api/chat", async (req, res) => {
    res.setHeader("Connection", "close");
    const { message, contextData } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }
    // Local smart heuristic responder in case Gemini is offline/keyless or fails
    const getLocalChatbotResponse = (msg: string, ctx: any) => {
      const msgLower = msg.toLowerCase();
      const turmas = ctx?.turmas || [];
      const atelies = ctx?.atelies || [];
      const partners = ctx?.partners || [];
      const schedules = ctx?.schedules || {};

      const atelieMap = new Map<string, any>(atelies.map((a: any) => [a.id, a]));
      const partnerMap = new Map<string, any>(partners.map((p: any) => [p.id, p]));
      const turmaMap = new Map<string, any>(turmas.map((t: any) => [t.id, t]));

      // 1. "Em qual Ateliê está o Metro SP" / "Onde está o Metro SP" / "Metro SP"
      if (msgLower.includes("metro")) {
        const metroPartner = partners.find((p: any) => p.name.toLowerCase().includes("metro"));
        const metroTurma = turmas.find((t: any) => t.name.toLowerCase().includes("metro") || (t.projectTitle && t.projectTitle.toLowerCase().includes("metro")));

        let responseStr = "";
        if (metroPartner) {
          responseStr += `A empresa parceira **${metroPartner.name}** está cadastrada no sistema.\n\n`;
        }

        const allocationsFound: string[] = [];
        Object.keys(schedules).forEach((scheduleKey) => {
          const rows = schedules[scheduleKey];
          if (rows && Array.isArray(rows)) {
            rows.forEach((row: any) => {
              const isMatchPartner = metroPartner && String(row.partnerId) === String(metroPartner.id);
              const isMatchTurma = metroTurma && String(row.turmaId) === String(metroTurma.id);
              if (isMatchPartner || isMatchTurma) {
                const tObj = turmaMap.get(row.turmaId);
                const pObj = partnerMap.get(row.partnerId);
                const label = `${tObj ? tObj.name : 'Turma'} (Parceiro: ${pObj ? pObj.name : 'Nenhum'}) no cronograma **${scheduleKey.replace(/_/g, ' ')}**`;
                
                if (row.allocations) {
                  const phaseDetails: string[] = [];
                  Object.keys(row.allocations).forEach((phaseKey) => {
                    const val = row.allocations[phaseKey];
                    if (val) {
                      const resolved = val.split(',').map((id: string) => {
                        const matched = atelieMap.get(id.trim());
                        return matched ? matched.name : id.trim();
                      }).join(' & ');
                      phaseDetails.push(`- **${phaseKey}**: Ateliê **${resolved}**`);
                    }
                  });
                  if (phaseDetails.length > 0) {
                    allocationsFound.push(`Para **${label}**:\n${phaseDetails.join('\n')}`);
                  }
                }
              }
            });
          }
        });

        if (allocationsFound.length > 0) {
          return `O parceiro **Metro SP** está alocado nos seguintes ateliês pelas fases do cronograma:\n\n` + allocationsFound.join('\n\n');
        } else {
          if (metroTurma && metroTurma.epAtelie) {
            return `De acordo com as informações importadas do HubSpot, o projeto **Metro SP** está associado ao ateliê: **${metroTurma.epAtelie}**.`;
          }
          return `Não encontrei alocações de ateliês no cronograma de sprints para o **Metro SP**. Certifique-se de que a empresa está vinculada a uma turma e alocada na aba "Cronograma de Sprints"!`;
        }
      }

      // 2. "Quantos Parceiros temos na Sprint do terceiro Semestre" / "terceiro" / "3º"
      if (msgLower.includes("parceir") && (msgLower.includes("terceir") || msgLower.includes("3") || msgLower.includes("3º"))) {
        const thirdYearKeys = Object.keys(schedules).filter(k => k.toLowerCase().includes("3_ano") || k.includes("3º") || k.includes("3"));
        const thirdYearTurmas = turmas.filter((t: any) => t.courseYear && (t.courseYear.includes("3") || t.courseYear.toLowerCase().includes("terceir")));
        const thirdYearTurmaIds = new Set(thirdYearTurmas.map((t: any) => String(t.id)));

        const allocatedPartners = new Set<string>();
        
        Object.keys(schedules).forEach((scheduleKey) => {
          const is3rdYearSchedule = scheduleKey.includes("3") || scheduleKey.toLowerCase().includes("terceir");
          const rows = schedules[scheduleKey];
          if (rows && Array.isArray(rows)) {
            rows.forEach((row: any) => {
              const is3rdYearTurma = thirdYearTurmaIds.has(String(row.turmaId));
              if ((is3rdYearSchedule || is3rdYearTurma) && row.partnerId) {
                const p = partnerMap.get(row.partnerId);
                if (p) {
                  allocatedPartners.add(p.name);
                }
              }
            });
          }
        });

        if (allocatedPartners.size > 0) {
          return `Temos **${allocatedPartners.size} parceiros** alocados nas Sprints do 3º Semestre/Ano/Módulo:\n\n` + 
                 Array.from(allocatedPartners).map(name => `- ${name}`).join('\n');
        } else if (thirdYearTurmas.length > 0) {
          const distinctPartners = new Set(thirdYearTurmas.map((t: any) => partnerMap.get(t.partnerId)?.name).filter(Boolean));
          return `Temos **${distinctPartners.size} parceiros** cadastrados nas turmas do 3º Semestre/Ano/Módulo:\n\n` +
                 Array.from(distinctPartners).map(name => `- ${name}`).join('\n');
        } else {
          return `Não encontrei parceiros alocados especificamente para o 3º semestre/ano nos cronogramas atuais. Cadastre as turmas e faça as alocações na aba "Cronograma de Sprints"!`;
        }
      }

      // 3. "Quantos Ateliês Temos" / "Quantos Ateliês" / "Cadastro de Atelies"
      if (msgLower.includes("quant") && (msgLower.includes("atelie") || msgLower.includes("ateliê"))) {
        if (atelies.length > 0) {
          const list = atelies.map((a: any) => `- **${a.name}** (Bloco ${a.block || 'A'}, Capacidade: ${a.capacity || 'N/A'} alunos)`).join('\n');
          return `Temos **${atelies.length} Ateliês** cadastrados no cadastro de ateliês do sistema:\n\n${list}`;
        } else {
          return `Atualmente não há ateliês cadastrados no sistema. Você pode cadastrá-los na aba "Cadastro de Ateliês".`;
        }
      }

      // 4. "Quantos parceiros temos" (general partners count)
      if (msgLower.includes("quant") && (msgLower.includes("parceir") || msgLower.includes("empres"))) {
        if (partners.length > 0) {
          const list = partners.map((p: any) => `- ${p.name}`).join('\n');
          return `Temos **${partners.length} Empresas Parceiras** cadastradas no sistema:\n\n${list}`;
        } else {
          return `Atualmente não há empresas parceiras cadastradas.`;
        }
      }

      // 5. General "sprint" or "cronograma" info
      if (msgLower.includes("sprint") || msgLower.includes("cronograma")) {
        let totalAll = 0;
        Object.keys(schedules).forEach(k => {
          totalAll += (schedules[k]?.length || 0);
        });
        return `Atualmente temos cronogramas configurados para as seguintes turmas/períodos:\n` +
               Object.keys(schedules).map(k => `- **${k.replace(/_/g, ' ')}** (${schedules[k]?.length || 0} turmas alocadas)`).join('\n') +
               `\n\nTotal de alocações registradas: ${totalAll}.`;
      }

      return `Olá! Sou o Assistente Virtual do Sistema Ateliês do Inteli. Consigo responder dúvidas específicas em tempo real sobre os ateliês cadastrados, parceiros e o cronograma de sprints! 
  
Experimente me perguntar:
- *Onde está o Metro SP no cronograma?*
- *Quantos parceiros temos no 3º ano/semestre?*
- *Quantos ateliês temos cadastrados?*`;
    };

    if (!aiClient) {
      const localResponse = getLocalChatbotResponse(message, contextData);
      return res.json({ success: true, text: localResponse });
    }

    try {
      let npsInfo = "Não há dados de turmas com NPS disponíveis no momento.";
      if (contextData && contextData.turmas && Array.isArray(contextData.turmas)) {
        const parsedTurmas = contextData.turmas.map((t: any) => {
          let npsNum: number | null = null;
          if (t.epNps) {
            const clean = String(t.epNps).replace('%', '').trim();
            const parsed = parseFloat(clean);
            if (!isNaN(parsed)) {
              npsNum = parsed;
            }
          }
          return { ...t, npsNumeric: npsNum };
        });

        const activeNpsTurmas = parsedTurmas.filter((t: any) => t.npsNumeric !== null);
        const totalWithNps = activeNpsTurmas.length;

        if (totalWithNps > 0) {
          let promotersCount = 0;
          let passivesCount = 0;
          let detractorsCount = 0;
          let sumNps = 0;

          activeNpsTurmas.forEach((t: any) => {
            const score = t.npsNumeric!;
            sumNps += score;
            const normalizedScore = score <= 10 ? score * 10 : score;
            if (normalizedScore >= 90) {
              promotersCount++;
            } else if (normalizedScore >= 70) {
              passivesCount++;
            } else {
              detractorsCount++;
            }
          });

          const promoterPct = Math.round((promotersCount / totalWithNps) * 100);
          const passivePct = Math.round((passivesCount / totalWithNps) * 100);
          const detractorPct = Math.round((detractorsCount / totalWithNps) * 100);
          const overallNps = promoterPct - detractorPct;
          const avgNps = sumNps / totalWithNps;

          npsInfo = `RESULTADOS OFICIAIS DO RELATÓRIO DE NPS:
- Índice Oficial NPS Geral: ${overallNps} (calculado como % Promotores [${promoterPct}%] - % Detratores [${detractorPct}%])
- Nota Média Geral das avaliações: ${avgNps.toFixed(1)}
- Quantidade de turmas avaliadas: ${totalWithNps} (de ${contextData.turmas.length} turmas no total)
- Distribuição: Promotores: ${promotersCount} (${promoterPct}%), Passivos: ${passivesCount} (${passivePct}%), Detratores: ${detractorsCount} (${detractorPct}%)`;
        }
      }

      let customLiveContext = "";
      if (contextData) {
        const turmas = contextData.turmas || [];
        const atelies = contextData.atelies || [];
        const partners = contextData.partners || [];
        const schedules = contextData.schedules || {};

        const atelieMap = new Map<string, any>(atelies.map((a: any) => [a.id, a]));
        const partnerMap = new Map<string, any>(partners.map((p: any) => [p.id, p]));
        const turmaMap = new Map<string, any>(turmas.map((t: any) => [t.id, t]));

        // 1. Ateliês list
        let ateliesSummary = `ATELIÊS CADASTRADOS (${atelies.length} no total):\n`;
        if (atelies.length > 0) {
          atelies.forEach((a: any) => {
            ateliesSummary += `- **${a.name}**: Bloco ${a.block || 'N/A'}, Capacidade: ${a.capacity || 'N/A'}\n`;
          });
        } else {
          ateliesSummary += "- Nenhum ateliê cadastrado.\n";
        }

        // 2. Parceiros/Empresas list
        let partnersSummary = `EMPRESAS PARCEIRAS CADASTRADAS (${partners.length} no total):\n`;
        if (partners.length > 0) {
          partners.forEach((p: any) => {
            partnersSummary += `- **${p.name}** | ID: ${p.id} | Site/Domínio: ${p.domain || 'N/A'}\n`;
          });
        } else {
          partnersSummary += "- Nenhuma empresa parceira cadastrada.\n";
        }

        // 3. Turmas (Sprints/Negócios) list
        let turmasSummary = `TURMAS (PROJETOS/NEGÓCIOS) CADASTRADAS (${turmas.length} no total):\n`;
        if (turmas.length > 0) {
          turmas.forEach((t: any) => {
            const partnerName = partnerMap.get(t.partnerId)?.name || 'Nenhum';
            let allocatedAtelies = 'Nenhum';
            if (t.epAtelie) {
              const atelieList = Array.isArray(t.epAtelie) ? t.epAtelie : [t.epAtelie];
              const resolvedNames = atelieList.map((idOrName: string) => {
                const matched = atelieMap.get(idOrName);
                if (matched) return matched.name;
                const foundByName = atelies.find((a: any) => a.name.toLowerCase() === idOrName.toLowerCase() || a.id.toLowerCase() === idOrName.toLowerCase());
                return foundByName ? foundByName.name : idOrName;
              });
              allocatedAtelies = resolvedNames.join(', ');
            }

            turmasSummary += `- **${t.name}** (Cód: ${t.classCode || 'N/A'}) | Projeto: "${t.projectTitle || 'Sem título'}"\n`;
            turmasSummary += `  - Curso: ${t.course || 'N/A'} | Período: ${t.period || 'N/A'} | Ano/Módulo: ${t.courseYear || 'N/A'} (Módulo ${t.courseModule || 'N/A'})\n`;
            turmasSummary += `  - Descrição do Projeto: ${t.epDescricaoCurta || t.projectDescription || 'Sem descrição'}\n`;
            turmasSummary += `  - Empresa Parceira: ${partnerName}\n`;
            turmasSummary += `  - Ateliê do HubSpot: ${allocatedAtelies}\n`;
            turmasSummary += `  - NPS: ${t.epNps || 'Sem nota'}\n`;
          });
        } else {
          turmasSummary += "- Nenhuma turma cadastrada.\n";
        }

        // 4. Cronograma de Alocações Sprints/Ateliês
        let allocationsSummary = `CRONOGRAMA DE ALOCAÇÕES ATUAIS (Por Semestre/Trimestre/Módulo):\n`;
        let totalAllocations = 0;
        
        Object.keys(schedules).forEach((key) => {
          const rows = schedules[key];
          if (rows && rows.length > 0) {
            allocationsSummary += `#### Cronograma para ${key.replace(/_/g, ' ')}:\n`;
            rows.forEach((row: any) => {
              const turmaObj = turmaMap.get(row.turmaId);
              const partnerObj = partnerMap.get(row.partnerId);
              if (!turmaObj && !partnerObj) return;
              
              totalAllocations++;
              const tName = turmaObj ? `${turmaObj.name} (Código: ${turmaObj.classCode || 'Sem Código'})` : 'Desconhecida';
              const pName = partnerObj ? partnerObj.name : 'Nenhum';
              
              allocationsSummary += `  - Turma: **${tName}** | Parceiro: **${pName}**\n`;
              if (row.allocations) {
                const phaseDetails: string[] = [];
                Object.keys(row.allocations).forEach((phaseKey) => {
                  const val = row.allocations[phaseKey];
                  if (val) {
                    const resolvedAtelies = val.split(',').map((id: string) => {
                      const matched = atelieMap.get(id.trim());
                      return matched ? matched.name : id.trim();
                    }).join(' & ');
                    phaseDetails.push(`${phaseKey}: **${resolvedAtelies}**`);
                  }
                });
                if (phaseDetails.length > 0) {
                  allocationsSummary += `    - Ateliê por Fase: ${phaseDetails.join(' | ')}\n`;
                }
              }
            });
          }
        });

        if (totalAllocations === 0) {
          allocationsSummary += "- Nenhuma alocação registrada no cronograma de Sprints.\n";
        }

        customLiveContext = `
=== DADOS DO SISTEMA EM TEMPO REAL ===
${ateliesSummary}
${partnersSummary}
${turmasSummary}
${allocationsSummary}
======================================
`;
      }

      const prompt = `Você é o Assistente Virtual inteligente do Sistema de Ateliês e Cronogramas de Sprints do Inteli.
Responda de maneira extremamente amigável, prestativa, clara e concisa em Português do Brasil.
Abaixo estão as informações contextuais consolidadas e em tempo real sobre ateliês, parceiros/empresas, turmas, projetos e as alocações em cada fase/sprint do cronograma.

${npsInfo}

${customLiveContext}

Instruções importantes:
- Responda diretamente e com muita clareza às dúvidas do usuário sobre onde as empresas parceiras (ex: "Metro SP") estão alocadas em cada fase/sprint do cronograma.
- Use as informações de "Ateliê por Fase" ou "Ateliê do HubSpot" correspondentes a cada turma para responder de forma precisa.
- Se o usuário perguntar "Quantos ateliês temos", responda baseado no total de ateliês cadastrados que está indicado acima.
- Se perguntar sobre "Quantos parceiros temos", use a contagem total de empresas parceiras acima.
- Mantenha a resposta concisa, legível e bem organizada com tópicos em Markdown quando necessário.

Mensagem do usuário: "${message}"`;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({ success: true, text: response.text });
    } catch (err: any) {
      console.error("[Chat API Error] Falling back to local heuristic response.", err);
      const localResponse = getLocalChatbotResponse(message, contextData);
      return res.json({ success: true, text: localResponse });
    }
  });

  // Google Drive File Scan Endpoint
  app.post("/api/drive/list", async (req, res) => {
    const { accessToken, searchQuery, folderId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: "Access token is required." });
    }

    try {
      // Build Google Drive files.list query
      let query = "trashed = false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }
      if (searchQuery) {
        const escaped = searchQuery.replace(/'/g, "\\'");
        query += ` and (name contains '${escaped}')`;
      } else {
        query += " and (name contains 'TAPI' or name contains 'Termo' or name contains 'Parceria' or name contains 'Contrato' or name contains 'Convenio' or name contains 'Abertura')";
      }

      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=50`;

      const response = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Drive List API Error]", response.status, errorText);
        return res.status(response.status).json({ success: false, error: `Erro no Google Drive: ${errorText}` });
      }

      const data = await response.json();
      return res.json({ success: true, files: data.files || [] });
    } catch (err: any) {
      console.error("[Drive List Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Erro desconhecido ao listar arquivos." });
    }
  });

  // Google Drive Document Analysis via Gemini Endpoint
  app.post("/api/drive/analyze-document", async (req, res) => {
    const { accessToken, fileId, mimeType, fileName } = req.body;

    if (!accessToken || !fileId || !mimeType) {
      return res.status(400).json({ success: false, error: "Access token, fileId, and mimeType are required." });
    }

    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini AI client not initialized on server. Configure GEMINI_API_KEY." });
    }

    try {
      let fileBuffer: Buffer;
      let actualMimeType = mimeType;
      const isGoogleDoc = mimeType === 'application/vnd.google-apps.document';
      const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (isGoogleDoc) {
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
        const response = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro ao exportar Documento Google (${response.status}): ${errText}`);
        }
        const text = await response.text();
        fileBuffer = Buffer.from(text, 'utf-8');
        actualMimeType = 'text/plain';
      } else {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro ao baixar arquivo do Drive (${response.status}): ${errText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }

      // If it is a docx document, extract raw text using mammoth
      if (isDocx) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          fileBuffer = Buffer.from(result.value, 'utf-8');
          actualMimeType = 'text/plain';
        } catch (docxErr: any) {
          console.error("[Docx Mammoth Extraction Error]", docxErr);
          throw new Error(`Falha ao extrair texto do arquivo Word (.docx): ${docxErr.message}`);
        }
      }

      let contents: any[] = [];
      const systemInstruction = `Você é um assistente especialista em analisar documentos contratuais do Inteli (Instituto de Tecnologia e Liderança).
Analise o documento fornecido para extrair as seguintes informações críticas e formatar estritamente como um objeto JSON válido.

NOME DO ARQUIVO ATUAL NO GOOGLE DRIVE (Referência de Contexto muito Importante):
"${fileName || "Não informado"}"

REGRAS CRÍTICAS DE EXTRAÇÃO (Siga rigidamente para evitar alucinações e erros de template):
1. Empresa Parceira ("empresaParceira"): 
   - Atenção máxima! Muitos termos são criados baseando-se em modelos/templates que originalmente pertenciam a OUTRA empresa (por exemplo, modelos que citam Whirlpool S.A.).
   - Você DEVE identificar quem é a VERDADEIRA empresa parceira/contratada ativa descrita no preâmbulo e na folha de assinatura deste termo específico.
   - Use o nome do arquivo acima como forte indicação de quem é o parceiro real (por exemplo, se o arquivo cita "IBTCC", o parceiro real provavelmente é "INSTITUTO BRASILEIRO DE TECNOLOGIA E CIÊNCIA DA COMPUTAÇÃO" ou "IBTCC"). 
   - Ignore menções a empresas de outros termos ou placeholders remanescentes do template de origem que não fazem sentido com o nome do arquivo.
   - Retorne o nome oficial ou fantasia da empresa parceira correta.

2. Datas de Assinatura ("dataAssinatura") e Validade ("dataValidade"):
   - "dataAssinatura": Extraia a data em que o termo foi assinado (formato DD/MM/AAAA ou null).
   - "dataValidade": Leia atentamente a cláusula de vigência (geralmente Cláusula Quarta ou item de duração). 
   - Se a cláusula estipular um prazo explícito (por exemplo: "vigorará por 24 meses" ou "pelo prazo máximo de 24 meses") a partir da data de assinatura, você DEVE calcular matematicamente a data de validade somando esse prazo à data de assinatura identificada.
   - Exemplo: Assinatura em 02/06/2026 com vigência de 24 meses gera exatamente a dataValidade de "02/06/2028". Nunca retorne null se puder fazer este cálculo. Formato: DD/MM/AAAA.

3. Título do Projeto ("tituloProjeto"):
   - O título ou nome do projeto do estudante associado (ou null se não encontrado).

4. Resumo Crítico ("resumoCritico"):
   - Um resumo conciso de 2 a 3 frases explicando o escopo da parceria e obrigações principais das partes.

5. Status do Documento ("statusDoc"):
   - Sendo "Ativo" ou "Expirado" (se a dataValidade já passou comparado a hoje, 21/07/2026) ou "Revisão Necessária".

Sua resposta deve ser estruturada exatamente assim:
{
  "tituloProjeto": "Título do projeto ou null",
  "empresaParceira": "Empresa Parceira Real",
  "dataAssinatura": "DD/MM/AAAA ou null",
  "dataValidade": "DD/MM/AAAA ou null",
  "resumoCritico": "Texto do resumo",
  "statusDoc": "Ativo" | "Expirado" | "Revisão Necessária"
}

Importante: Retorne apenas o JSON bruto. Não inclua blocos de código com crases (\`\`\`), explicações ou introduções adicionais.`;

      if (actualMimeType === 'text/plain') {
        const textContent = fileBuffer.toString('utf-8');
        contents = [
          {
            text: `${systemInstruction}\n\nConteúdo do documento:\n${textContent}`
          }
        ];
      } else {
        const base64Data = fileBuffer.toString("base64");
        contents = [
          {
            inlineData: {
              mimeType: actualMimeType,
              data: base64Data
            }
          },
          {
            text: systemInstruction
          }
        ];
      }

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents
      });

      let responseText = response.text || "";
      responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        extractedData = {
          tituloProjeto: null,
          empresaParceira: null,
          dataAssinatura: null,
          dataValidade: null,
          resumoCritico: responseText.substring(0, 300),
          statusDoc: "Revisão Necessária",
          error: "Erro na formatação JSON da IA. Exibindo resposta bruta."
        };
      }

      return res.json({ success: true, analysis: extractedData });
    } catch (err: any) {
      console.error("[Drive Document Analyze Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Erro desconhecido ao analisar o documento." });
    }
  });

  return app;
}
