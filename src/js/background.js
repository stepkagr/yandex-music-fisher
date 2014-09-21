// todo: предварительная загрузка страницы может не вызвать это событие
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
        chrome.pageAction.hide(tabId);
        pageInfo.update(tab.url);
        if (!pageInfo.isYandexMusic) {
            return;
        } else if (pageInfo.isPlaylist) {
            chrome.pageAction.setIcon({
                tabId: tabId,
                path: 'img/green.png'
            });
            chrome.pageAction.show(tabId);
        } else if (pageInfo.isTrack) {
            chrome.pageAction.setIcon({
                tabId: tabId,
                path: 'img/blue.png'
            });
            chrome.pageAction.show(tabId);
        } else if (pageInfo.isAlbum) {
            chrome.pageAction.setIcon({
                tabId: tabId,
                path: 'img/yellow.png'
            });
            chrome.pageAction.show(tabId);
        }
    }
});

chrome.pageAction.onClicked.addListener(function (tab) {
    chrome.pageAction.hide(tab.id);
    pageInfo.update(tab.url);
    if (pageInfo.isPlaylist) {
        yandex.getPlaylistInfo(pageInfo.username, pageInfo.playlistId, function (playlist) {
            playlist.tracks.forEach(function (elem) {
                elem.saveDir = playlist.title;
            });
            downloader.add(playlist.tracks);
        });
    } else if (pageInfo.isTrack) {
        yandex.getTrackInfo(pageInfo.trackId, function (track) {
            downloader.add([track]);
        });
    } else if (pageInfo.isAlbum) {
        yandex.getAlbumInfo(pageInfo.albumId, function (album) {
            var tracks = [];
            for (var i = 0; i < album.volumes.length; i++) {
                tracks = tracks.concat(album.volumes[i]);
            }
            tracks.forEach(function (elem) {
                elem.saveDir = album.artists[0].name + ' - ' + album.title;
            });
            downloader.add(tracks);
        });
    }
});

chrome.downloads.onChanged.addListener(function (delta) {
    if (delta.state) {
        switch (delta.state.current) {
            case 'complete':
            case 'interrupted':
                chrome.downloads.erase({
                    id: delta.id
                });
                downloader.activeThreadCount--;
                downloader.download();
                break;
        }
    } else if (delta.paused) {
        if (delta.paused.current) {
            console.info('Приостановленна загрузка', delta);
        } else {
            console.info('Возобновленна загрузка', delta);
        }
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (!localStorage.getItem('downloadThreadCount')) {
        localStorage.setItem('downloadThreadCount', 4);
    }
});
