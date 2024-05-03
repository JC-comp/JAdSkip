const INTERVAL_TIMEOUT = 500;
const MUTATE_TIMEOUT = 50;
const MUTATE_INTERVAL = 1000;
const MAX_MUTATE_INTERVAL = MUTATE_INTERVAL / MUTATE_TIMEOUT;

const SKIP_BUTTON_CLASSES = [
    'ytp-ad-skip-button', 'ytp-ad-skip-button-modern'
];

const SKIPPED_ATTR_NAME = 'skipped_listener';

const hasAds = (adsModule) => {
    adsModule = adsModule[0];
    return adsModule.childElementCount > 0;
}

const clickSkipButtons = (adsModule, name) => {
    var buttons = adsModule.getElementsByClassName(name);
    for (let i = 0; i < buttons.length; i++)
        buttons[i].click();
}

const check_ads = (cached_url) => {
    const moviePlayer = document.getElementById('movie_player');
    const videoStream = moviePlayer.getElementsByClassName('video-stream');
    var adsModule = moviePlayer.getElementsByClassName('ytp-ad-module');
    if (videoStream.length && adsModule.length && hasAds(adsModule)) {
        const player = videoStream[0];
        adsModule = adsModule[0];
        if (isFinite(player.duration) && player.src != cached_url) {
            cached_url = player.src;
            player.currentTime = player.duration - 0.1;
            player.play();
        }
        SKIP_BUTTON_CLASSES.forEach(className => clickSkipButtons(adsModule, className))
    }
    return cached_url;
}

const check_interval = (cached_url, current_interval) => {
    console.log("Checking" + current_interval);
    if (current_interval > MAX_MUTATE_INTERVAL)
        return;
    let old_cached_url = cached_url;
    cached_url = check_ads(cached_url);
    if (old_cached_url == cached_url)
        setTimeout(() => check_interval(cached_url, current_interval + 1), MUTATE_TIMEOUT);
}

const video_listener = () => {
    let videos = document.getElementsByTagName('video')
    
    const callback = (mutationList, observer) => {
        mutationList.forEach(mutation => {
            if (mutation.attributeName == "src") {
                check_interval("", 0);
            }
        });
    };

    const observer = new MutationObserver(callback);
    const config = { attributes: true, childList: true, subtree: true };

    for (let i = 0; i < videos.length; i++) {
        let video = videos[i];
        if (video.getAttribute(SKIPPED_ATTR_NAME) == 1)
            continue;
        observer.observe(video, config);
        video.setAttribute(SKIPPED_ATTR_NAME, 1)
    }
}

const detector = async (cached_url) => {
    chrome.storage.sync.get('isOn', function (items) {
        var isOn = true;
        if (items.isOn !== undefined)
            isOn = items.isOn;

        if (isOn) {
            try {
                video_listener();
                cached_url = check_ads(cached_url)
            } catch (e) {
                console.log(e);
            }
        }

        setTimeout(() => detector(cached_url), INTERVAL_TIMEOUT);
    });
}

detector("");