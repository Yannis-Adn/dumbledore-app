// Triggered every time the user lands on gandalf.epitech.eu.
// The background script reads the HttpOnly cookie and stores it.
browser.runtime.sendMessage({ type: 'SYNC_NOW' });
