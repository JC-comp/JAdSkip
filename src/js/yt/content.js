const check_ads = async (cached_url, cached_video_url, last_ad_blocked_time) => {
    const moviePlayer = document.getElementById('movie_player');
    if (!moviePlayer)
        return [cached_url, cached_video_url, last_ad_blocked_time];
    const videoStream = moviePlayer.getElementsByClassName('video-stream');
    var adsModule = moviePlayer.getElementsByClassName('ytp-ad-module');
    const video_url = location.search;
    if (videoStream.length && adsModule.length && hasAds(adsModule)) {
        const player = videoStream[0];    
        const currentTime = new Date().getTime();
        adsModule = adsModule[0];
        if (isFinite(player.duration) && 
            player.src != cached_url && 
                (
                    player.currentTime >  PRE_ADS_WAITING_TIME || 
                    (
                        cached_video_url == video_url &&
                        (currentTime - last_ad_blocked_time) > (10 * 1000)
                    )
                )
            ) {
            if (cached_video_url != video_url) {
                cached_video_url = video_url;
                last_ad_blocked_time = new Date().getTime();
            }
            if (player.duration > 16 && player.currentTime < 7.5)
                player.currentTime += 5;
            else {
                cached_url = player.src;
                player.currentTime = player.duration - 0.1;
            }
            player.play();
        }
        var actualCode = `
        if (document.getElementById('ytd-player')?.getPlayerPromise) {
            document.getElementById('ytd-player').getPlayerPromise().then(player => {
                player.getPlayerResponse()?.adSlots?.forEach(e=>{
                    let triggers = e.adSlotRenderer.fulfillmentContent.fulfilledLayout?.playerBytesAdLayoutRenderer?.layoutExitSkipTriggers;
                    if (!triggers)
                        return
                    triggers.forEach(t=>{
                        player.onAdUxClicked("skip-button", t.skipRequestedTrigger?.triggeringLayoutId)
                    })
                })
            });
        }
        `;
        document.documentElement.setAttribute('onreset', actualCode);
        document.documentElement.dispatchEvent(new CustomEvent('reset'));
        document.documentElement.removeAttribute('onreset');
    }
    return [cached_url, cached_video_url, last_ad_blocked_time];
}

const getKey = () => {
    return 'isytOn';
}