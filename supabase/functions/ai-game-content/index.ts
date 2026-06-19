// Generates fresh game content (quiz/flag/math/word/typing) via Lovable AI.
// Public function — no auth needed; rate-limited by gateway.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Game = "quiz" | "flag" | "math" | "word" | "typing";

const SYSTEM: Record<Game, string> = {
  quiz: `You write fresh, varied general-knowledge multiple-choice questions. Mix world facts, science, history, geography, sports, pop culture, and Myanmar/SE-Asia trivia. NEVER repeat a question across the batch. Difficulty must vary (easy → hard).`,
  flag: `You generate flag-quiz items. Pick well-known countries plus a few less-common ones. Provide the country's flag emoji and exactly 4 plausible country options (one correct). Vary the picks across the batch.`,
  math: `You write fresh single-line arithmetic problems for a 5-second timed game. Use +, -, ×, ÷ (integer results only). Vary difficulty from easy to medium-hard. Provide 4 numeric options (one correct). Never repeat the same expression.`,
  word: `You pick fresh uppercase English words (5-7 letters) for an unscramble game. Common, recognizable words only — no proper nouns, no plurals of irregular nouns, no offensive words. Vary the words each batch.`,
  typing: `You pick fresh common English words (4-7 letters, lowercase) for a typing-speed game. Easy-to-spell, no punctuation. Vary the picks each batch.`,
};

const SCHEMA: Record<Game, unknown> = {
  quiz: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            answerIndex: { type: "integer", minimum: 0, maximum: 3 },
          },
          required: ["q", "options", "answerIndex"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  flag: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            flag: { type: "string" },
            name: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          },
          required: ["flag", "name", "options"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  math: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            expression: { type: "string" },
            answer: { type: "integer" },
            options: { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4 },
          },
          required: ["expression", "answer", "options"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  word: {
    type: "object",
    properties: { items: { type: "array", items: { type: "object", properties: { word: { type: "string" } }, required: ["word"], additionalProperties: false } } },
    required: ["items"],
    additionalProperties: false,
  },
  typing: {
    type: "object",
    properties: { items: { type: "array", items: { type: "object", properties: { word: { type: "string" } }, required: ["word"], additionalProperties: false } } },
    required: ["items"],
    additionalProperties: false,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { game, count = 20 } = (await req.json()) as { game: Game; count?: number };
    if (!game || !SYSTEM[game]) {
      return new Response(JSON.stringify({ error: "Invalid game" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n = Math.max(5, Math.min(30, count));
    const seed = Math.random().toString(36).slice(2, 10);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "raw",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM[game] },
          { role: "user", content: `Generate exactly ${n} unique items. Vary difficulty. Randomization seed: ${seed}. Return JSON matching the schema.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "game_items", strict: true, schema: SCHEMA[game] },
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "AI gateway failed", detail: txt }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { items?: unknown[] };
    try { parsed = JSON.parse(content); } catch { parsed = { items: [] }; }

    return new Response(JSON.stringify({ items: parsed.items ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
