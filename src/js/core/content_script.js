(function () {
    const SKIPPED_TAG_NAME = 'skipped_listener';
    const MUTATE_INTERVAL = 500;
    const MAX_MUTATE_CHECK_TIME = 10 * 1000;
    const MAX_MUTATE_RETRY = MAX_MUTATE_CHECK_TIME / MUTATE_INTERVAL;
    // Logger initialization
    var logger = new Logger();
    window.addEventListener('message', function (event) {
        if (event.data.origin !== 'jad-main') return; // Ignore self-originated messages
        if (event.data.action === 'log') {
            logger.log(event.data.message);
            return;
        }
        logger.log(`Received action from main: ${JSON.stringify(event.data)}`);
        if (event.data.action === 'openPopup') {
            chrome.runtime.sendMessage({
                action: 'openPopup'
            }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log('Failed to open popup:', chrome.runtime.lastError.message);
                }
            });
        }
    });

    // Operation functions
    var checkAdTimeout = null;
    var checkAdContentTimeout = null;
    var checkIdleTimeout = null;
    function checkAdPresence(retry) {
        if (retry >= MAX_MUTATE_RETRY) return;
        try {
            chrome.runtime.sendMessage({
                action: 'shouldBlockAds',
                serviceName: getServiceName(),
                channelId: getChannelId()
            }, function (response) {
                if (chrome.runtime.lastError) {
                    logger.error(`Error checking ad presence: ${chrome.runtime.lastError.message}`);
                    return;
                }
                logger.log(`Checking ad presence, retry: ${retry}, shouldBlockAds: ${JSON.stringify(response)}`);
                if (!response.success) return;
                if (!response.shouldBlockAds) return;
                window.postMessage({
                    action: 'checkAds',
                    origin: 'jad-extension'
                });
                if (checkAdTimeout) clearTimeout(checkAdTimeout);
                checkAdTimeout = setTimeout(() => {
                    checkAdPresence(retry + 1);
                }, MUTATE_INTERVAL);
            });
        } catch (error) {
            logger.log(`Error checking ad presence: ${error.message}`);
        }
    }
    function checkAdContentPresence(retry) {
        if (retry >= MAX_MUTATE_RETRY) return;
        try {
            chrome.runtime.sendMessage({
                action: 'shouldBlockAds',
                serviceName: getServiceName(),
                channelId: getChannelId()
            }, function (response) {
                if (chrome.runtime.lastError) {
                    logger.error(`Error checking ad presence: ${chrome.runtime.lastError.message}`);
                    return;
                }
                logger.log(`Checking ad content presence, retry: ${retry}, shouldBlockAds: ${JSON.stringify(response)}`);
                if (!response.success) return;
                if (!response.shouldBlockAds) return;
                window.postMessage({
                    action: 'checkAdsContent',
                    origin: 'jad-extension'
                });
                if (checkAdContentTimeout) clearTimeout(checkAdContentTimeout);
                checkAdContentTimeout = setTimeout(() => {
                    checkAdContentPresence(retry + 1);
                }, MUTATE_INTERVAL);
            });
        } catch (error) {
            logger.log(`Error checking ad content presence: ${error.message}`);
        }
    }
    const checkIdleInteraction = (retry) => {
        if (retry >= MAX_MUTATE_RETRY) return;
        try {
            chrome.runtime.sendMessage({
                action: 'shouldBlockAds',
                serviceName: getServiceName(),
                channelId: getChannelId()
            }, function (response) {
                if (chrome.runtime.lastError) {
                    logger.error(`Error checking idle interaction: ${chrome.runtime.lastError.message}`);
                    return;
                }
                logger.log(`Checking idle interaction, retry: ${retry}, shouldBlockAds: ${JSON.stringify(response)}`);
                if (!response.success) return;
                if (!response.shouldBlockAds) return;
                window.postMessage({
                    action: 'checkIdleInteraction',
                    origin: 'jad-extension'
                });
                if (checkIdleTimeout) clearTimeout(checkIdleTimeout);
                checkIdleTimeout = setTimeout(() => {
                    checkIdleInteraction(retry + 1);
                }, MUTATE_INTERVAL);
            });
        } catch (error) {
            logger.log(`Error checking idle interaction: ${error.message}`);
        }
    }

    // Registration functions
    var videoRegistrationTimeout = null;
    const videoCallback = (mutationList, observer) => {
        mutationList.forEach(mutation => {
            if (mutation.attributeName == "src") {
                logger.log(`Video source changed, checking for ads`);
                checkAdPresence(0);
            }
        });
    };

    function _registerVideoListener(video) {
        const observer = new MutationObserver(videoCallback);
        const config = { attributes: true, childList: true, subtree: true };
        if (video.getAttribute(SKIPPED_TAG_NAME) == 1) {
            logger.log(`Video already registered`);
            return;
        }
        video.setAttribute(SKIPPED_TAG_NAME, 1);
        video.addEventListener('pause', () => {
            if (checkAdTimeout)
                clearTimeout(checkAdTimeout);
            checkIdleInteraction(0);
        });
        video.addEventListener('play', () => {
            if (checkIdleTimeout)
                clearTimeout(checkIdleTimeout);
            checkAdPresence(0);
        });
        observer.observe(video, config);
        checkAdPresence(0);
    }
    function registerVideoListener() {
        let video = document.querySelector('#player video');
        if (video == null) {
            var videos = document.querySelectorAll('video');
            logger.log(`No video found in player, checking ${videos.length} videos on the page`);
            for (let i = 0; i < videos.length; i++)
                _registerVideoListener(videos[i]);
        } else {
            logger.log(`Video found in player, registering listener`);
            _registerVideoListener(video);
            return;
        }
        if (videoRegistrationTimeout)
            clearTimeout(videoRegistrationTimeout);
        videoRegistrationTimeout = setTimeout(registerVideoListener, 1000);
    }

    var contentFilterRegistrationTimeout = null;
    var deBouncedContentFilter = null;
    const contentCallback = (mutationList, observer) => {
        if (deBouncedContentFilter === null) {
            logger.log(`Fire first content filter`);
            checkAdContentPresence(0);
            deBouncedContentFilter = 0;
        } else {
            logger.log(`debounced filter for 1 seconds`);
            clearTimeout(deBouncedContentFilter);
            deBouncedContentFilter = setTimeout(() => {
                checkAdContentPresence(0);
                deBouncedContentFilter = null;
            }, 1000);
        }
    };
    function _registerContentListener(contentHolder) {
        const observer = new MutationObserver(contentCallback);
        const config = { attributes: true, childList: true, subtree: true };
        if (contentHolder.getAttribute(SKIPPED_TAG_NAME) == 1) {
            logger.log(`Content holder already registered`);
            return;
        }
        contentHolder.setAttribute(SKIPPED_TAG_NAME, 1);
        observer.observe(contentHolder, config);
        checkAdContentPresence(0);
    }
    function registerContentListener() {
        let contentHolder = document.querySelector('ytd-browse #contents')
        if (contentHolder != null) {
            logger.log(`Contents found in, registering listener`);
            _registerContentListener(contentHolder);
            return;
        }
        if (contentFilterRegistrationTimeout)
            clearTimeout(contentFilterRegistrationTimeout);
        contentFilterRegistrationTimeout = setTimeout(registerContentListener, 1000);
    }
    // Page change detection
    function onNavigate() {
        logger.log('Page navigation detected, re-registering video listener');
        if (videoRegistrationTimeout)
            clearTimeout(videoRegistrationTimeout);
        registerVideoListener();
        if (contentFilterRegistrationTimeout)
            clearTimeout(contentFilterRegistrationTimeout);
        registerContentListener();
    }
    function onTriggerDetection() {
        checkAdPresence(0);
        checkAdContentPresence(0);
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
                    origin: 'jad-extension',
                    isEnabled: isEnabled
                });
            }
            window.postMessage({
                action: 'resetAdBlockState',
                origin: 'jad-extension'
            });
            onTriggerDetection();
            sendResponse({ success: true });
            return true;
        } else if (request.action === 'copyDebugLog') {
            sendResponse({ success: true, message: logger.toString() });
            return true;
        } else {
            sendResponse({ success: false, message: 'Unknown action' });
        }
    });
    if (window.navigation && window.navigation.addEventListener) {
        window.navigation.addEventListener('navigate', onNavigate);
    } else {
        window.addEventListener('locationchange', onNavigate);
        window.addEventListener('yt-navigate-finish', onNavigate);
    }

    // Initial registration
    onNavigate();
    try {
        chrome.runtime.sendMessage({
            action: 'isServiceEnabled',
            serviceName: getServiceName()
        }, function (response) {
            if (!chrome.runtime.lastError) {
                if (response.success) {
                    window.postMessage({
                        action: 'setAdBlockEnabled',
                        origin: 'jad-extension',
                        isEnabled: response.isEnabled
                    });
                }
            }
        });
    } catch (error) {
        logger.log(`Error checking service status: ${error.message}`);
    }
    try {
        chrome.runtime.sendMessage({
            action: 'isDebugModeEnabled'
        }, function (response) {
            if (!chrome.runtime.lastError) {
                if (response.success) {
                    logger.setDebugMode(response.isDebugModeEnabled);
                }
            }
        });
    } catch (error) {
        logger.log(`Error checking debug mode: ${error.message}`);
    }
})();