/**
 * Vercel Serverless Proxy for Lusha API
 * Bypasses browser CORS restrictions by proxying requests server-side.
 *
 * Usage from browser:
 *   POST /api/lusha
 *   Headers: { "x-lusha-key": "<user's lusha key>", "Content-Type": "application/json" }
 *   Body: same JSON body you'd send to Lusha's contact/search
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-lusha-key, x-lusha-endpoint");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = req.headers["x-lusha-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-lusha-key header" });

  const endpoint = req.headers["x-lusha-endpoint"] || "https://api.lusha.com/prospecting/contact/search";

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": apiKey,
      },
      body: JSON.stringify(req.body),
    });

    const raw = await upstream.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return res.status(upstream.status).json({
        error: raw.slice(0, 500),
        lusha_status: upstream.status,
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Lusha proxy error:", err);
    return res.status(502).json({ error: "Lusha proxy failed", detail: err.message });
  }
}
