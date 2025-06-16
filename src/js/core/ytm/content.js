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
        }
    });
})();