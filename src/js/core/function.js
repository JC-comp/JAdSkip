const logMessage = (message) => {
    window.postMessage({
        action: 'log',
        origin: 'main',
        message: message
    });
}

const hasAds = (adsModule) => {
    adsModule = adsModule[0];
    return adsModule.childElementCount > 0;
}

const getAdPlayer = () => {
    const moviePlayer = document.getElementById('movie_player');
    logMessage(`moviePlayer: ${moviePlayer ? 'found' : 'not found'}`);
    if (!moviePlayer)
        return null;
    const videoStream = moviePlayer.getElementsByClassName('video-stream');
    var adsModule = moviePlayer.getElementsByClassName('ytp-ad-module');
    logMessage(`videoStream length: ${videoStream.length}, adsModule length: ${adsModule.length}`);
    if (videoStream.length && adsModule.length && hasAds(adsModule)) {
        const player = videoStream[0];
        return player;
    }
    logMessage('No ad player found');
    return null;
}