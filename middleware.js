const BLOG_SECTIONS = ['listing-power-teams','lpt-realty','exp-realty','keller-williams','remax','real-brokerage','epique','realty-of-america'];

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  if (pathname === '/share' || pathname.startsWith('/share?')) {
    const shareUrl = 'https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-share' + url.search;
    const res = await fetch(shareUrl);
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (parts.length > 0 && BLOG_SECTIONS.includes(parts[0])) {
    const section = parts[0];
    const post = parts[1] || '';
    const params = new URLSearchParams();
    params.set('section', section);
    if (post) params.set('post', post);
    
    const supabaseUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-blog?${params.toString()}`;
    const response = await fetch(supabaseUrl);
    const html = await response.text();
    
    return new Response(html, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
}

export const config = {
  matcher: ['/(lpt-realty|exp-realty|keller-williams|remax|real-brokerage|epique|realty-of-america|listing-power-teams)/:path*', '/share']
};
// 1773555408
