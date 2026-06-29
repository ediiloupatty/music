// Whether it's worth spending GPU/CPU on animation right now.
//
// `document.hidden` only flips when the *page* is hidden (minimised, or another
// browser tab is in front). It stays FALSE when another application — e.g. a
// fullscreen/borderless game — is focused on top of the browser. In that case
// the window has lost OS focus but is still "visible", so `document.hasFocus()`
// is the signal that actually catches "user is doing something else now".
//
// Gating the visualizer / lyrics RAF loops and the dynamic-background transition
// on this lets the player drop to a near-idle poll while a game is in front,
// instead of fighting it for the GPU at 60fps. Audio is unaffected — it runs on
// its own thread, so playback keeps going while the visuals freeze.
export function isRenderingActive(): boolean {
  if (typeof document === "undefined") return true; // SSR — assume active
  return !document.hidden && document.hasFocus();
}

// Subscribe to changes in the rendering-active state (visibility OR focus).
// Calls `onChange` on every flip; returns an unsubscribe function.
export function onRenderingActiveChange(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
  };
}
