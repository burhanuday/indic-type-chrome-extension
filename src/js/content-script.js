const getTransliterateSuggestions = async (
  word,
  lang = "hi",
  numOptions = 4,
  showCurrentWordAsLastSuggestion = true
) => {
  const url = `https://inputtools.google.com/request?text=${word}&itc=${lang}-t-i0-und&num=${numOptions}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data && data[0] === "SUCCESS") {
      const found = showCurrentWordAsLastSuggestion
        ? [...data[1][0][1], word]
        : data[1][0][1];

      return found;
    } else {
      if (showCurrentWordAsLastSuggestion) {
        return [word];
      }
      return [];
    }
  } catch (e) {
    console.error("There was an error with fetching options", e);
    return [];
  }
};

function getInputSelection(el) {
  const start = 0;
  const end = 0;

  if (!el) {
    return { start, end };
  }

  if (
    typeof el.selectionStart === "number" &&
    typeof el.selectionEnd === "number"
  ) {
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  return { start, end };
}

function setCaretPosition(elem, caretPos) {
  if (elem) {
    if (elem.selectionStart) {
      elem.focus();
      elem.setSelectionRange(caretPos, caretPos);
    } else {
      elem.focus();
    }
  }
}

// We'll copy the properties below into the mirror div.
// Note that some browsers, such as Firefox, do not concatenate properties
// into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
// so we have to list every single property explicitly.
const properties = [
  "direction", // RTL support
  "boxSizing",
  "width", // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  "height",
  "overflowX",
  "overflowY", // copy the scrollbar for IE

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",

  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",

  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration", // might not make a difference, but better be safe

  "letterSpacing",
  "wordSpacing",

  "tabSize",
  "MozTabSize",
];

function getCaretCoordinates(element, position) {
  const isBrowser = typeof window !== "undefined";
  if (!isBrowser) {
    throw new Error(
      "textarea-caret-position#getCaretCoordinates should only be called in a browser"
    );
  }

  // The mirror div will replicate the textarea's style
  const div = document.createElement("div");
  div.id = "input-textarea-caret-position-mirror-div";
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle
    ? window.getComputedStyle(element)
    : element.currentStyle; // currentStyle for IE < 9
  const isInput = element.nodeName === "INPUT";

  // Default textarea styles
  style.whiteSpace = "pre-wrap";
  if (!isInput) style.wordWrap = "break-word"; // only for textarea-s

  // Position off-screen
  style.position = "absolute"; // required to return coordinates properly
  style.visibility = "hidden"; // not 'display: none' because we want rendering

  // Transfer the element's properties to the div
  properties.forEach(function (prop) {
    if (isInput && prop === "lineHeight") {
      // Special case for <input>s because text is rendered centered and line height may be != height
      if (computed.boxSizing === "border-box") {
        const height = parseInt(computed.height);
        const outerHeight =
          parseInt(computed.paddingTop) +
          parseInt(computed.paddingBottom) +
          parseInt(computed.borderTopWidth) +
          parseInt(computed.borderBottomWidth);
        const targetHeight = outerHeight + parseInt(computed.lineHeight);
        if (height > targetHeight) {
          style.lineHeight = height - outerHeight + "px";
        } else if (height === targetHeight) {
          style.lineHeight = computed.lineHeight;
        } else {
          style.lineHeight = 0;
        }
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      style[prop] = computed[prop];
    }
  });

  style.overflow = "hidden"; // for Chrome to not render a scrollbar

  div.textContent = element.value.substring(0, position);
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (isInput) div.textContent = div.textContent.replace(/\s/g, "\u00a0");

  const span = document.createElement("span");
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textarea's content into the <span> created at the caret position.
  // For inputs, just '.' would be enough, but no need to bother.
  span.textContent = element.value.substring(position) || "."; // || because a completely empty faux span doesn't render at all
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed["borderTopWidth"]),
    left: span.offsetLeft + parseInt(computed["borderLeftWidth"]),
    height: parseInt(computed["lineHeight"]),
  };

  document.body.removeChild(div);

  return coordinates;
}

const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_ESCAPE = 27;
const KEY_RETURN = 13;
const KEY_ENTER = 14;
const KEY_TAB = 9;
const KEY_SPACE = 32;

const triggerKeys = [KEY_RETURN, KEY_ENTER, KEY_SPACE];

const OPTION_LIST_Y_OFFSET = 20;
const OPTION_LIST_MIN_WIDTH = 100;

let matchStart = -1;
let matchEnd = -1;
let topCoordinate = 0;
let leftCoordinate = 0;

let selectionIndex = 0;
let suggestions = [];
let activeElement = null;
let language = null;
let value = "";
let isExtensionEnabled = true;

const ul = document.createElement("ul");
ul.classList.add("t-suggestions-box");

document.body.append(ul);

const renderSuggestionsList = () => {
  ul.style.left = `${leftCoordinate}px`;
  ul.style.top = `${topCoordinate}px`;
  ul.style.position = "absolute";
  ul.style.width = "auto";
  ul.style.display =
    suggestions.length && isExtensionEnabled ? "block" : "none";

  ul.innerHTML = "";

  suggestions.forEach((suggestion, index) => {
    const li = document.createElement("li");
    li.innerHTML = suggestion;
    if (selectionIndex === index) {
      li.classList.add("t-active-option");
    } else {
      li.classList.remove("t-active-option");
    }
    li.addEventListener("mouseenter", () => {
      if (selectionIndex !== index) {
        selectionIndex = index;
        renderSuggestionsList();
      }
    });
    li.addEventListener("click", () => {
      handleSelection(index);
    });
    ul.append(li);
  });
};

// reset the component
const reset = () => {
  selectionIndex = 0;
  suggestions = [];
  renderSuggestionsList();
};

const handleSelection = (index) => {
  const currentString = value;
  // create a new string with the currently typed word
  // replaced with the word in transliterated language
  if (typeof currentString !== "string") return;
  const newValue =
    currentString.substring(0, matchStart) +
    suggestions[index] +
    " " +
    currentString.substring(matchEnd + 1, currentString.length);

  // set the position of the caret (cursor) one character after the
  // the position of the new word
  setCaretPosition(activeElement, matchStart + suggestions[index].length + 1);

  activeElement.value = newValue;
  reset();
};

const getLastWordFromText = (text, caret) => {
  // search for the last occurence of the space character from
  // the cursor
  const indexOfLastSpace =
    text.lastIndexOf(" ", caret - 1) < text.lastIndexOf("\n", caret - 1)
      ? text.lastIndexOf("\n", caret - 1)
      : text.lastIndexOf(" ", caret - 1);

  matchStart = indexOfLastSpace + 1;
  matchEnd = caret - 1;

  return text.slice(indexOfLastSpace + 1, caret);
};

const handleKeyDown = (event) => {
  const helperVisible = suggestions.length > 0;

  if (helperVisible) {
    event.stopPropagation();
    if (triggerKeys.includes(event.keyCode)) {
      handleSelection(selectionIndex);
    } else {
      switch (event.keyCode) {
        case KEY_ESCAPE:
          reset();
          break;
        case KEY_UP:
          selectionIndex =
            (suggestions.length + selectionIndex - 1) % suggestions.length;
          break;
        case KEY_DOWN:
          selectionIndex = (selectionIndex + 1) % suggestions.length;
          break;
      }
    }
    renderSuggestionsList();
  }
};

const handleInput = async (event) => {
  value = event.target.value;
  const caret = getInputSelection(event.target).end;
  const caretPos = getCaretCoordinates(activeElement, caret);

  const currentWord = getLastWordFromText(value, caret);

  if (currentWord) {
    const newSuggestions = await getTransliterateSuggestions(
      currentWord,
      language
    );
    suggestions = newSuggestions;
    renderSuggestionsList();

    const rect = activeElement.getBoundingClientRect();

    const newTop =
      window.scrollY + caretPos.top + rect.top + OPTION_LIST_Y_OFFSET;
    const newLeft = window.scrollX + caretPos.left + rect.left;

    topCoordinate = newTop;
    leftCoordinate = newLeft;
  } else {
    reset();
  }
};

const removeEventListeners = () => {
  activeElement.removeEventListener("input", handleInput);
  activeElement.removeEventListener("keydown", handleKeyDown);
  activeElement.removeEventListener("blur", this);
};

const setActiveElementListeners = () => {
  if (!activeElement) return;
  activeElement.addEventListener("input", handleInput);
  activeElement.addEventListener("keydown", handleKeyDown);
  activeElement.addEventListener("blur", removeEventListeners);
};

const onFocusChangeEventListener = () => {
  // access to document.activeElement may throw an error
  // @see https://bugs.jquery.com/ticket/13393
  try {
    activeElement = document.activeElement;

    if (!activeElement) {
      activeElement = document.querySelector(":focus");
    }

    const tagName = activeElement.tagName;

    // only continue if focused elements are input type
    if (tagName !== "INPUT" && tagName !== "TEXTAREA") return;

    if (activeElement.type === "password") return;

    setActiveElementListeners();
  } catch (error) {
    console.error("error while fetching focused element", error);
  }
};

function initialiseTransliteration() {
  chrome.storage.sync.get("language", ({ language: selectedLanguage }) => {
    language = selectedLanguage;
  });
  chrome.storage.sync.get("enabled", ({ enabled }) => {
    isExtensionEnabled = enabled;
  });
  renderSuggestionsList();
  if (isExtensionEnabled) {
    activeElement = document.activeElement || document.querySelector(":focus");
    document.addEventListener("focusin", onFocusChangeEventListener, true);
  }
}

initialiseTransliteration();

// listen to changes in user preference
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    switch (key) {
      case "language":
        language = newValue;
        break;
      case "enabled":
        isExtensionEnabled = newValue;
        if (newValue === false) {
          document.removeEventListener(
            "focusin",
            onFocusChangeEventListener,
            true
          );
          removeEventListeners();
        } else {
          document.addEventListener(
            "focusin",
            onFocusChangeEventListener,
            true
          );
          setActiveElementListeners();
        }
        renderSuggestionsList();
    }
  }
});
