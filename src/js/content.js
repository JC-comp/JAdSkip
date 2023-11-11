const timeout = 500; 

const hasAds = (adsModule) => {
  adsModule = adsModule[0];
  return adsModule.childElementCount > 0;
}

const SKIP_BUTTON_CLASSES = [
  'ytp-ad-skip-button', 'ytp-ad-skip-button-modern'
];

const clickSkipButtons = (adsModule, name) => {
  var buttons = adsModule.getElementsByClassName(name);
  for (let i = 0; i < buttons.length; i++)
    buttons[i].click();
}

const detector = async (cached_url) => {
  chrome.storage.sync.get('isOn', function(items) {
    var isOn = true;
    if (items.isOn !== undefined)
      isOn = items.isOn;
    try {
      const moviePlayer = document.getElementById('movie_player');
      const videoStream = moviePlayer.getElementsByClassName('video-stream');
      var adsModule = moviePlayer.getElementsByClassName('ytp-ad-module');
      if (isOn && videoStream.length && adsModule.length && hasAds(adsModule)) {
        const player = videoStream[0];
        adsModule = adsModule[0];
        if (isFinite(player.duration) && player.src != cached_url) {
          cached_url = player.src;
          player.currentTime = player.duration - 0.1;
          player.play();
        }
        SKIP_BUTTON_CLASSES.forEach(className => clickSkipButtons(adsModule, className))
        setTimeout(() => detector(cached_url), timeout * 2);
      } else
        setTimeout(() => detector(cached_url), timeout);
    } catch (e) {
      console.log(e);
      setTimeout(() => detector(cached_url), timeout);
    }
  });
}

detector("");