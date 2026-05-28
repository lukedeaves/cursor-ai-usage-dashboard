const DASHBOARD_URL = 'http://127.0.0.1:8080/index.html';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cursor Usage Dashboard extension ready. Start the app with: make serve');
});

chrome.downloads.onCreated.addListener(item => {
  const name = item.filename || '';
  if (/usage.*\.csv$/i.test(name) || /cursor.*usage/i.test(name)) {
    chrome.tabs.create({ url: DASHBOARD_URL });
  }
});
