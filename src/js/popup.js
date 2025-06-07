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

function i18n() {
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerHTML = chrome.i18n.getMessage(elem.dataset.locale)
    })
}

document.addEventListener("DOMContentLoaded", () => {
    i18n();

    setUpPage('yt');
    setUpPage('ytm');
});
