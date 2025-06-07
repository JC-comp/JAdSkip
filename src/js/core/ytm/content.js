(function () {
    const tryClickSkipButton = async () => {
        if (!getAdPlayer())
            return;
        var player = document.getElementById('player')?.getPlayer();
        if (!player) return;
        player.getPlayerResponse()?.adSlots?.forEach(e => {
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
        if (isFinite(player.duration) && player.src != lastBlockedAdURL) {
            player.currentTime = player.duration - 0.1;
            lastBlockedAdURL = player.src;
            lastBlockedTime = Date.now();
        }
    }

    const check_ads = async () => {
        await tryClickSkipButton();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    const checkIdle = async () => {
        var renderers = document.getElementsByTagName('ytmusic-you-there-renderer');
        if (renderers.length == 0) return;
        var renderer = renderers[0];
        if (!renderer.checkVisibility()) return;
        var button = renderer.querySelector('button');
        if (!button) return;
        button.click();
    };

    window.addEventListener('message', async (event) => {
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