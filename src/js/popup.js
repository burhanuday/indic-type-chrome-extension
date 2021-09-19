const supportedLanguages = [
  { label: "Amharic", value: "am" },
  { label: "Arabic", value: "ar" },
  { label: "Bangla", value: "bn" },
  { label: "Belarusian", value: "be" },
  { label: "Bulgarian", value: "bg" },
  { label: "Chinese (Hong Kong)", value: "yue-hant" },
  { label: "Chinese (Simplified)", value: "zh" },
  { label: "Chinese (Traditional)", value: "zh-hant" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Greek", value: "el" },
  { label: "Gujarati", value: "gu" },
  { label: "Hebrew", value: "he" },
  { label: "Hindi", value: "hi" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Kannada", value: "kn" },
  { label: "Malayalam", value: "ml" },
  { label: "Marathi", value: "mr" },
  { label: "Nepali", value: "ne" },
  { label: "Odia", value: "or" },
  { label: "Persian", value: "fa" },
  { label: "Portuguese (Brazil)", value: "pt" },
  { label: "Punjabi", value: "pa" },
  { label: "Russian", value: "ru" },
  { label: "Sanskrit", value: "sa" },
  { label: "Serbian", value: "sr" },
  { label: "Sinhala", value: "si" },
  { label: "Spanish", value: "es" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Tigrinya", value: "ti" },
  { label: "Ukrainian", value: "uk" },
  { label: "Urdu", value: "ur" },
  { label: "Vietnamese", value: "vi" },
];

const languageDropdown = document.getElementById("t-language-selector");
const enabledCheckbox = document.getElementById("t-enabled");

languageDropdown.innerHTML = `${supportedLanguages.map(
  (language) => `<option value="${language.value}">${language.label}</option>`
)}`;

/**
 * Fetch stored language preference and set it to the dropdown
 */
chrome.storage.sync.get("language", ({ language }) => {
  languageDropdown.value = language;
});

chrome.storage.sync.get("enabled", ({ enabled }) => {
  enabledCheckbox.checked = enabled;
});

languageDropdown.addEventListener("change", (event) => {
  if (event && event.target && event.target.value) {
    chrome.storage.sync.set({ language: event.target.value });
  }
});

enabledCheckbox.addEventListener("change", function (event) {
  console.log(event);
  chrome.storage.sync.set({ enabled: event.target.checked });
});
