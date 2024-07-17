var lang_map = {
  'en': 'en',
  'en-US': 'en',
  'zh': 'zh-TW',
  'zh-TW': 'zh-TW'
}

function swithTo(lang) {
  if (!(lang in lang_map))
    lang = 'en';
  else
    lang = lang_map[lang];

  var actionPage = 'html/popup.html?lang=' + lang;
  var popupUrl = chrome.runtime.getURL(actionPage);
  window.location.href = popupUrl;
}

function setUpPage(page) {
  let key = 'is' + page + 'On';

  var checkbox = document.getElementById(page + '_status');

  checkbox.addEventListener('change', function () {
    chrome.storage.sync.set({ [key]: this.checked });
  });

  chrome.storage.sync.get(key, function (data) {
    if (data[key] === undefined)
      checkbox.checked = true;
    else
      checkbox.checked = data[key];
  });
}

function i18n() {
  document.querySelectorAll('[data-locale]').forEach(elem => {
    elem.innerHTML = chrome.i18n.getMessage(elem.dataset.locale)
  })
}

function setUpLang() {
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById('lang').value =  urlParams.get('lang') || 'en';
  document.getElementById('lang').addEventListener('change', function () {
    swithTo(this.value);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  i18n();

  setUpPage('yt');
  setUpPage('ytm');

  // setUpLang();
});
