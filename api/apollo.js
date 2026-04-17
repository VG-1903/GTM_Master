/**
 * Vercel Serverless Proxy for Apollo.io API
 * Bypasses browser CORS restrictions by proxying requests server-side.
 *
 * Usage from browser:
 *   POST /api/apollo
 *   Headers: { "x-apollo-key": "<user's apollo key>", "Content-Type": "application/json" }
 *   Body: same JSON body you'd send to Apollo's api_search
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-apollo-key, x-apollo-endpoint");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = req.headers["x-apollo-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-apollo-key header" });

  const endpoint = req.headers["x-apollo-endpoint"] || "https://api.apollo.io/api/v1/mixed_people/api_search";

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(req.body),
    });

    // Read as text first — Apollo sometimes returns plain text errors
    const raw = await upstream.text();

    // Try to parse as JSON, fall back to wrapping raw text
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      // Return Apollo's raw text as a structured error so the browser can read it
      return res.status(upstream.status).json({
        error: raw.slice(0, 500),
        apollo_status: upstream.status,
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Apollo proxy error:", err);
    return res.status(502).json({ error: "Apollo proxy failed", detail: err.message });
  }
}
