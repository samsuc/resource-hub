/**
 * Cloudflare Worker — include PPP prices for SAMSUC Resource Hub
 * Secret: GUMROAD_ACCESS_TOKEN
 *
 * Deploy this (or merge into your existing worker).
 * Your site already reads purchasing_power_parity_prices from the Worker JSON.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      const res = await fetch(
        'https://api.gumroad.com/v2/products?access_token=' + encodeURIComponent(env.GUMROAD_ACCESS_TOKEN)
      );
      const data = await res.json();
      if (!data || !data.success || !Array.isArray(data.products)) {
        return new Response(JSON.stringify({ success: false, products: [] }), { headers: cors });
      }

      const products = data.products
        .filter((p) => p && p.published !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || p.custom_summary || '',
          permalink: p.custom_permalink || (p.short_url || '').split('/').pop() || null,
          url: p.short_url || p.url,
          thumbnail_url: p.thumbnail_url || null,
          // Gumroad "price" is in cents
          price_cents: typeof p.price === 'number' ? p.price : (p.price_cents || 0),
          currency: (p.currency || 'usd').toLowerCase(),
          published: true,
          // country code -> cents (same currency as product)
          purchasing_power_parity_prices: p.purchasing_power_parity_prices || {},
        }));

      return new Response(JSON.stringify({ success: true, products }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: String(e), products: [] }), {
        status: 500,
        headers: cors,
      });
    }
  },
};
