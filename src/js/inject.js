const initialLanguage = "hi";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ language: initialLanguage });
  console.log("Default language set to ", initialLanguage);
});
