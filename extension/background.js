const GANDALF_COOKIE = 'MoodleSession';
const PANORAMIX_COOKIE = 'refresh_token';
const GANDALF_URL = 'https://gandalf.epitech.eu';
const PANORAMIX_URL = 'https://panoramix.epitest.eu';

async function fetchAndStore() {
  const [moodleCookie, panoramixCookie] = await Promise.all([
    chrome.cookies.get({ url: GANDALF_URL, name: GANDALF_COOKIE }),
    chrome.cookies.get({ url: PANORAMIX_URL, name: PANORAMIX_COOKIE }),
  ]);

  const stored = await chrome.storage.local.get(['moodle', 'panoramix']);
  const updates = {};

  if (moodleCookie?.value && moodleCookie.value !== stored.moodle) {
    updates.moodle = moodleCookie.value;
  }
  if (panoramixCookie?.value && panoramixCookie.value !== stored.panoramix) {
    updates.panoramix = panoramixCookie.value;
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
    notifyUpdate(updates);
  }

  return { moodle: updates.moodle ?? stored.moodle, panoramix: updates.panoramix ?? stored.panoramix };
}

function notifyUpdate(updates) {
  const names = [];
  if (updates.moodle) names.push('MoodleSession');
  if (updates.panoramix) names.push('Panoramix');
  if (names.length === 0) return;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="56" font-size="56">🧙‍♂️</text></svg>'),
    title: 'Dumbledore — Tokens mis à jour',
    message: `${names.join(' + ')} capturé${names.length > 1 ? 's' : ''}.`,
    silent: true,
  });
}

// Real-time capture via cookie change listener
chrome.cookies.onChanged.addListener(({ cookie, removed }) => {
  if (removed) return;

  if (cookie.domain.includes('gandalf.epitech.eu') && cookie.name === GANDALF_COOKIE) {
    chrome.storage.local.set({ moodle: cookie.value });
    notifyUpdate({ moodle: cookie.value });
  }

  if (cookie.domain.includes('panoramix.epitest.eu') && cookie.name === PANORAMIX_COOKIE) {
    chrome.storage.local.set({ panoramix: cookie.value });
    notifyUpdate({ panoramix: cookie.value });
  }
});

// Initial fetch on install / browser start
chrome.runtime.onInstalled.addListener(fetchAndStore);
chrome.runtime.onStartup.addListener(fetchAndStore);

// Message handler (popup + content scripts)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_TOKENS') {
    chrome.storage.local.get(['moodle', 'panoramix']).then(sendResponse);
    return true;
  }

  if (msg.type === 'SYNC_NOW') {
    fetchAndStore().then(sendResponse);
    return true;
  }

  if (msg.type === 'CLEAR_TOKENS') {
    chrome.storage.local.remove(['moodle', 'panoramix']).then(sendResponse);
    return true;
  }
});
