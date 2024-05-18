function updateDisplay(injected, channel_id) {
    var checkbox = injected.querySelector('#status');
    var disabled_img = injected.querySelector('#disabled_img');
    var enabled_img = injected.querySelector('#enabled_img');
    
    disabled_img.classList.remove('hide');
    disabled_img.classList.remove('show');
    enabled_img.classList.remove('hide');
    enabled_img.classList.remove('show');

    chrome.storage.sync.get({subscribes: {}}, function (result) {
        var subscribes = result.subscribes;
        if (subscribes[channel_id] === true) {
            enabled_img.classList.add('hide');
            disabled_img.classList.add('show');
            checkbox.checked = 0;
        } else {
            enabled_img.classList.add('show');
            disabled_img.classList.add('hide');
            checkbox.checked = 1;
        }
    });
}