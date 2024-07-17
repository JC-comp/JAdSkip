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
        if (isFinite(player.duration) && player.src != cached_url) {
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
        SKIP_BUTTON_CLASSES.forEach(className => clickSkipButtons(adsModule, className))
    }
    return [cached_url, cached_video_url, last_ad_blocked_time];
}

const getKey = () => {
    return 'isytmOn';
}
