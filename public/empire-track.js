/**
 * LIVIN EMPIRE ANALYTICS — tracks page views, events, conversions
 * All data flows to livi-hub empire_page_hits + empire_events tables
 */
(function() {
  'use strict';
  var HUB_URL = 'https://wqmersuhdamwwdbebblp.supabase.co/rest/v1';
  var HUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxbWVyc3VoZGFtd3dkYmViYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzE0MDIsImV4cCI6MjA4OTAwNzQwMn0.lAna-ckPPchVMQrr75jb9PRo17zVa8JpxhdbIyLXgbs';
  var scriptTag = document.currentScript;
  var SPOKE = (scriptTag && scriptTag.getAttribute('data-spoke')) || (function() {
    var h = window.location.hostname;
    if (h.includes('rkrt')) return 'rkrt';
    if (h.includes('livin') && !h.includes('iamlivi')) return 'livin';
    if (h.includes('iamlivi') || h.includes('livi')) return 'livi';
    return 'global';
  })();
  var DOMAIN = window.location.hostname;
  var sid = sessionStorage.getItem('_emp_sid');
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('_emp_sid', sid); }
  var fp = [navigator.userAgent, navigator.language, screen.width+'x'+screen.height, new Date().getTimezoneOffset()].join('|');
  var hash = 0; for (var i = 0; i < fp.length; i++) { hash = ((hash << 5) - hash) + fp.charCodeAt(i); hash |= 0; }
  var ipHash = 'fp_' + Math.abs(hash).toString(36);
  var utm = {}; var params = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(function(k) { if (params.get(k)) utm[k] = params.get(k); });
  var loadTime = Date.now(), pageViews = 0, lastPath = null;

  function getDevice() { var w = window.innerWidth; return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'; }
  function getUserId() {
    try { var keys = Object.keys(localStorage); for (var i = 0; i < keys.length; i++) {
      if (keys[i].includes('supabase') && keys[i].includes('auth')) {
        var d = JSON.parse(localStorage.getItem(keys[i]));
        if (d && d.user) return d.user.id; if (d && d.currentSession && d.currentSession.user) return d.currentSession.user.id;
    }}} catch(e) {} return null;
  }

  function post(table, data) {
    Object.keys(data).forEach(function(k) { if (data[k] === null || data[k] === undefined) delete data[k]; });
    fetch(HUB_URL + '/' + table, {
      method: 'POST', headers: { 'apikey': HUB_KEY, 'Authorization': 'Bearer ' + HUB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(data), keepalive: true
    }).catch(function() {});
  }

  function trackPageView() {
    var p = window.location.pathname + window.location.hash;
    if (p === lastPath) return;
    lastPath = p; pageViews++;
    post('empire_page_hits', Object.assign({ spoke: SPOKE, domain: DOMAIN, path: p, referrer: document.referrer || undefined,
      user_agent: navigator.userAgent, device: getDevice(), screen_width: window.innerWidth,
      ip_hash: ipHash, session_id: sid, user_id: getUserId(), is_bounce: pageViews <= 1 }, utm));
  }

  trackPageView();
  window.addEventListener('hashchange', trackPageView);
  var origPush = history.pushState; history.pushState = function() { origPush.apply(this, arguments); setTimeout(trackPageView, 0); };
  window.addEventListener('popstate', trackPageView);

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      post('empire_page_hits', Object.assign({ spoke: SPOKE, domain: DOMAIN, path: window.location.pathname + window.location.hash,
        duration_ms: Date.now() - loadTime, is_bounce: pageViews <= 1, ip_hash: ipHash, session_id: sid, user_id: getUserId(),
        device: getDevice(), screen_width: window.innerWidth }, utm));
    }
  });

  document.addEventListener('click', function(e) {
    var t = e.target.closest('a[href], button, [data-track]');
    if (!t) return;
    if (t.hasAttribute('data-track')) {
      post('empire_events', { spoke: SPOKE, domain: DOMAIN, event_name: t.getAttribute('data-track'),
        event_category: t.getAttribute('data-track-category') || 'engagement', path: window.location.pathname + window.location.hash,
        element_id: t.id, element_text: (t.textContent||'').trim().substring(0,100), session_id: sid, user_id: getUserId(), ip_hash: ipHash });
      return;
    }
    var txt = (t.textContent || '').toLowerCase();
    if (txt.includes('sign up') || txt.includes('book') || txt.includes('join') || txt.includes('schedule') || txt.includes('get started') || txt.includes('apply')) {
      post('empire_events', { spoke: SPOKE, domain: DOMAIN, event_name: 'cta_click', event_category: 'conversion',
        path: window.location.pathname + window.location.hash, element_id: t.id || t.className,
        element_text: (t.textContent||'').trim().substring(0,100), session_id: sid, user_id: getUserId(), ip_hash: ipHash });
    }
  });

  window.empireTrack = function(name, opts) {
    opts = opts || {};
    post('empire_events', { spoke: SPOKE, domain: DOMAIN, event_name: name, event_category: opts.category || 'engagement',
      path: window.location.pathname + window.location.hash, element_id: opts.element, element_text: opts.text,
      metadata: opts.data || opts.metadata || {}, session_id: sid, user_id: getUserId(), ip_hash: ipHash, value: opts.value });
  };
})();
