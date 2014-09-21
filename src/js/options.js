document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('downloadThreadCount').value = localStorage.getItem('downloadThreadCount');
});

document.getElementById('save').addEventListener('click', function () {
    var downloadThreadCount = document.getElementById('downloadThreadCount').value;
    localStorage.setItem('downloadThreadCount', downloadThreadCount);
    var status = document.getElementById('status');
    status.textContent = 'Настройки сохранены.';
    setTimeout(function () {
        status.textContent = '';
    }, 750);
});
