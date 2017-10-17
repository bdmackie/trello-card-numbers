// The polling function
// From: https://davidwalsh.name/javascript-polling
// Usage:
//
// // Usage:  ensure element is visible
// poll(function() {
// 	return document.getElementById('lightbox').offsetWidth > 0;
// }, 2000, 150).then(function() {
//     // Polling done, now do something else!
// }).catch(function() {
//     // Polling timed out, handle the error!
// });
function poll(fn, timeout, interval) {
    var endTime = Number(new Date()) + (timeout || 2000);
    interval = interval || 100;

    var checkCondition = function(resolve, reject) {
        // If the condition is met, we're done! 
        var result = fn();
        if(result) {
            resolve(result);
        }
        // If the condition isn't met but the timeout hasn't elapsed, go again
        else if (Number(new Date()) < endTime) {
            setTimeout(checkCondition, interval, resolve, reject);
        }
        // Didn't match and too much time, reject!
        else {
            reject(new Error('timed out for ' + fn + ': ' + arguments));
        }
    };

    return new Promise(checkCondition);
}

function copyTextToClipboard(text, doc) {
    if (!doc)
        doc = document;
    // Ew....
    // Source http://stackoverflow.com/a/18455088
    var copyFrom = doc.createElement("textarea");
    copyFrom.textContent = text; // Unsure if its ok to refer to cardNumber from params.
    doc.body.appendChild(copyFrom);
    copyFrom.select();
    doc.execCommand('copy');
    doc.body.removeChild(copyFrom);
}

$.fn.addClassOnce = function(className) {
    this.each(function(index, item) {
        if (!$(item).hasClass(className))
            $(item).addClass(className);
    })
};

$.fn.findFirst = function(selector) {
    var $cln = this.find(selector);
    if ($cln.size() == 0)
        return null;
    return $cln.first();
}

function isRegexMatch(regex, test) {
    if (test === undefined) { return false };
    var matches = test.match(regex);
    return matches != null && matches.length !== 0;
}