var CARD_DIALOG_CLASS = 'window-title';
var CARD_LINK_QUERY_SELECTOR = 'span.list-card-title.js-card-name';
var LIST_NUM_CARDS_CLASS = 'list-header-num-cards';
var CARD_SHORT_ID = 'card-short-id';
var CARD_SHORT_ID_SELECTOR = '.' + CARD_SHORT_ID
var SEARCH_RESULT_CARD = 'search-result-card';
var TCN_HEADER = 'trello-card-numbers-detail-header';
var TCN_INLINE = 'trello-card-numbers-inline';
var TCN_INLINE_BLOCK = 'trello-card-numbers-inline-block';
var BOARD_URL_REGEX = /trello\.com\/b\//;
var CARD_URL_REGEX = /trello\.com\/c\//;

// check that url has been added to card after it is created
// this is done asynchronously a few ms later
function hrefReady(obj) {
    var promise = new Promise(function(resolve,reject) {
        var inc = 40;
        var hrefListener = function(interval) {
            if (obj.getAttribute('href') != undefined) {
                resolve(obj.getAttribute('href'));
            } else {
                interval = interval + 1 || 1;
                if (interval < inc) {
                    setTimeout(function() { hrefListener(interval); }, 100);
                } else {
                    reject('Href timeout error');
                }
            }
        };
        hrefListener();
    });

    return promise;
}

function addClassToArray(arr,klass) {
    var len = arr.length
    for (var i=0; i < len; i++) {
        var obj = arr[i];
        if (!hasClass(obj, klass)) {
            obj.className = obj.className + ' ' + klass;
        }
    };
}

function addStyleToArray(arr,attribute,style) {
    var len = arr.length;
    for (var i=0; i < len; i++) {
        var obj = arr[i];
        obj.style[attribute] = style;
    }
}

function boldifyCardids() {
    arr = getByClass('trello-card-numbers-inline');
    var len = arr.length;
    for (var i=0; i < len; i++) {
        var obj = arr[i];
        obj.style.fontWeight = 'bold';
    }
}

function addClassWithDisplay(selector, newClass, display, callback) {
    return function() {
        var objects = getByClass(selector);
        addClassToArray(objects, newClass);
        objects = getByClass(newClass);
        addStyleToArray(objects, 'display', display);
        chrome.storage.sync.get(function(items) {
            if (selector == CARD_SHORT_ID) {
                if (items.boldId) {
                    addStyleToArray(objects, 'fontWeight', 'bold');
                }
                if (items.idColor) {
                    addStyleToArray(objects, 'color', '#' + items.idColor);
                }
            }
        });
        if (callback) {
            callback(selector);
        }
    };
}

function addTrailingSpace(selector) {
    var objects = getByClass(selector);
    var len = objects.length
    for (var i=0; i < len; i++) {
        var obj = objects[i];
        obj.innerHTML = obj.innerHTML + ' ';
    };
}


function hasClass(target, className) {
    className = ' ' + className + ' ';
    if (target.className) {
        return (' ' + target.className + ' ').replace(/[\n\t]/g, ' ').indexOf(className) > -1
    }
    return false;
}

function getByClass(name) {
    return document.getElementsByClassName(name);
}

function getAncestorBySelector(elem, selector) {
    var node = elem;
    while (node.tagName != 'BODY') {
        if (hasClass(node, selector)) {
            return node;
        }
        if (node.parentNode !== 'undefined') {
            node = node.parentNode;
        } else {
            return null;
        }
    }
}

function getParentLink(elem) {
    var node = elem;
    while (node.tagName != 'BODY') {
        if (node.tagName === 'A') {
            return node.href;
        }
        if (node.parentNode !== 'undefined') {
            node = node.parentNode;
        } else {
            return null;
        }
    }
}

function getCardNumberFromUrl(url) {
    var title = url.split('/');
    var s = title[title.length-1];
    var num = s.substr(0,s.indexOf('-'));
    return num;
}

function modifyCardDialogWhenReady(cardNumber) {
    poll(
        function() { return $('.' + CARD_DIALOG_CLASS).length > 0; },
        4000,
        100
    ).then(function() {
        // Check for existing header.
        var $header = $('.' + TCN_HEADER);
        if ($header.length > 0) {
            $header.html(cardNumber);
            return;
        }

        // Insert header.
        var obj = $('.' + CARD_DIALOG_CLASS).first();
        var newHtml = 
            '<h2 class="' + TCN_HEADER + ' quiet" style="display:inline-block; margin-right:10px;"' + 
            '<span>' + cardNumber + '</span>' +
            '</h2>';
        $(obj).children().last().before(newHtml);

        // Create copy details button.
        chrome.storage.sync.get(function(items) {
            if (!items.showCopy)
                return;
            var $copyButton = $('.button-link.js-copy-card').first();
            var $copyDetailsButton = $('<a class="button-link" href="#">' +
                '<span class="icon-sm icon-card"></span>&nbsp;Copy details</a>');
            $copyDetailsButton.on('click', function() {
                var cardText = $('.js-card-detail-title-input').first().val();
                copyTextToClipboard(cardNumber.trim() + ", " + cardText);
            });
            $copyButton.after($copyDetailsButton);
        });
    }).catch(function(err) {
        console.error(err);
    });
}

function urlMatch(regex, url) {
    if (url === undefined) { return false };
    var matches = url.match(regex);
    return matches != null && matches.length !== 0;
}

window.addEventListener('load', function() {
    var showListNumbers = addClassWithDisplay(LIST_NUM_CARDS_CLASS, TCN_INLINE_BLOCK, 'inline-block', null);
    showListNumbers();
    var showCardIds = addClassWithDisplay(CARD_SHORT_ID, TCN_INLINE, 'inline', addTrailingSpace);
    showCardIds();

    // show card numbers after card is inserted
    var target = document.querySelector('body');
    var config = { attributes: true, childList: true, subtree: true, characterData: true }
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                var node = mutation.addedNodes[0];
                var $node = $(mutation.addedNodes[0]);
                var classes = node.classList;
                if (node.classList) {
                    if (hasClass(node, SEARCH_RESULT_CARD) || hasClass(node, CARD_SHORT_ID)) {
                        showCardIds();
                    } else if (hasClass(node, 'list-card') && hasClass(node, 'js-member-droppable')) {
                        showCardIds();
                        var card = node.querySelectorAll(CARD_LINK_QUERY_SELECTOR)[0];
                        var duplicateCheck = node.querySelectorAll(CARD_SHORT_ID_SELECTOR).length > 0;
                        if (!duplicateCheck) {
                            // Poll to wait for the url that has the card ID in it.
                            poll(
                                function() { return $node.attr("href"); },
                                4000,
                                100
                            ).then(function(href) {
                                var shortId = document.createElement('span');
                                shortId.innerHTML = '#' + getCardNumberFromUrl(href) + ' ';
                                shortId.className = CARD_SHORT_ID + ' hide trello-card-numbers-inline trello-card-numbers-inline';
                                $(card).prepend(shortId);
                            }).catch(function(err) {
                                console.error(err);
                            });
                        }                        
                    } else if (classes.contains('list')) {
                        showListNumbers();
                    }
                }
            }
        });
    });

    observer.observe(target,config);

    // add card number to card details lightbox
    var id; // must set outside so each click overwrites the last id stored
    document.body.addEventListener('mouseup', function(e) {
        var link = getParentLink(e.target);
        if (urlMatch(BOARD_URL_REGEX, link) && link !== window.location.href) {
            setTimeout(function() { showListNumbers(); showCardIds(); }, 1000);
        }

        var listCard =  getAncestorBySelector(e.target, 'list-card-details') || getAncestorBySelector(e.target, SEARCH_RESULT_CARD);
        if (listCard) {
            var cardId = listCard.querySelectorAll(CARD_SHORT_ID_SELECTOR)[0];
            if (cardId) {
                id = cardId.innerHTML;
                modifyCardDialogWhenReady(id);
            }
        }
    }, true);


    var pageUrl = document.location.href;
    if (urlMatch(CARD_URL_REGEX, pageUrl)) {
        var num = '#' + getCardNumberFromUrl(pageUrl);
        modifyCardDialogWhenReady(num);
    }
}, false);
