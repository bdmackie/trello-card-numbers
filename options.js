function save_options() {
    var bold = document.getElementById('bold').checked;
    var color = document.getElementById('id-color').value;
    var percent = document.getElementById('show-percent').checked;
    var copy = document.getElementById('show-copy').checked;
    chrome.storage.sync.set({
        boldId: bold,
        idColor: color,
        showPercent: percent,
        showCopy: copy
    }, function() {
        window.close();
    });
}

function reset_defaults() {
    document.getElementById('bold').checked = false;
    document.getElementById('show-percent').checked = false;
    document.getElementById('show-copy').checked = false;
    document.getElementById('id-color').color.fromString("#000000");
}

function restore_options() {
    chrome.storage.sync.get({
        boldId: false,
        showCopy: false,
        showPercent: false,
        idColor: "000000"
    }, function(items) {
        document.getElementById('bold').checked = items.boldId;
        document.getElementById('show-percent').checked = items.showPercent;
        document.getElementById('show-copy').checked = items.showCopy;
        document.getElementById('id-color').color.fromString(items.idColor);
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('defaults').addEventListener('click', reset_defaults);
