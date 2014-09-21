var downloader = {
    queue: [],
    activeThreadCount: 0
};

downloader.clearPath = function (path) {
    return path.replace(/[\\/:*?"<>|]/g, '_'); // Windows path illegals
};

downloader.download = function () {
    var track = this.queue.shift();
    if (!track) {
        return;
    }
    if (track.error) {
        console.error('Ошибка: ' + track.error, track);
        this.download();
        return;
    }
    this.activeThreadCount++;
    var artists = track.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    var savePath = this.clearPath(artists + ' - ' + track.title + '.mp3');
    if (track.saveDir) {
        savePath = this.clearPath(track.saveDir) + '/' + savePath;
    }
    yandex.getTrackLinks(track.storageDir, function (links) {
        if (links.length) {
            chrome.downloads.download({
                url: links[0],
                filename: savePath
            });
        } else {
            this.activeThreadCount--;
            this.download();
            console.error('Не удалось найти ссылки', track);
        }
    });
};

downloader.add = function (tracks) {
    // todo: сделать страницу с обзором закачек
    this.queue = this.queue.concat(tracks);
    var newThreadCount = localStorage.getItem('downloadThreadCount') - this.activeThreadCount;
    for (var i = 0; i < newThreadCount; i++) {
        this.download();
    }
};
