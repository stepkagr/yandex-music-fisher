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
    if (track.version) {
        track.title += ' (' + track.version + ')';
    }
    var artists = track.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    var savePath = this.clearPath(artists + ' - ' + track.title + '.mp3');
    if (track.saveDir) {
        savePath = track.saveDir + '/' + savePath;
    }
    yandex.getTrackLinks(track.storageDir, function (links) {
        if (links.length) {
            chrome.downloads.download({
                url: links[0],
                filename: savePath
            });
        } else {
            downloader.activeThreadCount--;
            downloader.download();
            console.error('Не удалось найти ссылки', track);
        }
    }, function () {
        // ajax transport fail или json не распарсили
        downloader.activeThreadCount--;
        downloader.download();
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

downloader.downloadAlbum = function (album) {
    // todo: сохранение обложки в папку альбома
    var tracks = [];
    var artists = album.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    if (album.volumes.length > 1) {
        for (var i = 0; i < album.volumes.length; i++) {
            album.volumes[i].forEach(function (track) {
                track.saveDir = downloader.clearPath(artists + ' - ' + album.title) + '/CD' + (i + 1);
            });
            tracks = tracks.concat(album.volumes[i]);
        }
    } else {
        album.volumes[0].forEach(function (track) {
            track.saveDir = downloader.clearPath(artists + ' - ' + album.title);
        });
        tracks = album.volumes[0];
    }
    this.add(tracks);
};

downloader.downloadPlaylist = function (playlist) {
    playlist.tracks.forEach(function (track) {
        track.saveDir = downloader.clearPath(playlist.title);
    });
    this.add(playlist.tracks);
};
