import { supabase } from './supabase';

let currentPage = null;
let pageStartTime = null;

const device = () => /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

export async function trackActivity(userId, action, metadata = {}, page = null) {
  if (!userId) return;
  try {
    await supabase.from('user_activity').insert({
      user_id: userId,
      action,
      metadata,
      page: page || currentPage,
      device: device(),
      screen_width: window.innerWidth,
    });
  } catch (e) {
    // fire-and-forget — never block UI
  }
}

export function trackPageView(userId, page) {
  // Log duration of previous page
  if (currentPage && pageStartTime && userId) {
    const duration = Date.now() - pageStartTime;
    if (duration > 1000) {
      supabase.from('user_activity').insert({
        user_id: userId,
        action: 'page_exit',
        page: currentPage,
        duration_ms: duration,
        device: device(),
        screen_width: window.innerWidth,
      }).then(() => {}).catch(() => {});
    }
  }

  currentPage = page;
  pageStartTime = Date.now();

  trackActivity(userId, 'page_view', { page }, page);
}
