import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import dns from "dns";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
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

  // Helper to resolve HubSpot Access Token
  const getHubSpotToken = (req: express.Request): string | undefined => {
    const headerToken = req.headers["x-hubspot-token"];
    if (typeof headerToken === "string" && headerToken.trim().length > 0) {
      return headerToken.trim();
    }
    return process.env.HUBSPOT_ACCESS_TOKEN;
  };

  // 1. HubSpot Configuration Status
  app.get("/api/hubspot/status", (req, res) => {
    const token = getHubSpotToken(req);
    res.json({
      configured: !!token && token.trim().length > 0,
      hasTokenEnv: !!process.env.HUBSPOT_ACCESS_TOKEN,
      hasHeaderToken: !!req.headers["x-hubspot-token"]
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
        period: "period"
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
            ...discoveredAtelieKeys
          ])).filter(Boolean);
        } else {
          console.warn(`Could not fetch Deal properties list from HubSpot (Status ${propsRes.status}). Using safe fallback property list.`);
          dealPropertiesToRequest = [
            "dealname", "pipeline", "createdate", "dealstage", "description",
            "titulo_projeto_c", "ep_ano_de_aplicacao", "ep_tri_de_aplicacao",
            "modulo_curso", "codigo_turma_c", "ep_id_unico_da_turma",
            "period", "periodo", "turno", "ep_turno", "ep_periodo",
            "ep_atelie", "atelie", "ateliê"
          ];
        }
      } catch (propsErr: any) {
        console.error("Non-blocking error fetching deal properties list:", propsErr.message);
        dealPropertiesToRequest = [
          "dealname", "pipeline", "createdate", "dealstage", "description",
          "titulo_projeto_c", "ep_ano_de_aplicacao", "ep_tri_de_aplicacao",
          "modulo_curso", "codigo_turma_c", "ep_id_unico_da_turma",
          "period", "periodo", "turno", "ep_turno", "ep_periodo",
          "ep_atelie", "atelie", "ateliê"
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
        const applicationQuarter = props[resolvedKeys.ep_tri_de_aplicacao] || "";

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
          "ep_atelie",
          "ep_ateliê",
          "_ep__ateli_",
          "ep__atelie",
          "atelie",
          "ateliê"
        ];
        for (const key of keysToCheck) {
          const val = props[key];
          if (val && typeof val === "string" && val.trim().length > 0) {
            rawAtelieVal = val.trim();
            break;
          }
        }
        
        let epAtelie: string[] = [];
        if (rawAtelieVal) {
          const splitNames = rawAtelieVal.split(",").map(s => s.trim()).filter(Boolean);
          epAtelie = splitNames.map(name => {
            return `atelie-${name.toLowerCase()}
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
          projectDescription: description,
          dealstage,
          projectTitle,
          description,
          partnerId: linkedPartnerId,
          applicationYear,
          applicationQuarter,
          courseModule,
          classCode,
          uniqueClassId,
          epAtelie,
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
          "ep_atelie",
          "ep_ateliê",
          "_ep__ateli_",
          "ep__atelie",
          "atelie",
          "ateliê"
        ];

        for (const key of keysToCheck) {
          const val = deal.properties[key];
          if (val && typeof val === "string" && val.trim().length > 0) {
            rawAtelieVal = val.trim();
            break;
          }
        }

        if (rawAtelieVal) {
          // Split by commas in case multiple Ateliês are comma-separated in the deal field
          const splitNames = rawAtelieVal.split(",").map(s => s.trim()).filter(Boolean);
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

  return app;
}
