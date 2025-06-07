(function () {
    var adSlots = [];
    const tryClickSkipButton = async () => {
        if (!getAdPlayer())
            return;
        if (document.getElementById('ytd-player')?.getPlayerPromise) {
            var player = await document.getElementById('ytd-player').getPlayerPromise();
            const clickTriggers = (slot) => {
                let triggers = slot.adSlotRenderer.fulfillmentContent.fulfilledLayout?.playerBytesAdLayoutRenderer?.layoutExitSkipTriggers;
                if (!triggers)
                    return
                triggers.forEach(t => {
                    player.onAdUxClicked("skip-button", t.skipRequestedTrigger?.triggeringLayoutId)
                })
            };
            adSlots.forEach(slot => {
                clickTriggers(slot);
            });
            player.getPlayerResponse()?.adSlots?.forEach(slot => {
                clickTriggers(slot);
            });
        }
    }

    var lastBlockedTime = 0;
    var lastBlockedAdURL = '';
    const trySkipAd = async () => {
        const player = getAdPlayer();
        if (!player)
            return;
        if (
            isFinite(player.duration) &&
            player.src != lastBlockedAdURL && // Prevent skipping the same ad multiple times
            (
                player.currentTime > player.duration * 0.4 // Prevent abnormal skip
            )
        ) {
            player.currentTime = player.duration - 0.1;
            lastBlockedAdURL = player.src;
            lastBlockedTime = Date.now();
        }
    };

    const check_ads = async () => {
        await tryClickSkipButton();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    const checkIdle = async () => {
        var button = null;
        var buttons = document.querySelectorAll('#confirm-button');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].checkVisibility()) {
                button = buttons[i];
                break;
            }
        }
        if (!button) return;
        var actions = button.data?.serviceEndpoint?.signalServiceEndpoint?.actions;
        if (!actions) return;
        actions.forEach(action => {
            var signal = action.signalAction?.signal;
            if (!signal) return;
            if (signal == 'ACKNOWLEDGE_YOUTHERE') {
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
                        if (blockEnabled) {
                            Object.defineProperty(this, 'response', {
                                writable: true
                            });
                            response.adThrottled = true;
                            this.response = JSON.stringify(response);
                        } else if (response.adSlots) {
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