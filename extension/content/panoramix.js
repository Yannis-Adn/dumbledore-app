// Triggered every time the user lands on panoramix.epitest.eu.
// The background service worker reads the HttpOnly cookie and stores it.
chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
