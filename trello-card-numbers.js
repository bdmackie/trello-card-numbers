var CARD_DIALOG_CLASS = 'window-title';
var CARD_LINK_QUERY_SELECTOR = 'span.list-card-title.js-card-name';
var LIST_NUM_CARDS_CLASS = 'list-header-num-cards';
var CARD_SHORT_ID = 'card-short-id';
var CARD_SHORT_ID_SELECTOR = '.' + CARD_SHORT_ID
var SEARCH_RESULT_CARD_CLASS = 'search-result-card';
var TCN_HEADER = 'trello-card-numbers-detail-header';
var TCN_INLINE = 'trello-card-numbers-inline';
var TCN_INLINE_BLOCK = 'trello-card-numbers-inline-block';
var BOARD_URL_REGEX = /trello\.com\/b\//;
var CARD_URL_REGEX = /trello\.com\/c\//;

function hasClass(target, className) {
    className = ' ' + className + ' ';
    if (target.className) {
        return (' ' + target.className + ' ').replace(/[\n\t]/g, ' ').indexOf(className) > -1
    }
    return false;
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
        var $obj = $('.' + CARD_DIALOG_CLASS).first();
        var newHtml = 
            '<h2 class="' + TCN_HEADER + ' quiet" style="display:inline-block; margin-right:10px;"' + 
            '<span>' + cardNumber + '</span>' +
            '</h2>';
        $obj.children().last().before(newHtml);

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

function showListNumbers() {
    $('.' + LIST_NUM_CARDS_CLASS).addClassOnce(TCN_INLINE_BLOCK);

    chrome.storage.sync.get(function(items) {
        $('.' + TCN_INLINE_BLOCK).removeClass("hide").css("display", "inline-block");

        // if (items.showPercent) {
        //     // Get total cards.
        //     var total = 0;
        //     $('.' + TCN_INLINE_BLOCK).each(
        //         function(index, element) { 
        //             total += parseInt($(element).text(),10)
        //         }
        //     );
            
        //     // Add percent label.
        //     $('.' + TCN_INLINE_BLOCK).each(        
        //         function(index, element) {
        //             var text = $(element).text();
        //             if (text.indexOf("(") >= 0)
        //                 text = text.substr(0, text.indexOf("("));            
        //             text = text.trim() + " (" + (Math.round(parseInt(text,10)*100/total)) + "%)";
        //             $(element).text(text);
        //         }
        //     )
        // }
    });
}


function showCardIds() {
    //debugger;
    $('.' + CARD_SHORT_ID).addClassOnce(TCN_INLINE);
    chrome.storage.sync.get(function(items) {
        $('.' + CARD_SHORT_ID).removeClass("hide");
        if (items.boldId)
            $('.' + TCN_INLINE).css("fontWeight", "bold");
        if (items.idColor)
            $('.' + TCN_INLINE).css("color", '#' + items.idColor);
    });    
    $('.' + TCN_INLINE).append(' ');
}

window.addEventListener('load', function() {
    showListNumbers();
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
                    if (hasClass(node, SEARCH_RESULT_CARD_CLASS) || hasClass(node, CARD_SHORT_ID)) {
                        showCardIds();
                    } else if (hasClass(node, 'list-card') && hasClass(node, 'js-member-droppable')) {
                        showCardIds();
                        var $card = $node.find(CARD_LINK_QUERY_SELECTOR)[0];
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
                                $card.prepend(shortId);
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

        var $listCard =  $(e.target).closest('.list-card-details', $('BODY')) || 
            $(e.target).closest('.'+SEARCH_RESULT_CARD_CLASS, $('BODY'));
        if ($listCard) {
            var $cardId = $listCard.findFirst(CARD_SHORT_ID_SELECTOR);
            if ($cardId) {
                id = $cardId.text();
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
