const MAX_RETRY = 15;

function updateSubscriptionToggle(injected, channelId) {
    // Update the injected subscription toggle
    var checkbox = injected.querySelector('#status');
    var disabled_img = injected.querySelector('#disabled_img');
    var enabled_img = injected.querySelector('#enabled_img');

    disabled_img.classList.remove('hide');
    disabled_img.classList.remove('show');
    enabled_img.classList.remove('hide');
    enabled_img.classList.remove('show');

    try {
        chrome.runtime.sendMessage({
            action: 'isChannelSubscribed',
            channelId: channelId
        }, function (response) {
            if (chrome.runtime.lastError)
                return;
            if (response.success) {
                var isSubscribed = response.isSubscribed;
                if (isSubscribed) {
                    enabled_img.classList.add('hide');
                    disabled_img.classList.add('show');
                    checkbox.checked = 0;
                } else {
                    enabled_img.classList.add('show');
                    disabled_img.classList.add('hide');
                    checkbox.checked = 1;
                    window.postMessage({
                        action: 'checkAds',
                        origin: 'extension'
                    });
                }
            }
        });
    } catch (error) {
        console.log(`Error updating subscription toggle: ${error.message}`);
    }
}

function createSubscriptionToggle(channelId) {
    var injected = document.createElement('div');
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
    var checkbox = injected.querySelector('#status');
    checkbox.addEventListener('change', function (e) {
        try {
            chrome.runtime.sendMessage({
                action: 'updateSubscription',
                channelId: channelId,
                isSubscribed: !checkbox.checked
            }, function (response) {
                if (chrome.runtime.lastError || !response.success)
                    e.target.checked = !e.target.checked;
                updateSubscriptionToggle(injected, channelId);
            });
        } catch (error) {
            console.log(`Error updating subscription: ${error.message}`);
            e.target.checked = !e.target.checked;
        }
    });
    updateSubscriptionToggle(injected, channelId);
    var imgs = injected.querySelectorAll('img');
    imgs.forEach(img => {
        img.addEventListener('click', function () {
            try {
                chrome.runtime.sendMessage({
                    action: 'openPopup'
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        console.log('Failed to open popup:', chrome.runtime.lastError.message);
                    }
                });
            } catch (error) {
                console.log(`Error opening popup: ${error.message}`);
            }
        });
    });
    return injected;
}

function removeAllSubscriptionToggles() {
    var toggles = document.querySelectorAll('.toggle-holder');
    toggles.forEach(toggle => {
        toggle.remove();
    });
}

function getChannelId() {
    var channel_id = null;
    var renderer = document.getElementsByTagName('ytd-video-owner-renderer');
    if (renderer.length > 0) {
        renderer = renderer[0];
        var segs = renderer.querySelector('a').href.split('/');
        channel_id = segs[segs.length - 1];
    }
    if (renderer.length == 0) {
        renderer = document.querySelector('span[itemprop="author"] link[itemprop=url]')
        if (renderer) {
            var segs = renderer.href.split('/');
            channel_id = segs[segs.length - 1];
        }
    }
    return channel_id;
}

function getServiceName() {
    var url = window.location.href;
    if (url.includes('music.youtube.com')) {
        return 'isytmOn';
    } else if (url.includes('www.youtube.com')) {
        return 'isytOn';
    } else {
        return null;
    }
}