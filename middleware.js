const BLOG_SECTIONS = ['listing-power-teams','lpt-realty','exp-realty','keller-williams','remax','real-brokerage','epique','realty-of-america'];

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  const host = request.headers.get('host') || '';

  // join.rkrt.in → redirect to app.rkrt.in
  if (host.startsWith('join.')) {
    const target = new URL(request.url);
    target.host = target.host.replace('join.', 'app.');
    return Response.redirect(target.toString(), 302);
  }

  if (pathname === '/' && !host.startsWith('app.')) {
    return Response.redirect(new URL('/home.html', request.url), 302);
  }

  // /recruit → old sales page
  if (pathname === '/recruit' && !host.startsWith('app.')) {
    return Response.redirect(new URL('/recruit.html', request.url), 302);
  }

  // /article → article page
  if (pathname === '/article' && !host.startsWith('app.')) {
    return Response.redirect(new URL('/article.html' + url.search, request.url), 302);
  }

  if (pathname === '/share' || pathname.startsWith('/share?')) {
    const shareUrl = 'https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-share' + url.search;
    const res = await fetch(shareUrl);
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (pathname.startsWith('/r/')) {
    const slug = pathname.slice(1); // keeps "r/whatever"
    const existingParams = url.searchParams.toString();
    const connector = existingParams ? '&' : '';
    const rpUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-recruiting-page?slug=${encodeURIComponent(slug)}${connector}${existingParams}`;
    const res = await fetch(rpUrl);
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const landingPages = ['/calculator', '/join', '/why-switch', '/new-agent', '/revenue-share'];
  if (landingPages.includes(pathname)) {
    const existingParams = url.searchParams.toString();
    const connector = existingParams ? '&' : '';
    const lpUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-landing?page=${pathname.slice(1)}${connector}${existingParams}`;
    const res = await fetch(lpUrl);
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (pathname.startsWith('/book/')) {
    const slug = pathname.slice(6); // strip "/book/"
    if (slug) {
      const existingParams = url.searchParams.toString();
      const connector = existingParams ? '&' : '';
      const bkUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-booking?slug=${encodeURIComponent(slug)}${connector}${existingParams}`;
      const res = await fetch(bkUrl);
      return new Response(res.body, {
        status: res.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }

  if (pathname.startsWith('/i/')) {
    const slug = pathname.slice(3); // strip "/i/"
    const existingParams = url.searchParams.toString();
    const connector = existingParams ? '&' : '';
    const lpUrl = `https://usknntguurefeyzusbdh.supabase.co/functions/v1/serve-insight?slug=${encodeURIComponent(slug)}${connector}${existingParams}`;
    const res = await fetch(lpUrl);
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
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
  matcher: ['/', '/recruit', '/article', '/(lpt-realty|exp-realty|keller-williams|remax|real-brokerage|epique|realty-of-america|listing-power-teams)/:path*', '/share', '/r/:path*', '/book/:path*', '/i/:path*', '/calculator', '/join', '/why-switch', '/new-agent', '/revenue-share']
};
// 1773555408
