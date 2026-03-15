export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace('/api/blog', '');
  
  // Build the Supabase edge function URL
  const params = new URLSearchParams();
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length >= 1) params.set('section', parts[0]);
  if (parts.length >= 2) params.set('post', parts[1]);
  
  const supabaseUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-blog?${params.toString()}`;
  
  const response = await fetch(supabaseUrl);
  const html = await response.text();
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(response.status).send(html);
}
// cache bust 1773554489
