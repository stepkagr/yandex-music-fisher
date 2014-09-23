document.addEventListener('DOMContentLoaded', function () {
    var threadCount = localStorage.getItem('downloadThreadCount');
    if (threadCount) {
        document.getElementById('downloadThreadCount').value = threadCount;
    }
});

document.getElementById('downloadThreadCount').addEventListener('change', function (e) {
    if (e.target.value > 10) {
        e.target.value = 10;
    } else if (e.target.value < 1) {
        e.target.value = 1;
    }
    localStorage.setItem('downloadThreadCount', e.target.value);
});

document.getElementById('btn-log').addEventListener('click', function () {
    chrome.runtime.getBackgroundPage(function (backgroundPage) {
        backgroundPage.log.download();
    });
});
