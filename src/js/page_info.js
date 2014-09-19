var pageInfo = {};
pageInfo.reset = function () {
    this.isYandexMusic = false;
    this.isOldYandexMusic = false;

    this.isPlaylist = false;
    this.playlistId = 0;
    this.username = '';

    this.isTrack = false;
    this.trackId = 0;

    this.isAlbum = false;
    this.albumId = 0;
};
pageInfo.update = function (url) {
    this.reset();
    var parts = url.replace(/\?.*/, '').split('/');
    //["http:", "", "music.yandex.ru", ("#!",) "users", "furfurmusic", "playlists", "1000"]
    this.isYandexMusic = (parts[2] === 'music.yandex.ru');
    if (!this.isYandexMusic) {
        return;
    } else if (parts[3] === '#!') {
        this.isOldYandexMusic = true;
    }
    if (this.isOldYandexMusic) {
        this.isPlaylist = (parts[4] === 'users' && parts[6] === 'playlists' && !!parts[7]);
        this.isTrack = (parts[4] === 'track' && parts[6] === 'album' && !!parts[7]);
        this.isAlbum = (parts[4] === 'album' && !!parts[5]);
        if (this.isPlaylist) {
            this.username = parts[5];
            this.playlistId = parts[7];
        } else if (this.isTrack) {
            this.trackId = parts[5];
        } else if (this.isAlbum) {
            this.albumId = parts[5];
        }
    } else {
        this.isPlaylist = (parts[3] === 'users' && parts[5] === 'playlists' && !!parts[6]);
        this.isTrack = (parts[3] === 'album' && parts[5] === 'track' && !!parts[6]);
        this.isAlbum = (parts[3] === 'album' && !!parts[4]);
        if (this.isPlaylist) {
            this.username = parts[4];
            this.playlistId = parts[6];
        } else if (this.isTrack) {
            this.trackId = parts[6];
        } else if (this.isAlbum) {
            this.albumId = parts[4];
        }
    }
};