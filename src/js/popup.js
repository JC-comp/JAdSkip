document.addEventListener("DOMContentLoaded", () => {
    var checkbox = document.getElementById('status');

    checkbox.addEventListener('change', function() {
      chrome.storage.sync.set({ isOn: this.checked });
    });

    chrome.storage.sync.get('isOn', function(data) {
      if (data.isOn === undefined)
        checkbox.checked = true;
      else
        checkbox.checked = data.isOn;
    });
});
