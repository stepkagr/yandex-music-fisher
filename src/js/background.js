// todo: предварительная загрузка страницы может не вызвать это событие
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
        utils.addIconToTab(tab);
    }
});

chrome.pageAction.onClicked.addListener(function (tab) {
    chrome.pageAction.hide(tab.id);
    var pageInfo = utils.getUrlInfo(tab.url);
    if (pageInfo.isPlaylist) {
        yandex.getPlaylist(pageInfo.username, pageInfo.playlistId, function (playlist) {
            playlist.tracks.forEach(function (elem) {
                elem.saveDir = playlist.title;
            });
            downloader.add(playlist.tracks);
        }, function () {
            // ajax transport fail
            utils.addIconToTab(tab);
        });
    } else if (pageInfo.isTrack) {
        yandex.getTrack(pageInfo.trackId, function (track) {
            downloader.add([track]);
        }, function () {
            // ajax transport fail
            utils.addIconToTab(tab);
        });
    } else if (pageInfo.isAlbum) {
        yandex.getAlbum(pageInfo.albumId, function (album) {
            var tracks = [];
            for (var i = 0; i < album.volumes.length; i++) {
                tracks = tracks.concat(album.volumes[i]);
            }
            tracks.forEach(function (elem) {
                elem.saveDir = album.artists[0].name + ' - ' + album.title;
            });
            downloader.add(tracks);
        }, function () {
            // ajax transport fail
            utils.addIconToTab(tab);
        });
    }
});

chrome.downloads.onChanged.addListener(function (delta) {
    chrome.downloads.search({
        id: delta.id
    }, function (downloads) {
        var name = downloads[0].byExtensionName;
        if (!name || name !== 'Yandex Music Fisher') {
            return;
        }
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
});

chrome.runtime.onInstalled.addListener(function (details) {
    // todo: перейти с localStorage на chrome.storage
    if (!localStorage.getItem('downloadThreadCount')) {
        localStorage.setItem('downloadThreadCount', 4);
    }
    chrome.tabs.query({
        url: '*://music.yandex.ru/*'
    }, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            utils.addIconToTab(tabs[i]);
        }
    });
});
