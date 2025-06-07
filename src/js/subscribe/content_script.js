(function () {
    var renderChannelTimeout = null;
    var renderVideoTimeout = null;

    function renderChannel(retryCount) {
        if (retryCount >= MAX_RETRY) return;

        var channels = document.getElementsByTagName('ytd-channel-renderer');
        var addedCount = 0;
        for (let index = 0; index < channels.length; index++) {
            const channel = channels[index];
            var pref_btn = channel.querySelector('#notification-preference-button');
            if (!pref_btn) pref_btn = channel.querySelector('#subscribe-button');
            if (!pref_btn) continue;
            var pref_holder = pref_btn.parentElement;
            var injected = pref_holder.querySelector('.toggle-holder');
            if (injected) continue;

            var channelID = channel.querySelector('#subscribers').innerText;
            pref_holder.appendChild(
                createSubscriptionToggle(channelID)
            );
            addedCount += 1;
        }
        if (channels.length === 0 || addedCount > 0) {
            renderChannelTimeout = setTimeout(() => {
                renderChannel(retryCount + 1);
            }, 1000);
        }
    }

    function renderVideo(retryCount) {
        if (retryCount >= MAX_RETRY) return;
        var channelId = getChannelId();
        if (channelId != null) {
            var holders = document.querySelectorAll('ytd-watch-metadata #subscribe-button');
            for (let index = 0; index < holders.length; index++) {
                var holder = holders[index];
                var injected = holder.querySelector('.toggle-holder');
                if (injected) continue;

                injected = createSubscriptionToggle(channelId);
                holder.insertBefore(injected, holder.firstChild);
            }
        }
        renderVideoTimeout = setTimeout(() => {
            renderVideo(retryCount + 1);
        }, 1000);
    }

    renderChannel(0);
    renderVideo(0);

    function onNavigate() {
        if (renderChannelTimeout)
            clearTimeout(renderChannelTimeout);
        if (renderVideoTimeout)
            clearTimeout(renderVideoTimeout);
        removeAllSubscriptionToggles();
        chrome.runtime.sendMessage({
            action: 'isServiceEnabled',
            serviceName: getServiceName()
        }, function (response) {
            if (!response.success || !response.isEnabled) return;
            renderChannel(0);
            renderVideo(0);
        });
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (
            request.action === 'adblock-service-status-changed' ||
            request.action === 'adblock-channel-subscription-updated'
        ) {
            if (!document.hasFocus())
                onNavigate();
            sendResponse({ success: true });
            return true;
        }
    });

    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener('navigate', onNavigate);
    } else {
        window.addEventListener('locationchange', onNavigate);
        window.addEventListener('yt-navigate-finish', onNavigate);
    }
})();