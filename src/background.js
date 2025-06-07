function broadcastStatusUpdate(action, args) {
    // Broadcast a status update to all tabs
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: action,
                ...args,
            });
        });
    });
}

function getSubscribedChannels() {
    return new Promise((resolve, _) => {
        chrome.storage.sync.get({ subscribes: {} }, function (result) {
            resolve(result.subscribes);
        });
    });
}

async function checkIfChannelSubscribed(channelId) {
    // Check if the channel is subscribed
    if (channelId === null)
        return false;
    const subscribes = await getSubscribedChannels();
    if (subscribes[channelId] === true) {
        return true;
    } else {
        return false;
    }
}

function checkIfServiceEnabled(serviceName) {
    // Check if the service is enabled
    return new Promise((resolve, _) => {
        if (!serviceName)
            return resolve(false);
        chrome.storage.sync.get(serviceName, function (result) {
            var isEnabled = true;
            if (result[serviceName] !== undefined)
                isEnabled = result[serviceName];
            resolve(isEnabled);
        });
    });
}

function checkIfDebugModeEnabled() {
    // Check if debug mode is enabled
    return new Promise((resolve, _) => {
        chrome.storage.sync.get({ debugMode: false }, function (result) {
            resolve(result.debugMode);
        });
    });
}

function handleSubscriptionQuery(request, sender, sendResponse) {
    // handle the subscription query
    var channelId = request.channelId;
    checkIfChannelSubscribed(channelId).then(isSubscribed => {
        sendResponse({ success: true, isSubscribed: isSubscribed });
    });
}

function handleSubscriptionUpdate(request, sender, sendResponse) {
    // handle the subscription update
    var channelId = request.channelId;
    var isSubscribed = request.isSubscribed;
    getSubscribedChannels().then(subscribes => {
        subscribes[channelId] = isSubscribed;
        chrome.storage.sync.set({ subscribes: subscribes }, function () {
            sendResponse({ success: true });
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'adblock-channel-subscription-updated',
                    });
                });
            });
        });
    }).catch(error => {
        sendResponse({ success: false, error: error });
    });
}

function handleBlockAdsQuery(request, sender, sendResponse) {
    // handle the block ads query
    var serviceName = request.serviceName;
    var channelId = request.channelId;
    checkIfServiceEnabled(serviceName).then(isEnabled => {
        if (isEnabled) {
            checkIfChannelSubscribed(channelId).then(isSubscribed => {
                sendResponse({ success: true, shouldBlockAds: !isSubscribed });
            });
        } else {
            sendResponse({ success: true, shouldBlockAds: false });
        }
    });
}

function handleServiceStatusUpdate(request, sender, sendResponse) {
    // handle the service status update
    var serviceName = request.serviceName;
    var isEnabled = request.isEnabled;
    chrome.storage.sync.set({ [serviceName]: isEnabled }, function () {
        sendResponse({ success: true });
    });
    broadcastStatusUpdate(
        'adblock-service-status-changed', {
        serviceName: serviceName,
        isEnabled: isEnabled,
    }
    );
}

function handleDebugModeQuery(request, sender, sendResponse) {
    // handle the debug mode query
    checkIfDebugModeEnabled().then(isDebugModeEnabled => {
        sendResponse({ success: true, isDebugModeEnabled: isDebugModeEnabled });
    });
}

function handleDebugModeUpdate(request, sender, sendResponse) {
    // handle the debug mode update
    var isDebugModeEnabled = request.isDebugModeEnabled;
    chrome.storage.sync.set({ debugMode: isDebugModeEnabled }, function () {
        sendResponse({ success: true });
        broadcastStatusUpdate(
            'debug-mode-updated', {
            isDebugModeEnabled: isDebugModeEnabled,
        }
        );
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'isChannelSubscribed') {
        handleSubscriptionQuery(request, sender, sendResponse);
        return true;
    } else if (request.action === 'shouldBlockAds') {
        handleBlockAdsQuery(request, sender, sendResponse);
        return true;
    } else if (request.action === 'updateSubscription') {
        handleSubscriptionUpdate(request, sender, sendResponse);
        return true;
    } else if (request.action === 'isServiceEnabled') {
        checkIfServiceEnabled(request.serviceName).then(isEnabled => {
            sendResponse({ success: true, isEnabled: isEnabled });
        });
        return true;
    } else if (request.action === 'updateServiceStatus') {
        // Update the service status
        handleServiceStatusUpdate(request, sender, sendResponse);
        return true;
    } else if (request.action === 'isDebugModeEnabled') {
        handleDebugModeQuery(request, sender, sendResponse);
        return true;
    } else if (request.action === 'updateDebugMode') {
        handleDebugModeUpdate(request, sender, sendResponse);
        return true;
    }
});