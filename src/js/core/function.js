const hasAds = (adsModule) => {
    adsModule = adsModule[0];
    return adsModule.childElementCount > 0;
}

const getAdPlayer = () => {
    const moviePlayer = document.getElementById('movie_player');
    if (!moviePlayer)
        return null;
    const videoStream = moviePlayer.getElementsByClassName('video-stream');
    var adsModule = moviePlayer.getElementsByClassName('ytp-ad-module');
    if (videoStream.length && adsModule.length && hasAds(adsModule)) {
        const player = videoStream[0];
        return player;
    }
    return null;
}