var LIGHTBOX_SELECTOR = 'window-title';
var CARD_LINK_QUERY_SELECTOR = 'span.list-card-title.js-card-name';
var LIST_NUM_CARDS_CLASS = 'list-header-num-cards';
var LIST_NUM_CARDS_SELECTOR = '.' + LIST_NUM_CARDS_CLASS;
var CARD_SHORT_ID = 'card-short-id';
var CARD_SHORT_ID_SELECTOR = '.' + CARD_SHORT_ID
var SEARCH_RESULT_CARD = 'search-result-card';
var TCN_HEADER = 'trello-card-numbers-detail-header';
var TCN_INLINE = 'trello-card-numbers-inline';
var TCN_INLINE_BLOCK = 'trello-card-numbers-inline-block';
var BOARD_URL_REGEX = /trello\.com\/b\//;
var CARD_URL_REGEX = /trello\.com\/c\//;

function closestWithClass(elem, className) {
    var result = null;
    $(elem).parents().each(function(index, item) {
        if (item.name == 'BODY')
            return false;
        if ($(item).hasClass(className)) {
            result = item;
            return false;
        }
        return true;        
    });
    return result;
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

function addNumberToLightboxWhenReady(cardNumber) {
    poll(
        function() { return $('.' + LIGHTBOX_SELECTOR).length > 0; },
        4000,
        100
    ).then(function() {
        // Check for existing header.
        var header = $('.' + TCN_HEADER);
        if (header.length > 0) {
            header.html(cardNumber);
            return;
        }

        // Insert header.
        var obj = $('.' + LIGHTBOX_SELECTOR).first();
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

function showListNumbers2() {
    $('.' + LIST_NUM_CARDS_CLASS).addClassOnce(TCN_INLINE_BLOCK);

    chrome.storage.sync.get(function(items) {
        $('.' + TCN_INLINE_BLOCK).removeClass("hide");

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

function addPercents() {
    // chrome.storage.sync.get(function(items) {
    //     if (items.showPercent) {
    //         // Get total cards.
    //         var total = 0;
    //         $('.' + TCN_INLINE_BLOCK).each(
    //             function(index, element) { 
    //                 total += parseInt($(element).text(),10)
    //             }
    //         );
            
    //         // Add percent label.
    //         $('.' + TCN_INLINE_BLOCK).each(        
    //             function(index, element) {
    //                 var text = $(element).text();
    //                 if (text.indexOf("(") >= 0)
    //                     text = text.substr(0, text.indexOf("("));            
    //                 text = text.trim() + " (" + (Math.round(parseInt(text,10)*100/total)) + "%)";
    //                 $(element).text(text);
    //             }
    //         )
    //     }
    // });
}

function showCardIds2() {
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
    showListNumbers2();
    showCardIds2();
    //return;
    
    // show card numbers after card is inserted
    var target = document.querySelector('body');
    var config = { attributes: true, childList: true, subtree: true, characterData: true }
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length = 0)
                return;

            var $node = $(mutation.addedNodes[0]);
            if ($node.hasClass(SEARCH_RESULT_CARD) || $node.hasClass(CARD_SHORT_ID)) {
                //debugger;
                // Search or other general display of card.
                showCardIds2();
            
            } else if ($node.hasClass('list-card') && $node.hasClass('js-member-droppable')) {
                //debugger;
                // New card.
                showCardIds2();

                // Add the card id element for a new card if Trello hasn't already.
                var $card = $node.find(CARD_LINK_QUERY_SELECTOR)[0];
                if ($node.has(CARD_SHORT_ID_SELECTOR).length == 0) {
                    // Poll to wait for the url that has the card ID in it.
                    poll(
                        function() { return $node.attr("href"); },
                        4000,
                        100
                    ).then(function(text) {
                        var shortId = document.createElement('span');
                        shortId.innerHTML = '#' + getCardNumberFromUrl(text) + ' ';
                        shortId.className = CARD_SHORT_ID + ' hide trello-card-numbers-inline trello-card-numbers-inline';
                        $card.prepend(shortId);
                    }).catch(function(err) {
                        console.error(err);
                    });
                }
            } else if ($node.hasClass('list')) {
                showListNumbers2();
            }
            //showListNumbers2();
        });
    });

    observer.observe(target,config);

    // // add card number to card details lightbox
    // var id; // must set outside so each click overwrites the last id stored
    // document.body.addEventListener('mouseup', function(e) {
    //     var $target = $(e.target);
    //     var link = getParentLink(e.target);
    //     if (urlMatch(BOARD_URL_REGEX, link) && link !== window.location.href) {
    //         setTimeout(function() { showListNumbers2(); showCardIds2(); }, 1000);
    //     }

    //     var listCard =  closestWithClass(e.target, 'list-card-details') || 
    //         closestWithClass(e.target, SEARCH_RESULT_CARD);
    //     if (listCard) {
    //         var cardId = listCard.querySelectorAll(CARD_SHORT_ID_SELECTOR)[0];
    //         if (cardId) {
    //             id = cardId.innerHTML;
    //             addNumberToLightboxWhenReady(id);
    //         }
    //     }
    // }, true);


    var pageUrl = document.location.href;
    if (urlMatch(CARD_URL_REGEX, pageUrl)) {
        var num = '#' + getCardNumberFromUrl(pageUrl);
        addNumberToLightboxWhenReady(num);
    }

}, false);
