export default async function handler(req, res) {
  const { team, post } = req.query;
  const url = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-team-blog?team=${team || ''}${post ? '&post=' + post : ''}`;
  const response = await fetch(url);
  const html = await response.text();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(response.status).send(html);
}
