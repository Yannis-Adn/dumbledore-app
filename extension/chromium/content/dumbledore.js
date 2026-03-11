const MOODLE_KEY = 'dumbledore_token';
const PANORAMIX_KEY = 'dumbledore_panoramix_token';

chrome.runtime.sendMessage({ type: 'GET_TOKENS' }, (tokens) => {
  if (!tokens?.moodle || !tokens?.panoramix) return;

  const currentMoodle = localStorage.getItem(MOODLE_KEY);
  const currentPanoramix = localStorage.getItem(PANORAMIX_KEY);

  const moodleChanged = tokens.moodle !== currentMoodle;
  const panoramixChanged = tokens.panoramix !== currentPanoramix;

  if (moodleChanged || panoramixChanged) {
    localStorage.setItem(MOODLE_KEY, tokens.moodle);
    localStorage.setItem(PANORAMIX_KEY, tokens.panoramix);
    // Reload so AuthProvider picks up the new tokens from localStorage
    window.location.reload();
  }
});
