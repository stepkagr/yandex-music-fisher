var downloader = {};

downloader.clearPath = function (path) {
    return path.replace(/[\\/:*?"<>|]/g, '_'); // Windows path illegals
};

downloader.download = function (track, dir) {
    if (track.error) {
        console.error('Ошибка: ' + track.error, track);
        return;
    }
    var artists = track.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    var savePath = this.clearPath(artists + ' - ' + track.title + '.mp3');
    if (dir) {
        savePath = this.clearPath(dir) + '/' + savePath;
    }
    yandex.getTrackLinks(track.storageDir, function (links) {
        if (links.length) {
            chrome.downloads.download({
                url: links[0],
                filename: savePath
            });
        } else {
            console.error('Не удалось найти ссылки', track);
        }
    });
};

downloader.downloadMultiple = function (tracks, dir) {
    // todo: сделать страницу с обзором закачек
    // todo: если идёт множественная закачка и добавляется новая - поставить последнюю в очередь
    chrome.downloads.onChanged.addListener(function (downloadDelta) {
        // todo: разобрать ситуацию, когда состояние не 'complete'
        if (downloadDelta.state && downloadDelta.state.current === 'complete') {
            chrome.downloads.erase({
                id: downloadDelta.id
            });
            var newTrack = tracks.shift();
            if (!newTrack) {
                return;
            }
            downloader.download(newTrack, dir);
        }
    });
    // todo: возобновление количества потоков при их потере (следим за ошибками)
    for (var i = 0; i < 4; i++) { // количество потоков загрузки
        var newTrack = tracks.shift();
        if (!newTrack) {
            return;
        }
        this.download(newTrack, dir);
    }
};
