package main

// titlebarJS is injected into every page (before its own scripts, on each
// navigation). It marks the desktop environment, forwards now-playing events to
// Discord, and builds a custom 32px title bar with working window controls that
// call the win* functions bound in main.go. All styling is inline so it works on
// the unmodified online web app.
const titlebarJS = `
window.__ZENIFY_DESKTOP__ = true;

window.addEventListener('zenify:nowplaying', function (e) {
  try { window.zenifyPresence(e.detail); } catch (_) {}
});

// Reveal the (off-screen) window as soon as the document has painted its first
// frame (the dark shell / loading skeleton) — NOT on 'load'. With streaming SSR
// and a slow backend, 'load' only fires once all data has arrived, which would
// keep the window hidden the whole time (skeleton never seen) and then flash.
// The root element paints dark from the first frame (inline bg on <html>), so
// revealing early shows the skeleton with no white flash.
(function revealOnReady() {
  var done = false;
  function reveal() {
    if (done) return; done = true;
    try { window.winReveal(); } catch (_) {}
  }
  function tick() {
    if (done) return;
    if (document.body && document.body.childNodes.length > 0) {
      // One extra rAF so the first paint (incl. CSS) has actually landed.
      requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    } else {
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);
  // Hard fallback so the window can never get stuck off-screen.
  setTimeout(reveal, 3000);
})();

(function () {
  function call(n){ var f = window[n]; if (typeof f === 'function') f(); }

  function mkbtn(svg, hover, fn){
    var b = document.createElement('button');
    b.style.cssText = 'height:100%;width:46px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;color:inherit;cursor:default;transition:background .15s,color .15s;-webkit-app-region:no-drag';
    b.innerHTML = svg;
    b.onmousedown = function(e){ e.stopPropagation(); };
    b.onmouseenter = function(){ b.style.background = hover; if (hover === '#dc2626') b.style.color = '#fff'; };
    b.onmouseleave = function(){ b.style.background = 'transparent'; b.style.color = 'inherit'; };
    b.onclick = fn;
    return b;
  }

  function inject(){
    if (!document.body || document.getElementById('zenify-titlebar')) return;

    var style = document.createElement('style');
    style.id = 'zenify-titlebar-style';
    // Reserve the 32px for the title bar on normal (in-flow) pages, but NOT on
    // full-screen fixed overlays (e.g. the expanded player) — those must stay a
    // full 100vh so nothing leaks at the bottom; the title bar simply floats over
    // their top via its higher z-index.
    style.textContent = 'body{padding-top:32px !important}.h-screen:not(.fixed){height:calc(100vh - 32px) !important}';
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'zenify-titlebar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;background:#0a0c11;border-bottom:1px solid rgba(255,255,255,.08);color:#9aa3af;user-select:none;font-family:system-ui,Segoe UI,sans-serif';
    bar.onmousedown = function(){ call('winDragStart'); };

    // Left: back / forward nav
    var navBtn = 'height:28px;width:28px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:6px;color:#9aa3af;cursor:default;transition:background .15s,color .15s;-webkit-app-region:no-drag;padding:0';
    var back = document.createElement('button');
    back.style.cssText = navBtn;
    back.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 4 6 8 10 12"/></svg>';
    back.onmousedown = function(e){ e.stopPropagation(); };
    back.onmouseenter = function(){ back.style.background='rgba(255,255,255,.08)'; back.style.color='#fff'; };
    back.onmouseleave = function(){ back.style.background='transparent'; back.style.color='#9aa3af'; };
    back.onclick = function(){ window.history.back(); };

    var fwd = document.createElement('button');
    fwd.style.cssText = navBtn;
    fwd.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"/></svg>';
    fwd.onmousedown = function(e){ e.stopPropagation(); };
    fwd.onmouseenter = function(){ fwd.style.background='rgba(255,255,255,.08)'; fwd.style.color='#fff'; };
    fwd.onmouseleave = function(){ fwd.style.background='transparent'; fwd.style.color='#9aa3af'; };
    fwd.onclick = function(){ window.history.forward(); };

    var leftZone = document.createElement('div');
    leftZone.style.cssText = 'display:flex;align-items:center;gap:2px;padding:0 8px;height:100%;min-width:100px';
    leftZone.appendChild(back);
    leftZone.appendChild(fwd);
    bar.appendChild(leftZone);

    // Center: logo + name
    var center = document.createElement('div');
    center.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;pointer-events:none';
    center.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#14b8a6">' +
      '<rect x="2.5" y="8" width="2.6" height="8" rx="1.3"/>' +
      '<rect x="6.6" y="5.5" width="2.6" height="13" rx="1.3"/>' +
      '<rect x="10.7" y="3.5" width="2.6" height="17" rx="1.3"/>' +
      '<rect x="14.8" y="6.5" width="2.6" height="11" rx="1.3"/>' +
      '<rect x="18.9" y="8.5" width="2.6" height="7" rx="1.3"/></svg>' +
      '<span style="font-size:12px;font-weight:600;letter-spacing:.04em;color:#e2e8f0">Zenify</span>';
    bar.appendChild(center);

    var ctr = document.createElement('div');
    ctr.style.cssText = 'display:flex;align-items:center;height:100%';

    var minSvg = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="1" y1="6" x2="10" y2="6"/></svg>';
    var maxSvg = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.2" y="1.2" width="8.6" height="8.6" rx="1"/></svg>';
    var clsSvg = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="1.5" y1="1.5" x2="9.5" y2="9.5"/><line x1="9.5" y1="1.5" x2="1.5" y2="9.5"/></svg>';

    ctr.appendChild(mkbtn(minSvg, 'rgba(255,255,255,.1)', function(){ call('winMinimize'); }));
    ctr.appendChild(mkbtn(maxSvg, 'rgba(255,255,255,.1)', function(){ call('winToggleMaximize'); }));
    ctr.appendChild(mkbtn(clsSvg, '#dc2626', function(){ call('winClose'); }));

    bar.appendChild(ctr);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  // Safety net in case a client-side route change wipes the node.
  setInterval(inject, 1000);
})();
`
