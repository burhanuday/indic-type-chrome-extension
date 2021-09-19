const initialLanguage = "hi";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ language: initialLanguage, enabled: true });
});
