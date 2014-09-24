var downloader = {
    queue: [],
    activeThreadCount: 0
};

downloader.clearPath = function (path) {
    return path.replace(/[\\/:*?"<>|]/g, '_'); // Windows path illegals
};

downloader.download = function () {
    var track = downloader.queue.shift();
    if (!track) {
        return;
    }
    if (track.error) {
        var message = 'Ошибка: ' + track.error;
        console.error(message, track);
        log.addMessage(message);
        downloader.download();
        return;
    }
    downloader.activeThreadCount++;
    if (track.version) {
        track.title += ' (' + track.version + ')';
    }
    var artists = track.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    var savePath = downloader.clearPath(artists + ' - ' + track.title + '.mp3');
    if (track.saveDir) {
        savePath = track.saveDir + '/' + savePath;
    }
    yandex.getTrackLinks(track.storageDir, function (links) {
        if (links.length) {
            chrome.downloads.download({
                url: links[0],
                filename: savePath,
                saveAs: false,
                conflictAction: 'prompt'
            });
        } else {
            var message = 'Не удалось найти ссылки';
            console.error(message, track);
            log.addMessage(message);
            downloader.activeThreadCount--;
            downloader.download();
        }
    }, function () {
        // ajax transport fail или json не распарсили
        downloader.activeThreadCount--;
        downloader.download();
    });
};

downloader.add = function (tracks) {
    // todo: сделать страницу с обзором закачек
    downloader.queue = downloader.queue.concat(tracks);
    var newThreadCount = localStorage.getItem('downloadThreadCount') - downloader.activeThreadCount;
    for (var i = 0; i < newThreadCount; i++) {
        downloader.download();
    }
};

downloader.downloadAlbum = function (album) {
    var tracks = [];
    var artists = album.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    var saveDir = downloader.clearPath(artists + ' - ' + album.title);
    if (album.volumes.length > 1) {
        for (var i = 0; i < album.volumes.length; i++) {
            album.volumes[i].forEach(function (track) {
                track.saveDir = saveDir + '/CD' + (i + 1);
            });
            tracks = tracks.concat(album.volumes[i]);
        }
    } else {
        album.volumes[0].forEach(function (track) {
            track.saveDir = saveDir;
        });
        tracks = album.volumes[0];
    }
    downloader.add(tracks);
    chrome.downloads.download({
        url: 'https://' + album.coverUri.replace('%%', localStorage.getItem('albumCoverSize')),
        filename: saveDir + '/cover.jpg',
        saveAs: false,
        conflictAction: 'prompt'
    });
};

downloader.downloadPlaylist = function (playlist) {
    playlist.tracks.forEach(function (track) {
        track.saveDir = downloader.clearPath(playlist.title);
    });
    downloader.add(playlist.tracks);
};
