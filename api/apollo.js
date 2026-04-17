/**
 * Vercel Serverless Proxy for Apollo.io API
 * Bypasses browser CORS restrictions by proxying requests server-side.
 *
 * Usage from browser:
 *   POST /api/apollo
 *   Headers: { "x-apollo-key": "<user's apollo key>", "Content-Type": "application/json" }
 *   Body: same JSON body you'd send to Apollo's /v1/mixed_people/search
 *
 * The proxy forwards the request to Apollo, returns the response as-is.
 */
export default async function handler(req, res) {
  // CORS headers for browser access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-apollo-key, x-apollo-endpoint");

  // Handle preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = req.headers["x-apollo-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-apollo-key header" });

  // Allow overriding endpoint for different Apollo APIs (default: people search)
  const endpoint = req.headers["x-apollo-endpoint"] || "https://api.apollo.io/v1/mixed_people/search";

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

    const data = await upstream.json();

    // Forward Apollo's status code
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Apollo proxy error:", err);
    return res.status(502).json({ error: "Apollo proxy failed", detail: err.message });
  }
}
