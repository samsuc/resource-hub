// Optional Cloudflare Worker extension for SAMSUC
// Merge into your existing worker OR add route /reviews
// Uses GUMROAD_ACCESS_TOKEN secret — never put the token in the website.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // GET /reviews — written buyer reviews from Sales API (when present)
    if (url.pathname.endsWith('/reviews') || url.searchParams.get('type') === 'reviews') {
      try {
        const res = await fetch('https://api.gumroad.com/v2/sales?access_token=' + encodeURIComponent(env.GUMROAD_ACCESS_TOKEN));
        const data = await res.json();
        if (!data || !data.success) {
          return new Response(JSON.stringify({ success: false, reviews: [] }), { headers: cors });
        }
        const sales = Array.isArray(data.sales) ? data.sales : [];
        const reviews = [];
        for (const s of sales) {
          const rating = s.product_rating != null ? Number(s.product_rating) : null;
          const message = (s.review && String(s.review).trim()) || '';
          if (!rating && !message) continue;
          if (!message && !rating) continue;
          // Prefer entries that have a written message; star-only optional
          if (!message) continue;
          reviews.push({
            rating: rating || 0,
            message,
            product_name: s.product_name || s.product_id || 'Product',
            permalink: s.product_permalink || null,
            product_url: s.product_permalink ? ('https://samsuchub.gumroad.com/l/' + s.product_permalink) : null,
            rater_name: 'Verified buyer',
          });
        }
        // de-dupe by message
        const seen = new Set();
        const unique = [];
        for (const r of reviews) {
          const k = r.message.slice(0, 100);
          if (seen.has(k)) continue;
          seen.add(k);
          unique.push(r);
        }
        return new Response(JSON.stringify({ success: true, reviews: unique.slice(0, 30) }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, reviews: [], error: String(e) }), { status: 500, headers: cors });
      }
    }

    // ...keep your existing /products handler below...
    return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: cors });
  }
};
