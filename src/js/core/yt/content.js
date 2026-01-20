(function () {
    const getMoviePlayer = async () => {
        var player = document.getElementById('movie_player');
        if (!player) {
            logMessage('Unable to find movie player');
            return;
        }
        if (player.getPlayerPromise) player = await player.getPlayerPromise();
        return player;
    }

    const isPlayerLoading = async () => {
        var player = await getMoviePlayer();
        if (!player)
            return false;
        return player.getPlayerState() === -1;
    }

    // try clicking skip buttons
    var adSlots = [];
    const tryClickSkipButton = async () => {
        if (!getAdPlayer())
            return;
        var player = await getMoviePlayer();
        if (!player) {
            return;
        }
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

    // reload video when hitting backoff
    var currentBackoff = -1;
    var lastBlockedBackoffUrl = '';
    var retryBackoff = 0;
    var backOffReloadTimeout = 0;
    const reloadVideo = async () => {
        backOffReloadTimeout = setTimeout(() => {
            backOffReloadTimeout = 0;
            logMessage('Reloading video due to backoff');
            getMoviePlayer()
                .then(player => {
                    if (!player)
                        return;
                    const position = player.getCurrentTime();
                    player.stopVideo();
                    player.playVideo();
                    if (position) {
                        player.seekTo(position);
                        logMessage('Restore position to ' + position);
                    }
                });
        }, 1000);
    }

    const trySkipBackoff = async () => {
        const playerLoading = await isPlayerLoading();
        if (!playerLoading) {
            logMessage('Player is not loading');
            return;
        }
        if (currentBackoff <= 2000) {
            logMessage('Not reloading due to backoff time: ' + currentBackoff);
            return;
        }
        if (backOffReloadTimeout) {
            logMessage('Not reloading due to already scheduled reload');
            return;
        }
        if (window.location.href == lastBlockedBackoffUrl) {
            if (retryBackoff++ > 1) {
                logMessage(`Skipping already processed backoff`);
                return;
            }
        } else {
            lastBlockedBackoffUrl = window.location.href;
            retryBackoff = 0;
        }
        logMessage(`Schedule reloading video due to backoff = ${currentBackoff}, retry = ${retryBackoff}`);
        currentBackoff = -1;
        reloadVideo();
    }

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
        await trySkipBackoff();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await trySkipAd();
    }

    const checkAdsContent = async () => {
        const ads = document.querySelectorAll('ytd-browse #contents ytd-ad-slot-renderer');
        logMessage(`Replacing ${ads.length} ad contents`);
        ads.forEach(ad => {
            const placeholder = document.createElement('h3');
            placeholder.className = 'replaced-ads';
            
            const link = document.createElement('a');
            link.className = 'replaced-ads-link';
            link.textContent = 'JadSkip';

            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.postMessage({
                    action: 'openPopup',
                    origin: 'jad-main'
                });
            });

            placeholder.textContent = 'Ads removed by';
            placeholder.appendChild(link);

            // Replace the ad element with the placeholder
            ad.parentNode.replaceChild(placeholder, ad);
        });
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
    // override fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const playerLoading = await isPlayerLoading();
        if (args.length !== 1 || !(args[0] instanceof Request) || !blockEnabled)
            return originalFetch(...args);

        const url = args[0].url;
        if (url.includes("videoplayback") && playerLoading) {
            return originalFetch(...args)
                .then(async response => {
                    if (response.headers.get('content-type') === 'application/vnd.yt-ump') {
                        const reader = response.body.getReader();
                        const chunks = [];
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            chunks.push(value);
                        }
                        let totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                        let buffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of chunks) {
                            buffer.set(chunk, offset);
                            offset += chunk.length;
                        }
                        if (totalLength < 300) {
                            const backoffTime = findBackoffTime(buffer);
                            if (backoffTime > 0) {
                                currentBackoff = backoffTime;
                                logMessage(`Updating backoff time = ${currentBackoff}`);
                            }
                        }
                        const mockResponse = new Response(buffer, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        })
                        Object.defineProperty(mockResponse, "type", { value: "basic" });
                        Object.defineProperty(mockResponse, "url", { value: response.url });
                        return mockResponse;
                    }
                    return response;
                });
        } else {
            return originalFetch(...args);
        }
    }

    window.addEventListener('message', async (event) => {
        if (event.data.origin !== 'jad-extension') return; // Ignore self-originated messages
        logMessage(`Received action from script: ${JSON.stringify(event.data)}`);
        if (event.data.action === 'resetAdBlockState') {
            lastBlockedTime = 0;
            lastBlockedAdURL = '';
        } else if (event.data.action === 'checkAds') {
            await check_ads();
        } else if (event.data.action === 'checkAdsContent') {
            await checkAdsContent();
        } else if (event.data.action === 'checkIdleInteraction') {
            await checkIdle();
        } else if (event.data.action === 'setAdBlockEnabled') {
            blockEnabled = event.data.isEnabled;
        }
    });
})();