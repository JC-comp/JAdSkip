(function () {
    var adSlots = [];
    const tryClickSkipButton = async () => {
        if (!getAdPlayer())
            return;
        var player = document.getElementById('movie_player');
        if (!player) {
            logMessage('Unable to find movie player');
            return;
        }
        if (player.getPlayerPromise) player = await player.getPlayerPromise();
        if (!player.onAdUxClicked) {
            logMessage('Player does not support ad UX clicks');
            return;
        }
        
        if (adSlots.length == 0) {
            logMessage('No ad slots captured yet');
        } else {
            logMessage(`Trying captured ad slots: ${adSlots.length}`);
            adSlots.forEach(slot => {
                clickTriggers(player, slot);
            });
        }
        var playerSlots = player.getPlayerResponse()?.adSlots;
        if (!playerSlots) {
            logMessage('No ad slots found in player response');
            return;
        }
        logMessage(`Trying ad slots from player response: ${playerSlots.length}`);
        playerSlots.forEach(slot => {
            clickTriggers(player, slot);
        });
    }

    var lastBlockedTime = 0;
    var lastBlockedAdURL = '';
    const trySkipAd = async () => {
        const player = getAdPlayer();
        if (!player)
            return;
        logMessage(`Processing ad "${player.src}" at ${player.currentTime} / ${player.duration}`);
        if (!isFinite(player.duration)) {
            logMessage('Ad duration is not finite, skipping ad skip');
            return;
        }
        if (player.src == lastBlockedAdURL) {
            logMessage(`Skipping already processed ad`);
            return;
        }
        var threshold = player.duration * 0.4;
        if (player.currentTime < threshold) {
            logMessage(`Ad is not ready to be skipped, current time: ${player.currentTime}, threshold: ${threshold}`);
            return;
        }
        var target = player.duration - 0.1;
        logMessage(`Skipping ad from ${player.currentTime} to ${target}`);
        player.currentTime = target;
        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    };

    const check_ads = async () => {
        await tryClickSkipButton();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    const checkIdle = async () => {
        var button = null;
        var buttons = document.querySelectorAll('#confirm-button');
        logMessage(`Found ${buttons.length} confirm buttons`);
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].checkVisibility()) {
                button = buttons[i];
                break;
            }
        }
        if (!button) return;
        var actions = button.data?.serviceEndpoint?.signalServiceEndpoint?.actions;
        logMessage(`Actions found: ${actions ? actions.length : 0}`);
        if (!actions) return;
        actions.forEach(action => {
            var signal = action.signalAction?.signal;
            if (!signal) return;
            if (signal == 'ACKNOWLEDGE_YOUTHERE') {
                logMessage(`Clicking confirm button for youthere`);
                button.click();
            }
        });
    };


    // override XMLHttpRequest
    var blockEnabled = false;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;
        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    var response = JSON.parse(this.response);
                    if ('adThrottled' in response) {
                        logMessage(`Ad throttling response detected: ${response.adThrottled}`);
                        if (blockEnabled) {
                            logMessage(`Replacing ad throttling response`);
                            Object.defineProperty(this, 'response', {
                                writable: true
                            });
                            response.adThrottled = true;
                            this.response = JSON.stringify(response);
                        } else if (response.adSlots) {
                            logMessage(`Ad slots detected: ${response.adSlots.length}`);
                            adSlots = response.adSlots;
                        }
                    }
                } catch (e) {
                    // Not a JSON response, continue as normal
                }
                return originalOnload.apply(this, onloadArgs);
            }
        }
        return originalSend.apply(this, args);
    }

    window.addEventListener('message', async (event) => {
        if (event.data.origin === 'main') return; // Ignore self-originated messages
        logMessage(`Received action: ${JSON.stringify(event.data)}`);
        if (event.data.action === 'resetAdBlockState') {
            lastBlockedTime = 0;
            lastBlockedAdURL = '';
        } else if (event.data.action === 'checkAds') {
            await check_ads();
        } else if (event.data.action === 'checkIdleInteraction') {
            await checkIdle();
        } else if (event.data.action === 'setAdBlockEnabled') {
            blockEnabled = event.data.isEnabled;
        }
    });
})();