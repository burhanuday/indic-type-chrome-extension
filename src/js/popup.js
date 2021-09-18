// let languageDropdown = document.getElementById("changeColor");

chrome.storage.sync.get("language", ({ language }) => {});

// changeColor.addEventListener("click", async () => {
//   let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     function: initialiseTransliteration,
//   });
// });

function initialiseTransliteration() {
  chrome.storage.sync.get("language", ({ language }) => {
    // document.body.style.backgroundColor = color;
  });
}
