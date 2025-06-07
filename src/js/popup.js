function setUpPage(page) {
    let key = 'is' + page + 'On';

    var checkbox = document.getElementById(page + '_status');
    checkbox.addEventListener('change', function () {
        chrome.runtime.sendMessage({
            action: 'updateServiceStatus',
            serviceName: key,
            isEnabled: this.checked
        });
    });

    chrome.runtime.sendMessage({
        action: 'isServiceEnabled',
        serviceName: key
    }, function (response) {
        if (response.success) {
            checkbox.checked = response.isEnabled;
        }
    });
}

function postCopy(debugButton, success) {
    if (success) {
        debugButton.innerHTML = chrome.i18n.getMessage('copied');
        debugButton.classList.add('success');
        setTimeout(() => {
            debugButton.innerHTML = chrome.i18n.getMessage('copy_debug_log');
            debugButton.classList.remove('success');
        }, 2000);
    } else {
        debugButton.innerHTML = chrome.i18n.getMessage('failed');
        debugButton.classList.add('error');
        setTimeout(() => {
            debugButton.innerHTML = chrome.i18n.getMessage('copy_debug_log');
            debugButton.classList.remove('error');
        }, 2000);
    }
}

function refreshLog() {
    var logArea = document.getElementById('debug_log');
    logArea.value = chrome.i18n.getMessage('log_not_found');
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'copyDebugLog'
        }, function (response) {
            if (response && response.success)
                logArea.value = response.message;
        });
    });
}

function setUpDebugButton() {
    refreshLog();
    var logArea = document.getElementById('debug_log');
    var debugButton = document.getElementById('copy_debug_log');
    debugButton.addEventListener('click', function () {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(logArea.value).then(() => {
                postCopy(debugButton, true);
            }).catch(err => {
                postCopy(debugButton, false);
                console.error('Failed to copy debug log: ', err);
            });
        } else {
            logArea.select();
            logArea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            postCopy(debugButton, true);
        }
    });
}

function i18n() {
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerHTML = chrome.i18n.getMessage(elem.dataset.locale)
    })
}

document.addEventListener("DOMContentLoaded", () => {
    i18n();

    setUpPage('yt');
    setUpPage('ytm');
    setUpDebugButton();
});
