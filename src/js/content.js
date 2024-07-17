const INTERVAL_TIMEOUT = 1000;
const MUTATE_TIMEOUT = 500;
const MUTATE_INTERVAL = 3000;
const MAX_MUTATE_INTERVAL = MUTATE_INTERVAL / MUTATE_TIMEOUT;
const PRE_ADS_WAITING_TIME = 1.1;

const SKIP_BUTTON_CLASSES = [
    'ytp-ad-skip-button', 'ytp-ad-skip-button-modern',
    'ytp-skip-ad-button', 'ytp-skip-ad-button-modern'
];

const SKIPPED_ATTR_NAME = 'skipped_listener';
const EMPTY_CACHED_URL = '';

const hasAds = (adsModule) => {
    adsModule = adsModule[0];
    return adsModule.childElementCount > 0;
}

const clickSkipButtons = (adsModule, name) => {
    var buttons = adsModule.getElementsByClassName(name);
    for (let i = 0; i < buttons.length; i++)
        buttons[i].click();
}

const get_channel_id = () => {
    var channel_id = null;
    var renderer = document.getElementsByTagName('ytd-video-owner-renderer');
    if (renderer.length > 0) {
        renderer = renderer[0];
        var segs = renderer.querySelector('a').href.split('/');
        channel_id = segs[segs.length - 1];
    }
    if (renderer.length == 0) {
        renderer = document.querySelector('span[itemprop="author"] link[itemprop=url]')
        if (renderer) {
            var segs = renderer.href.split('/');
            channel_id = segs[segs.length - 1];
        }
    }
    return channel_id;
}

const check_subscribe = async (callback) => {
    var channel_id = get_channel_id();
    if (channel_id == null) {
        await callback();
    } else {
        chrome.storage.sync.get({subscribes: {}}, async function (result) {
            var subscribes = result.subscribes;
            if (subscribes[channel_id] === true) {
                // pass
            } else {
                await callback();
            }
        });
    }
}

const check_interval = (cached_info, current_interval) => {
    if (current_interval > MAX_MUTATE_INTERVAL)
        return;
    let old_cached_url = cached_info['cached_url'];
    check_subscribe(async () => {
        await check_ads(
            cached_info['cached_url'], cached_info['cached_video_url'], cached_info['last_ad_blocked_time']
        ).then(result=>{
            let [cached_url, cached_video_url, last_ad_blocked_time] = result;
            cached_info['cached_url'] = cached_url;
            cached_info['cached_video_url'] = cached_video_url;
            cached_info['last_ad_blocked_time'] = last_ad_blocked_time;
        })
        
        if (old_cached_url == cached_info['cached_url'])
            setTimeout(
                () => check_interval(
                    cached_info, current_interval + 1
                ), MUTATE_TIMEOUT
            );
    });
}

const video_listener = () => {
    let videos = document.getElementsByTagName('video');
    let cached_info = {
        cached_url: EMPTY_CACHED_URL, 
        cached_video_url: EMPTY_CACHED_URL, 
        last_ad_blocked_time: 0
    }
    const callback = (mutationList, observer) => {
        mutationList.forEach(mutation => {
            if (mutation.attributeName == "src") {
                check_interval(cached_info, 0);
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

const detector = async (cached_url, cached_video_url, last_ad_blocked_time) => {
    let key = getKey();
    chrome.storage.sync.get(key, async function (items) {
        var isOn = true;
        if (items[key] !== undefined)
            isOn = items[key];

        if (isOn) {
            try {
                video_listener();
                await check_subscribe(async () => {
                    await check_ads(cached_url, cached_video_url, last_ad_blocked_time)
                    .then(result=>{
                        [cached_url, cached_video_url, last_ad_blocked_time] = result;
                    })
                })
            } catch (e) {
                console.log(e);
            }
        }

        setTimeout(() => detector(cached_url, cached_video_url, last_ad_blocked_time), INTERVAL_TIMEOUT);
    });
}

detector(EMPTY_CACHED_URL, EMPTY_CACHED_URL, 0);

// render
function toggle(injected) {
    var checkbox = injected.querySelector('#status');
    var channel_id = get_channel_id();
    checkbox.addEventListener('change', function() {
        chrome.storage.sync.get({subscribes: {}}, function (result) {
            var subscribes = result.subscribes;
            subscribes[channel_id] = !checkbox.checked;
            chrome.storage.sync.set({subscribes: subscribes}, function() {
                updateDisplay(injected, channel_id);
            });
        });
    });
    updateDisplay(injected, channel_id);
}

function render() {
    var holder = document.getElementById('subscribe-button');
    if (!holder)
        return;
    var injected = holder.querySelector('.toggle-holder');
    if (injected)
        return
    
    injected = document.createElement('div');
    injected.innerHTML = `<div class="toggle-holder">
        <img id="disabled_img" class="disabled hide" src="chrome-extension://${chrome.runtime.id}/assets/icon-120.png">
        <div class="toggle-switch" style="margin: 0 3px;">
            <label class="switch">
                <input id="status" type="checkbox">
                <span class="slider"></span>
            </label>
        </div>
        <img id="enabled_img"class="hide" src="chrome-extension://${chrome.runtime.id}/assets/icon-120.png">
    </div>`;
    toggle(injected);
    holder.insertBefore(injected, holder.firstChild);
}
setInterval(render, 1000);
