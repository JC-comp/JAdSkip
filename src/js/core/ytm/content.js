(function () {
    const tryClickSkipButton = async () => {
        if (!getAdPlayer()) return;
        var player = document.getElementById('player')?.getPlayer();
        if (!player) {
            logMessage('Unable to get player');
            return;
        }
        var playerSlots = player.getPlayerResponse()?.adSlots;
        if (!playerSlots) {
            logMessage('No ad slots found in player response');
            return;
        }
        logMessage(`Trying ad slots from player response: ${playerSlots.length}`);
        playerSlots.forEach(e => {
            let triggers = e.adSlotRenderer.fulfillmentContent.fulfilledLayout?.playerBytesAdLayoutRenderer?.layoutExitSkipTriggers;
            if (!triggers)
                return
            triggers.forEach(t => {
                player.onAdUxClicked("skip-button", t.skipRequestedTrigger?.triggeringLayoutId)
            })
        });
    }

    var lastBlockedTime = 0;
    var lastBlockedAdURL = '';
    const trySkipAd = async () => {
        const player = getAdPlayer();
        if (!player) return;
        logMessage(`Processing ad "${player.src}" at ${player.currentTime} / ${player.duration}`);
        if (!isFinite(player.duration)) {
            logMessage('Ad duration is not finite, skipping ad skip');
            return;
        }
        if (player.src == lastBlockedAdURL) {
            logMessage(`Skipping already processed ad`);
            return;
        }
        var target = player.duration - 0.1;
        logMessage(`Skipping ad from ${player.currentTime} to ${target}`);

        player.currentTime = target;
        lastBlockedAdURL = player.src;
        lastBlockedTime = Date.now();
    }

    const check_ads = async () => {
        await tryClickSkipButton();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    const checkIdle = async () => {
        var renderers = document.getElementsByTagName('ytmusic-you-there-renderer');
        logMessage(`Found ${renderers.length} YouThere renderers`);
        if (renderers.length == 0) return;
        var renderer = renderers[0];
        if (!renderer.checkVisibility()) return;
        var button = renderer.querySelector('button');
        if (!button) return;
        logMessage(`Clicking YouThere button: ${button.textContent}`);
        button.click();
    };

    // override XHR
    var blockEnabled = false;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        const originalOnload = this.onload;
        if (originalOnload) {
            this.onload = function (...onloadArgs) {
                try {
                    var response = JSON.parse(this.response);
                    if (response.adSlots) {
                        logMessage(`Ad slots detected: ${response.adSlots.length}`);
                        if (blockEnabled) {
                            logMessage(`Removing adSlots response`);
                            Object.defineProperty(this, 'response', {
                                writable: true
                            });
                            delete response.adSlots;
                            this.response = JSON.stringify(response);
                        }
                    }
                    if (response.messages) {
                        response.messages.forEach(message => {
                            if (message.youThereRenderer) {
                                logMessage('Youthere renderer detected');
                                if (blockEnabled) {
                                    logMessage(`Removing youthere renderer`);
                                    Object.defineProperty(this, 'response', {
                                        writable: true
                                    });
                                    delete message.youThereRenderer;
                                    this.response = JSON.stringify(response);
                                }
                            }
                        });
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
        if (event.data.origin !== 'jad-extension') return; // Ignore self-originated messages
        logMessage(`Received action: ${event.data.action}`);
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