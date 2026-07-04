// background/chromium.js
// Permite que un clic en el action button abra el side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error configurando el Side Panel:", error));
