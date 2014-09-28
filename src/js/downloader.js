var downloader = {
    queue: [],
    downloads: [],
    notifications: [],
    activeThreadCount: 0
};

downloader.clearPath = function (path) {
    return path.replace(/[\\/:*?"<>|]/g, '_'); // Windows path illegals
};

downloader.getPrefix = function (i, max) {
    // сделать рекурсивную функцию
    var prefix = '';
    max = max.toString();
    switch (max.length) {
        case 2:
            prefix = (i < 10) ? '0' + i : i;
            break;
        case 3:
            prefix = (i < 10) ? '00' + i : ((i < 100) ? '0' + i : i);
            break;
        case 4:
            prefix = (i < 10) ? '000' + i : ((i < 100) ? '00' + i : ((i < 1000) ? '0' + i : i));
            break;
        default:
            prefix = i;
    }
    return prefix;
};

downloader.download = function () {
    var entity = downloader.queue.shift();
    if (!entity) {
        return;
    }
    switch (entity.type) {
        case 'track':
        case 'album_track':
        case 'playlist_track':
            if (entity.cargo.error) {
                var message = 'Ошибка: ' + entity.cargo.error;
                console.error(message, entity);
                log.addMessage(message);
                downloader.download();
                return;
            }
            downloader.activeThreadCount++;
            var artists = entity.cargo.artists.map(function (artist) {
                return artist.name;
            }).join(', ');
            if (entity.cargo.version) {
                entity.cargo.title += ' (' + entity.cargo.version + ')';
            }
            var savePath = downloader.clearPath(artists + ' - ' + entity.cargo.title + '.mp3');
            if (entity.options) {
                if (entity.options.namePrefix) {
                    savePath = entity.options.namePrefix + ' ' + savePath;
                }
                if (entity.options.saveDir) {
                    savePath = entity.options.saveDir + '/' + savePath;
                }
            }
            yandex.getTrackLinks(entity.cargo.storageDir, function (links) {
                if (links.length) {
                    chrome.downloads.download({
                        url: links[0],
                        filename: savePath,
                        saveAs: false
                    }, function (downloadId) {
                        downloader.downloads[downloadId] = entity;
                    });
                } else {
                    // todo оповещение об ошибке, возможность попробывать снова
                    var message = 'Не удалось найти ссылки';
                    console.error(message, entity);
                    log.addMessage(message);
                    downloader.activeThreadCount--;
                    downloader.download();
                }
            }, function () {
                // todo оповещение об ошибке, возможность попробывать снова
                // ajax transport fail или json не распарсили
                var message = 'Ошибка во время получения URL трека';
                console.error(message, entity);
                log.addMessage(message);
                downloader.activeThreadCount--;
                downloader.download();
            });
            break;
        case 'cover':
            downloader.activeThreadCount++;
            chrome.downloads.download({
                url: entity.cargo.url,
                filename: entity.cargo.filename,
                saveAs: false
            }, function (downloadId) {
                downloader.downloads[downloadId] = entity;
            });
            break;
        default:
            var message = 'Неизвестный тип загрузки: ' + entity.type;
            console.error(message);
            log.addMessage(message);
    }
};

downloader.add = function (type, cargo, options) {
    downloader.queue.push({
        type: type,
        cargo: cargo,
        options: options
    });
    var newThreadCount = localStorage.getItem('downloadThreadCount') - downloader.activeThreadCount;
    for (var i = 0; i < newThreadCount; i++) {
        downloader.download();
    }
};

downloader.downloadTrack = function (track) {
    var notificationId = 'track#' + track.id;
    var artists = track.artists.map(function (artist) {
        return artist.name;
    }).join(', ');

    downloader.add('track', track, {
        notificationId: notificationId
    });

    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'https://' + track.albums[0].coverUri.replace('%%', '100x100'),
        title: 'Загрузка...',
        message: artists + ' - ' + track.title,
        contextMessage: 'Трек (' + utils.bytesToStr(track.fileSize) + ' - ' + utils.durationToStr(track.durationMs) + ')'
    }, function (notificationId) {
    });
};

downloader.downloadAlbum = function (album) {
    var notificationId = 'album#' + album.id;
    var artists = album.artists.map(function (artist) {
        return artist.name;
    }).join(', ');
    if (album.version) {
        album.title += ' (' + album.version + ')';
    }
    var saveDir = downloader.clearPath(artists + ' - ' + album.title);
    var totalSize = 0;
    var totalDuration = 0;

    // todo: после этого создаются лишние потоки загрузки
    downloader.add('cover', {
        url: 'https://' + album.coverUri.replace('%%', localStorage.getItem('albumCoverSize')),
        filename: saveDir + '/cover.jpg'
    });

    if (album.volumes.length > 1) {
        for (var i = 0; i < album.volumes.length; i++) {
            for (var j = 0; j < album.volumes[i].length; j++) {
                var track = album.volumes[i][j];
                totalSize += track.fileSize;
                totalDuration += track.durationMs;
                downloader.add('album_track', track, {
                    saveDir: saveDir + '/CD' + (i + 1),
                    namePrefix: downloader.getPrefix(j + 1, album.volumes[i].length),
                    notificationId: notificationId
                });
            }
        }
    } else {
        for (var i = 0; i < album.volumes[0].length; i++) {
            var track = album.volumes[0][i];
            totalSize += track.fileSize;
            totalDuration += track.durationMs;
            downloader.add('album_track', track, {
                saveDir: saveDir,
                namePrefix: downloader.getPrefix(i + 1, album.volumes[0].length),
                notificationId: notificationId
            });
        }
    }

    chrome.notifications.create(notificationId, {
        type: 'progress',
        iconUrl: 'https://' + album.coverUri.replace('%%', '100x100'),
        title: 'Загрузка (0 из ' + album.trackCount + ')...',
        message: saveDir,
        contextMessage: 'Альбом (' + utils.bytesToStr(totalSize) + ' - ' + utils.durationToStr(totalDuration) + ')',
        progress: 0
    }, function (notificationId) {
        downloader.notifications[notificationId] = {
            trackCount: 0,
            totalTrackCount: album.trackCount
        };
    });
};

downloader.downloadPlaylist = function (playlist) {
    var notificationId = 'playlist#' + playlist.owner.login + '#' + playlist.kind;
    var saveDir = downloader.clearPath(playlist.title);
    var totalSize = 0;
    var totalDuration = 0;

    for (var i = 0; i < playlist.tracks.length; i++) {
        var track = playlist.tracks[i];
        totalSize += track.fileSize;
        totalDuration += track.durationMs;
        downloader.add('playlist_track', track, {
            saveDir: saveDir,
            namePrefix: downloader.getPrefix(i + 1, playlist.tracks.length),
            notificationId: notificationId
        });
    }

    chrome.notifications.create(notificationId, {
        type: 'progress',
        iconUrl: 'https://' + playlist.cover.uri.replace('%%', '100x100'),
        title: 'Загрузка (0 из ' + playlist.tracks.length + ')...',
        message: saveDir,
        contextMessage: 'Плейлист (' + utils.bytesToStr(totalSize) + ' - ' + utils.durationToStr(totalDuration) + ')',
        progress: 0
    }, function (notificationId) {
        downloader.notifications[notificationId] = {
            trackCount: 0,
            totalTrackCount: playlist.tracks.length
        };
    });
};

downloader.onChange = function (delta) {
    var entity = downloader.downloads[delta.id];
    if (!entity || !entity.type) {
        var message = 'Загруженного файла нет в downloader.downloads';
        console.error(message, delta);
        log.addMessage(message);
        return;
    }
    if (delta.state) {
        switch (entity.type) {
            // todo: раздилить state на complete и error
            case 'track':
                chrome.notifications.update(entity.options.notificationId, {
                    title: 'Загрузка завершена'
                }, function (wasUpdated) {
                });
                break;
            case 'album_track':
            case 'playlist_track':
                var nId = entity.options.notificationId;
                downloader.notifications[nId].trackCount++;
                var counter = downloader.notifications[nId];
                if (counter.trackCount === counter.totalTrackCount) {
                    chrome.notifications.update(nId, {
                        type: 'basic',
                        title: 'Загрузка завершена'
                    }, function (wasUpdated) {
                    });
                } else {
                    var progress = Math.round(counter.trackCount / counter.totalTrackCount * 100);
                    chrome.notifications.update(nId, {
                        title: 'Загрузка (' + counter.trackCount + ' из ' + counter.totalTrackCount + ')...',
                        progress: progress
                    }, function (wasUpdated) {
                    });
                }
                break;
            case 'cover':
                break;
        }
        downloader.activeThreadCount--;
//        if (!downloader.queue.length && !downloader.activeThreadCount) {
//            chrome.downloads.show(delta.id);
//        }
        chrome.downloads.erase({
            id: delta.id
        });
        downloader.download();
    }
};
