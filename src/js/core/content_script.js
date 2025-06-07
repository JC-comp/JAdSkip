(function () {
    const SKIPPED_TAG_NAME = 'skipped_listener';
    const MUTATE_INTERVAL = 500;
    const MAX_MUTATE_CHECK_TIME = 10 * 1000;
    const MAX_MUTATE_RETRY = MAX_MUTATE_CHECK_TIME / MUTATE_INTERVAL;

    var checkAdTimeout = null;
    var checkIdleTimeout = null;
    function checkAdPresence(retry) {
        if (retry >= MAX_MUTATE_RETRY) return;
        chrome.runtime.sendMessage({
            action: 'shouldBlockAds',
            serviceName: getServiceName(),
            channelId: getChannelId()
        }, function (response) {
            if (!response.success) return;
            if (!response.shouldBlockAds) return;
            window.postMessage({
                action: 'checkAds'
            });
            if (checkAdTimeout) clearTimeout(checkAdTimeout);
            checkAdTimeout = setTimeout(() => {
                checkAdPresence(retry + 1);
            }, MUTATE_INTERVAL);
        });
    }
    const checkIdleInteraction = (retry) => {
        if (retry >= MAX_MUTATE_RETRY) return;
        chrome.runtime.sendMessage({
            action: 'shouldBlockAds',
            serviceName: getServiceName(),
            channelId: getChannelId()
        }, function (response) {
            if (!response.success) return;
            if (!response.shouldBlockAds) return;
            window.postMessage({
                action: 'checkIdleInteraction'
            });
            if (checkIdleTimeout) clearTimeout(checkIdleTimeout);
            checkIdleTimeout = setTimeout(() => {
                checkIdleInteraction(retry + 1);
            }, MUTATE_INTERVAL);
        });
    }

    var videoRegisterationTimeout = null;
    const videoCallback = (mutationList, observer) => {
        mutationList.forEach(mutation => {
            if (mutation.attributeName == "src") {
                checkAdPresence(0);
            }
        });
    };

    function _registerVideoListener(video) {
        const observer = new MutationObserver(videoCallback);
        const config = { attributes: true, childList: true, subtree: true };
        if (video.getAttribute(SKIPPED_TAG_NAME) != 1) {
            video.setAttribute(SKIPPED_TAG_NAME, 1);
            video.addEventListener('pause', () => {
                checkIdleInteraction(0);
            });
            video.addEventListener('play', () => {
                checkAdPresence(0);
            });
            observer.observe(video, config);
            checkAdPresence(0);
        }
    }
    function registerVideoListener() {
        let video = document.querySelector('#player video');
        if (video == null) {
            var videos = document.querySelectorAll('video');
            for (let i = 0; i < videos.length; i++)
                _registerVideoListener(videos[i]);
        } else {
            _registerVideoListener(video);
            return;
        }
        if (videoRegisterationTimeout)
            clearTimeout(videoRegisterationTimeout);
        videoRegisterationTimeout = setTimeout(registerVideoListener, 1000);
    }

    function onNavigate() {
        if (videoRegisterationTimeout)
            clearTimeout(videoRegisterationTimeout);
        registerVideoListener();
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (
            request.action === 'adblock-service-status-changed' ||
            request.action === 'adblock-channel-subscription-updated'
        ) {
            var isEnabled = request.isEnabled;
            var serviceName = request.serviceName;
            if (getServiceName() === serviceName) {
                window.postMessage({
                    action: 'setAdBlockEnabled',
                    isEnabled: isEnabled
                });
            }
            window.postMessage({
                action: 'resetAdBlockState'
            });
            checkAdPresence(0);
            sendResponse({ success: true });
            return true;
        }
    });
    chrome.runtime.sendMessage({
        action: 'isServiceEnabled',
        serviceName: getServiceName()
    }, function (response) {
        if (response.success) {
            window.postMessage({
                action: 'setAdBlockEnabled',
                isEnabled: response.isEnabled
            });
        }
    });

    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener('navigate', onNavigate);
    } else {
        window.addEventListener('locationchange', onNavigate);
        window.addEventListener('yt-navigate-finish', onNavigate);
    }
})();