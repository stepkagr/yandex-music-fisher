function clearPath(path) {
    return path.replace(/[\\/:*?"<>|]/g, '_');
}

function download(track, dir) {
    var savePath = clearPath(track.artist + ' - ' + track.title + '.mp3');
    if (dir) {
        savePath = clearPath(dir) + '/' + savePath;
    }
    getTrackURL(track.id, track.storage_dir, function (links) {
        if (links.length) {
            chrome.downloads.download({
                url: links[0],
                filename: savePath
            });
        } else {
            console.error('Не удалось найти ссылки', track);
        }
    });
}

function downloadMultiple(tracks, dir) {
    for (var i = 0; i < 4; i++) { // количество потоков загрузки
        var newTrack = tracks.shift();
        if (!newTrack) {
            return;
        }
        download(newTrack, dir);
    }
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
            download(newTrack, dir);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    content.innerHTML = 'Распознование страницы...';
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        var activeTab = tabs[0];
        var info = getPageInfo(activeTab.url);
        if (!info.isYandexMusic) {
            content.innerHTML = 'Необходимо зайти на music.yandex.ru';
        } else if (info.isPlaylist) {
            content.innerHTML = 'Обнаружен плейлист...';
            getPlaylistInfo(info.user, [info.playlist], function (json) {
                var playlist = json.playlists[0];
                content.innerHTML = 'Плейлист: ' + playlist.title +
                        '<br>Количество треков: ' + playlist.tracks.length +
                        '<br><button id="btn-download-all">Скачать плейлист</button><br><br>';
                getTracksInfo(playlist.tracks, function (json) {
                    for (var i = 0; i < json.tracks.length; i++) {
                        content.innerHTML += '<a href="" class="btn-download" id="' + i + '">'
                                + json.tracks[i].artist + ' - '
                                + json.tracks[i].title + '</a><br>';
                    }
                    document.addEventListener('click', function (e) {
                        if (e.target.className === 'btn-download') {
                            var track = json.tracks[e.target.id];
                            download(track);
                            e.preventDefault();
                        } else if (e.target.id === 'btn-download-all') {
                            downloadMultiple(json.tracks, playlist.title);
                        }
                    });
                });
            });
        } else {
            content.innerHTML = 'Перейдите на страницу плейлиста или композиции.';
        }
    });
});