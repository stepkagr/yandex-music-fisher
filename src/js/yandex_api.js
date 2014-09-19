var yandex = {};

yandex.getTrackLinks = function (storageDir, success) {
    var url = '/api/v1.4/jsonp.xml?action=getTrackSrc&p=download-info/'
            + storageDir + '/2.mp3&r=' + Math.random();
    utils.ajaxWrapper(url, function (jsonp) {
        // чистим jsonp до json
        var jsonStr = jsonp.replace(/^[^[]+/, '').replace(/\);$/, '');
        try {
            // json кривой, поэтому извлекаем через eval
            var json = eval(jsonStr)[0];
        } catch (e) {
            console.error('Не удалось распарсить строку', jsonp);
            return;
        }
        var hosts = json['regional-hosts'];
        hosts.push(json.host);

        var md5 = utils.md5('XGRlBW9FXlekgbPrRHuSiA' + json.path.substr(1) + json.s);
        var urlBody = '/get-mp3/' + md5 + '/' + json.ts + json.path;
        var links = hosts.map(function (host) {
            return 'http://' + host + urlBody;
        });
        success(links);
    });
};

yandex.getTrackInfo = function (trackId, success) {
    var url = '/handlers/track.jsx?track=' + trackId
            + '&r=' + Math.random();
    utils.ajaxWrapper(url, function (json) {
        success(json);
    });
};

yandex.getAlbumInfo = function (albumId, success) {
    var url = '/handlers/album.jsx?album=' + albumId
            + '&r=' + Math.random();
    utils.ajaxWrapper(url, function (json) {
        success(json);
    });
};

yandex.getPlaylistInfo = function (username, playlistId, success) {
    var url = '/handlers/playlist.jsx?owner=' + username
            + '&kinds=' + playlistId
            + '&r=' + Math.random();
    utils.ajaxWrapper(url, function (json) {
        success(json.playlist);
    });
};

yandex.setNewSiteVersion = function (success) {
    chrome.cookies.set({
        url: 'https://music.yandex.ru',
        name: 'makeyourownkindofmusic',
        value: 'optin',
        path: '/',
        expirationDate: new Date().getTime() / 1000 + 365 * 86400
    }, success);
};

yandex.setOldSiteVersion = function (success) {
    chrome.cookies.set({
        url: 'https://music.yandex.ru',
        name: 'makeyourownkindofmusic',
        value: 'optout',
        path: '/',
        expirationDate: new Date().getTime() / 1000 + 365 * 86400
    }, success);
};
