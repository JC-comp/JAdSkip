function toggle(channel, injected) {
    var checkbox = injected.querySelector('#status');
    var channel_id = channel.querySelector('#subscribers').innerText;
    checkbox.addEventListener('change', function() {
        chrome.storage.sync.get({subscribes: {}}, function (result) {
            var subscribes = result.subscribes;
            subscribes[channel_id] = !checkbox.checked;
            chrome.storage.sync.set({subscribes: subscribes}, function() {
                updateDisplay(injected, channel_id);
            });
        });
    });
    updateDisplay(injected, channel_id);
}

function render() {
    var channels = document.getElementsByTagName('ytd-channel-renderer');
    for (let index = 0; index < channels.length; index++) {
        const channel = channels[index];
        var pref_btn = channel.querySelector('#notification-preference-button');
        var pref_holder = pref_btn.parentElement;
        var injected = pref_holder.querySelector('.toggle-holder');
        if (injected)
            continue
        
        injected = document.createElement('div');
        injected.innerHTML = `<div class="toggle-holder">
            <img id="disabled_img" class="disabled hide" src="chrome-extension://${chrome.runtime.id}/assets/icon-120.png">
            <div class="toggle-switch" style="margin: 0 3px;">
                <label class="switch">
                    <input id="status" type="checkbox">
                    <span class="slider"></span>
                </label>
            </div>
            <img id="enabled_img"class="hide" src="chrome-extension://${chrome.runtime.id}/assets/icon-120.png">
        </div>`;
        toggle(channel, injected);
        pref_holder.appendChild(injected);
    }
}
setInterval(render, 1000);
