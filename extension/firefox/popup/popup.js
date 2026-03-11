const dotMoodle = document.getElementById('dot-moodle');
const dotPanoramix = document.getElementById('dot-panoramix');
const badgeMoodle = document.getElementById('badge-moodle');
const badgePanoramix = document.getElementById('badge-panoramix');
const btnSync = document.getElementById('btn-sync');
const hint = document.getElementById('hint');

function renderTokens(tokens) {
  const hasMoodle = Boolean(tokens?.moodle);
  const hasPanoramix = Boolean(tokens?.panoramix);

  dotMoodle.className = `token-dot ${hasMoodle ? 'ok' : 'missing'}`;
  dotPanoramix.className = `token-dot ${hasPanoramix ? 'ok' : 'missing'}`;

  badgeMoodle.className = `token-badge ${hasMoodle ? 'ok' : 'missing'}`;
  badgePanoramix.className = `token-badge ${hasPanoramix ? 'ok' : 'missing'}`;

  badgeMoodle.textContent = hasMoodle ? '✓ Capturé' : '✗ Manquant';
  badgePanoramix.textContent = hasPanoramix ? '✓ Capturé' : '✗ Manquant';

  if (hasMoodle && hasPanoramix) {
    hint.textContent = 'Tokens à jour. Dumbledore est synchronisé automatiquement.';
  } else {
    const missing = [];
    if (!hasMoodle) missing.push('Gandalf');
    if (!hasPanoramix) missing.push('Panoramix');
    hint.textContent = `Connecte-toi sur ${missing.join(' et ')} pour capturer les tokens.`;
  }
}

function setLoading(loading) {
  btnSync.disabled = loading;
  btnSync.textContent = loading ? '⟳ Syncing...' : '⟳ Sync maintenant';
}

// Initial load
browser.runtime.sendMessage({ type: 'GET_TOKENS' }).then(renderTokens);

// Sync button
btnSync.addEventListener('click', () => {
  setLoading(true);
  browser.runtime.sendMessage({ type: 'SYNC_NOW' }).then((tokens) => {
    renderTokens(tokens);
    setLoading(false);
  });
});

// Live update: re-render if storage changes while popup is open
browser.storage.onChanged.addListener(() => {
  browser.storage.local.get(['moodle', 'panoramix']).then(renderTokens);
});
