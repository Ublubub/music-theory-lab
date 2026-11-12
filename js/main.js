// Starts the app once every tab file has registered itself, and enables offline use (PWA).
window.App.start();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
}
