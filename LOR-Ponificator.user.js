// ==UserScript==
// @name        LOR-Ponificator
// @namespace   LOR
// @description LINUX.ORG.RU avatars ponificator
// @include     http://*.linux.org.ru/*
// @include     https://*.linux.org.ru/*
// @version     1.2.4
// @installURL  https://github.com/unclechu/lor-ponificator/raw/master/LOR-Ponificator.user.js
// @homepage    https://github.com/unclechu/lor-ponificator
// ==/UserScript==

$(function () {
    // Configs
    var avatarsDatabaseURL = 'https://raw.github.com/unclechu/lor-ponificator/master/avatars_database.js';
    var excludePacksID = [ /* "bronyland_goodies_avatars_antagonist" */ ];
    var excludeURLs = [ /* "http://bronyland.com/goodies/avatars/antagonist/discord_avatar_001.png" */ ];
    var onlyPackID = [ /* "bronyland_goodies_avatars_applejack" */ ];

    var avatarsDatabase = null; // remote database
    var ponifiedUsers = [];
    var avatarsURLs = [];
    var randomPonifyUnponified = false;
    var excludeBroniesFromRandomPonifyUnponified = null; // remote database

    $.lor_ponificator_avatars_database_callback = function (jsonObject) {
        avatarsDatabase = jsonObject;
    };

    // Put here raw source of "avatarsDatabaseURL" for cache avatars database
    //
    // ...HERE...
    //
   
    // (c) https://developer.mozilla.org/en-US/docs/Web/API/window.btoa
    function utf8_to_b64( str ) {
        return window.btoa(unescape(encodeURIComponent( str )));
    }

    // (c) https://developer.mozilla.org/en-US/docs/Web/API/window.btoa
    function b64_to_utf8( str ) {
        return decodeURIComponent(escape(window.atob( str )));
    }

    function setCookie(name, str) {
        name = name.replace(/[^a-zA-Z0-9_-]/g, '');
        if (name.length < 1) throw new Error('Empty cookie name');
        var date = new Date();
        date.setDate(date.getDate() + 365);
        document.cookie = name +'='+ utf8_to_b64(str)
            +'; path=/; expires='+ date.toUTCString();
    }

    // Exception
    function CookieNotFoundError(message) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.call(this);
        this.name = this.constructor.name;
        this.message = message || 'Cookie not found';
    }

    function getCookie(name) {
        name = name.replace(/[^a-zA-Z0-9_-]/g, '');
        if (name.length < 1) throw new Error('Empty cookie name');
        var reg = new RegExp('[^a-zA-Z0-9_-]*'+ name +'=([^; ]*)');
        var matches = document.cookie.match(reg);
        if (matches === null)
            throw new CookieNotFoundError('Cookie "'+name+'" not found');
        return b64_to_utf8(matches[1]);
    }

    // Check ponified avatars cookie
    try {
        ponifiedUsers = getCookie('lor_ponificator_ponified_users_avatars');
        try {
            ponifiedUsers = JSON.parse(ponifiedUsers);
        } catch (err) {
            ponifiedUsers = [];
        }
    } catch (err) {
        if ( ! (err instanceof CookieNotFoundError)) throw err;
    }

    try {
        randomPonifyUnponified = getCookie('lor_ponificator_random_ponify_unponified');
        if (randomPonifyUnponified == '1') {
            randomPonifyUnponified = true;
        } else {
            randomPonifyUnponified = false;
        }
    } catch (err) {
        if ( ! (err instanceof CookieNotFoundError)) throw err;
        randomPonifyUnponified = false;
    }

    // (c) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function getRandomAvaURL() {
        return avatarsURLs[ getRandomInt( 0, avatarsURLs.length-1 ) ];
    }

    /**
     * side param possible values:
     *  'prev'
     *  'next'
     *  'rand'
     */
    function rotateAvatar(username, side, target) {
        var userAvaURL = null;
        var userIndex = -1;
        for (var i=0; i<ponifiedUsers.length; i++) {
            if (ponifiedUsers[i].user == username) {
                userAvaURL = ponifiedUsers[i].avurl;
                userIndex = i;
            }
        }

        if (userAvaURL === null) throw new Error('Username "'+ username +'" not found');

        if (target instanceof $) {
            userAvaURL = $(target).attr('src');
        }

        if (side !== 'rand') {
            for (var i=0; i<avatarsURLs.length; i++) {
                if (avatarsURLs[i] == userAvaURL) {
                    var newAvaIndex;

                    if (side === 'prev') {
                        if (i-1 < 0)
                            newAvaIndex = avatarsURLs.length-1;
                        else
                            newAvaIndex = i-1;
                    } else if (side === 'next') {
                        if (i+1 >= avatarsURLs.length)
                            newAvaIndex = 0;
                        else
                            newAvaIndex = i+1;
                    } else {
                        throw new Error('Incorrect side of avatar rotating');
                    }

                    if (target instanceof $) {
                        $(target).attr('src', avatarsURLs[newAvaIndex]);
                        return;
                    }

                    ponifiedUsers[userIndex].avurl = avatarsURLs[newAvaIndex];
                    setCookie(
                        'lor_ponificator_ponified_users_avatars',
                        JSON.stringify(ponifiedUsers)
                    );
                    updateAvatars();
                    return;
                }
            }
        }
        
        // if avatar url not found in database or side is 'rand' - set random avatar
        if (target instanceof $) {
            $(target).attr('src', getRandomAvaURL());
            return;
        }
        ponifiedUsers[userIndex].avurl = getRandomAvaURL();
        setCookie(
            'lor_ponificator_ponified_users_avatars',
            JSON.stringify(ponifiedUsers)
        );
        updateAvatars();
    }

    /**
     * Add username to ponified cookie and ponify his avatar!
     */
    function ponifyUsername(username) {
        var avatarURL = getRandomAvaURL();

        ponifiedUsers.push({ user: username, avurl: avatarURL });
        setCookie('lor_ponificator_ponified_users_avatars', JSON.stringify(ponifiedUsers));

        updateAvatars();
    }

    function unponifyUsername(username) {
        var newUsersList = [];
        ponifiedUsers.forEach(function (val) {
            if (val.user === username) return;
            newUsersList.push(val);
        });
        ponifiedUsers = newUsersList;
        setCookie('lor_ponificator_ponified_users_avatars', JSON.stringify(ponifiedUsers));

        updateAvatars();
    }

    /**
     * this - DOM-element
     */
    function catchUsername() {
        var username;
        var usernameIndex = false;

        if (this instanceof String) {
            var username = this.toString();
            ponifiedUsers.forEach(function (user, index) {
                if (user.user == username) usernameIndex = index;
            });

            if (usernameIndex === false) {
                throw new Error('Username "'+ username +'" not found');
            }

            return {
                name: username,
                index: usernameIndex
            };
        }

        // topic view
        if ($(this).closest('div.msg-container').size() > 0) {
            if ($(this).closest('article[id^=topic]').size() > 0) {
                username = $(this).closest('div.msg-container').find('footer div.sign > a');
            } else {
                username = $(this).closest('div.msg-container').find('div.sign > a');
            }

        // profile page
        } else if ($(this).closest('#bd').find('div.vcard span.nickname').size() > 0) {
            username = $(this).closest('#bd').find('div.vcard span.nickname');

        // anything else
        } else {
            throw new Error('Username not found');
        }

        if (username.size() > 0) {
            username = username.text();
        } else {
            username = 'anonymous';
        }

        ponifiedUsers.forEach(function (user, index) {
            if (user.user == username) usernameIndex = index;
        });

        return {
            name: username,
            index: usernameIndex
        };
    }

    /**
     * this - DOM-element
     */
    function catchOriginalAvatar() {
        var originalAvatarURL = null;

        var $img = $(this)
            .closest('div.userpic')
            .find('img:not(.lor_ponificator_ponified_avatar)');

        if ($img.size() > 0) {
            originalAvatarURL = $img.attr('src');
        }

        return originalAvatarURL;
    }
    
    var tempUsers = [];
    function updateAvatars(preDatabase) {
        $('div.userpic').each(function () {
            var user = catchUsername.call(this);

            if (user.index === false) {
                if (preDatabase) return;
                var userRandomPonifyExcluded = false;
                if (randomPonifyUnponified) {
                    for (var i=0; i<excludeBroniesFromRandomPonifyUnponified.length; i++) {
                        if (user.name == excludeBroniesFromRandomPonifyUnponified[i]) {
                            userRandomPonifyExcluded = true;
                        }
                    }
                }

                if ( ! randomPonifyUnponified || userRandomPonifyExcluded) {
                    $(this).find('img:not(.lor_ponificator_ponified_avatar)').show();
                    $(this).find('img.lor_ponificator_ponified_avatar').remove();
                    $(this).find('span.lor_ponificator_third_line').hide();
                } else {
                    $(this).find('img:not(.lor_ponificator_ponified_avatar)').hide();
                    $(this).find('span.lor_ponificator_third_line').show();
                }

                $(this).find('span.lor_ponificator_ponify_avatar')
                    .show()
                    .text('PONIFY!')
                    .attr('title', 'Ponify avatar of this username');
                $(this).find('span.lor_ponificator_change_avatar').hide();
                $(this).find('span.lor_ponificator_list_avatar').hide();

                // random ponification
                if (randomPonifyUnponified && ! userRandomPonifyExcluded) {
                    var index = null;
                    for (var i=0; i<tempUsers.length; i++) {
                        if (tempUsers[i].user == user.name) {
                            index = i;
                        }
                    }

                    if (index === null) {
                        tempUsers.push({
                            user: user.name,
                            avurl: getRandomAvaURL()
                        });
                        index = tempUsers.length-1;
                    }

                    var $ponifiedAvatar = $(this).find('img.lor_ponificator_ponified_avatar');
                    if ($ponifiedAvatar.size() > 0) {
                        $ponifiedAvatar.attr('src', tempUsers[index].avurl);
                    } else {
                        $(this).find('img:not(.lor_ponificator_ponified_avatar)')
                            .after('<img alt="Ponies everywhere" src="'
                                + tempUsers[index].avurl
                                +'" class="lor_ponificator_ponified_avatar photo" />');
                    }
                }
            } else {
                var $ava = $(this).find('img:not(.lor_ponificator_ponified_avatar)');
                $ava.hide();
                if ($(this).find('img.lor_ponificator_ponified_avatar').size() < 1) {
                    $ava.after('<img alt="Ponies everywhere" src="'
                        + ponifiedUsers[user.index].avurl
                        +'" class="lor_ponificator_ponified_avatar photo" />');
                } else {
                    $(this).find('img.lor_ponificator_ponified_avatar')
                        .attr('src', ponifiedUsers[user.index].avurl)
                        .show();
                }
                if (preDatabase) return;

                $(this).find('span.lor_ponificator_ponify_avatar')
                    .show()
                    .text('UNPONIFY')
                    .attr('title', 'Unponify avatar of this username');
                $(this).find('span.lor_ponificator_change_avatar').show();
                $(this).find('span.lor_ponificator_list_avatar').show();
                $(this).find('span.lor_ponificator_third_line').hide();
            }
        });
    }

    function avatarPonifyCallback() {
        var user = catchUsername.call(this);
        if (user.index === false)
            ponifyUsername(user.name);
        else
            unponifyUsername(user.name);
    }

    function prevAvatarCallback(target) {
        var user = catchUsername.call(this);
        if (user.index !== false) rotateAvatar(user.name, 'prev', target);
    }

    function nextAvatarCallback(target) {
        var user = catchUsername.call(this);
        if (user.index !== false) rotateAvatar(user.name, 'next', target);
    }

    function randAvatarCallback(target) {
        var user = catchUsername.call(this);
        if (user.index !== false) rotateAvatar(user.name, 'rand', target);
    }

    function urlAvatarCallback(target) {
        var user = catchUsername.call(this);
        if (user.index !== false) {
            var oldURL;
            if (target instanceof $) {
                oldURL = $(target).attr('src');
            } else {
                oldURL = ponifiedUsers[user.index].avurl;
            }
            var avatarURL = prompt('Paste avatar URL', oldURL);
            if ( ! avatarURL || avatarURL == ''
            || avatarURL.match(/^http[s]?:\/\/$/)) return;

            if (target instanceof $) {
                $(target).attr('src', avatarURL);
                return;
            }

            ponifiedUsers[user.index].avurl = avatarURL;
            setCookie(
                'lor_ponificator_ponified_users_avatars',
                JSON.stringify(ponifiedUsers)
            );
            updateAvatars();
        }
    }

    var popupStylesLoaded = false;

    function popupCloserCallback() {
        $('div[class^=lor_ponificator_popup]').remove();
    }
    
    function showPopup(htmlCode) {
        if ( ! popupStylesLoaded) {
            var style = document.createElement('style');
            style.type = 'text/css';
            var css = ''
                +'div.lor_ponificator_popup_bg {'
                    +'display: block;'
                    +'background: #272c2d;'
                    +'position: fixed;'
                    +'left: 0; top: 0;'
                    +'width: 100%;'
                    +'height: 100%;'
                    +'z-index: 99991;'
                    +'opacity: 0.9;'
                +'}'
                +'div.lor_ponificator_popup_content {'
                    +'display: table-cell;'
                    +'position: fixed;'
                    +'width: 80%;'
                    +'height: 80%;'
                    +'left: 10%;'
                    +'top: 10%;'
                    +'overflow: auto;'
                    +'z-index: 99992;'
                +'}'
                +'div.lor_ponificator_popup_closer {'
                    +'display: block;'
                    +'position: fixed;'
                    +'top: 2%;'
                    +'right: 2%;'
                    +'z-index: 99999;'
                    +'cursor: pointer;'
                    +'text-decoration: underline;'
                +'}'
                +'div.lor_ponificator_popup_closer:hover {'
                    +'color: white;'
                +'}'
                +'div.lor_ponificator_popup_closer:before {'
                    +'content: "[X]";'
                    +'margin-right: 7px;'
                +'}'

                +'span.lor_ponificator_list_ok,'
                +'span.lor_ponificator_list_unponify,'
                +'span.lor_ponificator_list_prev_avatar,'
                +'span.lor_ponificator_list_next_avatar,'
                +'span.lor_ponificator_list_rand_avatar,'
                +'span.lor_ponificator_list_url_avatar,'
                +'span.lor_ponificator_list_cancel,'
                +'span.lor_ponificator_ponified_list_unponify,'
                +'span.lor_ponificator_ponified_list_prev_avatar,'
                +'span.lor_ponificator_ponified_list_next_avatar,'
                +'span.lor_ponificator_ponified_list_rand_avatar,'
                +'span.lor_ponificator_ponified_list_url_avatar,'
                +'span.lor_ponificator_ponified_list_list_avatar {'
                    +'text-decoration: underline;'
                    +'cursor: pointer;'
                    +'margin-right: 7px;'
                +'}'
                +'span.lor_ponificator_list_ok:hover,'
                +'span.lor_ponificator_list_unponify:hover,'
                +'span.lor_ponificator_list_prev_avatar:hover,'
                +'span.lor_ponificator_list_next_avatar:hover,'
                +'span.lor_ponificator_list_rand_avatar:hover,'
                +'span.lor_ponificator_list_url_avatar:hover,'
                +'span.lor_ponificator_list_cancel:hover,'
                +'span.lor_ponificator_ponified_list_unponify:hover,'
                +'span.lor_ponificator_ponified_list_prev_avatar:hover,'
                +'span.lor_ponificator_ponified_list_next_avatar:hover,'
                +'span.lor_ponificator_ponified_list_rand_avatar:hover,'
                +'span.lor_ponificator_ponified_list_url_avatar:hover,'
                +'span.lor_ponificator_ponified_list_list_avatar:hover {'
                    +'color: white;'
                +'}'

                +'div.lor_ponificator_avatar_preview,'
                +'div.lor_ponificator_avatar_original {'
                    +'position: fixed;'
                    +'top: 15%;'
                    +'right: 15%;'
                    +'z-index: 100;'
                +'}'
                +'div.lor_ponificator_avatar_preview img,'
                +'div.lor_ponificator_avatar_original img,'
                +'img.lor_ponificator_original_avatar_only {'
                    +'max-width: 150px;'
                +'}'
                +'div.lor_ponificator_avatar_preview {'
                    +'padding-right: 170px;'
                    +'z-index: 50;'
                +'}'

                +'ol.lor_ponificator_list_items {'
                    +'margin-bottom: 15px;'
                +'}'
                +'ol.lor_ponificator_list_items span {'
                    +'text-decoration: underline;'
                    +'cursor: pointer;'
                +'}'
                +'ol.lor_ponificator_list_items span:hover {'
                    +'color: white;'
                +'}'
                +'ol.lor_ponificator_list_items span.active {'
                    +'font-weight: bold;'
                    +'color: white;'
                +'}'
                +'ol.lor_ponificator_list_items ol {'
                    +'margin-left: 20px;'
                    +'margin-bottom: 10px;'
                +'}'

                +'form.lor_ponificator_control_checkboxes {'
                    +'margin-bottom: 20px;'
                +'}'
                +'ul.lor_ponificator_ponified_list_control li {'
                    +'margin-bottom: 20px;'
                    +'line-height: 80px;'
                +'}'
                +'img.lor_ponificator_ponified_list_avatar {'
                    +'max-width: 80px;'
                    +'vertical-align: top;'
                    +'margin-right: 20px;'
                +'}'
                +'span.lor_ponificator_ponified_list_username {'
                    +'padding-right: 20px;'
                +'}'
                ;
            $(style).html(css);
            $(document.head).append(style);
            popupStylesLoaded = true;
        }

        var appendCode = ''
            +'<div class="lor_ponificator_popup_bg">'
            +'</div>'
            +'<div class="lor_ponificator_popup_content">'
                + htmlCode
            +'</div>'
            +'<div class="lor_ponificator_popup_closer">CLOSE</div>'
            ;

        $(document.body).append(appendCode);

        $('div.lor_ponificator_popup_closer').click(popupCloserCallback);
    }

    function listCallback(controlCallbackAfterClose) {
        var user = catchUsername.call(this);
        if (user.index === false) throw new Error('Username not found');

        var menu = ''
            +'<p><span class="lor_ponificator_list_ok" title="Apply changes">OK</span>'
            +'<span class="lor_ponificator_list_unponify" title="Unponify this user">UNPONIFY</span>'
            +'<span class="lor_ponificator_list_prev_avatar" title="Previous avatar">←</span>'
            +'<span class="lor_ponificator_list_next_avatar" title="Next avatar">→</span>'
            +'<span class="lor_ponificator_list_rand_avatar" title="Random avatar">RANDOM</span>'
            +'<span class="lor_ponificator_list_url_avatar" title="Set cutsom avatar URL">URL</span>'
            +'<span class="lor_ponificator_list_cancel" title="Discard changes and close">CANCEL</span></p>'
            ;

        function setActive() {
            var $ava = $('div.lor_ponificator_avatar_preview img');
            $('ol.lor_ponificator_list_items li span').removeClass('active');
            $('ol.lor_ponificator_list_items li span').each(function () {
                if ($ava.attr('src') == $(this).html()) {
                    $(this).addClass('active').closest('li.pack')
                        .find('> span').addClass('active');
                }
            });
        }

        /**
         * this - DOM element
         */
        function listElementCallback() {
            var $parentLi = $(this).parent('li');
            if ($parentLi.hasClass('pack')) {
                var $subList = $parentLi.children('ol');
                if ($subList.filter(':visible').size() > 0)
                    $subList.hide();
                else
                    $subList.show();
            } else {
                var url = $(this).html();
                $(this)
                    .closest('div.lor_ponificator_popup_content')
                    .find('div.lor_ponificator_avatar_preview img')
                    .attr('src', url);
                setActive();
            }
        }

        function okCallback() {
            ponifiedUsers[user.index].avurl = $(this)
                .closest('div.lor_ponificator_popup_content')
                .find('div.lor_ponificator_avatar_preview img')
                .attr('src');
            setCookie(
                'lor_ponificator_ponified_users_avatars',
                JSON.stringify(ponifiedUsers)
            );
            updateAvatars();
            popupCloserCallback();
            if (controlCallbackAfterClose) {
                controlCallback();
            }
        }

        var list = '<ol class="lor_ponificator_list_items">';
        avatarsDatabase.avatars_database.forEach(function (item) {
            if (typeof item.pack === 'boolean' && item.pack === true) {
                var subItemsCode = '';

                for (var i=0; i<excludePacksID.length; i++) {
                    if (item.pack_id == excludePacksID[i]) {
                        return;
                    }
                }
                if (onlyPackID.length > 0) {
                    var packCatched = false;
                    onlyPackID.forEach(function (packID) {
                        if (packID == item.pack_id) {
                            packCatched = true;
                        }
                    });
                    if (!packCatched) return;
                }
                item.list.forEach(function (subItem) {
                    for (var i=0; i<excludeURLs.length; i++) {
                        if (subItem.url == excludeURLs[i]) {
                            return;
                        }
                    }
                    subItemsCode += '<li><span>'+ subItem.url +'</span></li>';
                });
                if (typeof item.url_prefix === 'string') {
                    item.list_prefixed.forEach(function (subItem) {
                        var url = item.url_prefix + subItem.file;
                        for (var i=0; i<excludeURLs.length; i++) {
                            if (url == excludeURLs[i]) {
                                return;
                            }
                        }
                        subItemsCode += '<li><span>'+ url +'</span></li>';
                    });
                }
                if (subItemsCode !== '') {
                    list += '<li class="pack">';
                    list += 'Pack • <span>'+ item.pack_id +'</span>';
                    list += '<ol>'+ subItemsCode +'</ol>';
                    list += '</li>';
                }
            } else {
                if (onlyPackID.length > 0) return;
                for (var i=0; i<excludeURLs.length; i++) {
                    if (item.url == excludeURLs[i]) {
                        return;
                    }
                }
                list += '<li><span>'+ item.url +'</span></li>';
            }
        });
        list += '</ol>';

        var htmlCode = ''
            +'<h2>Choose avatar from list for user "'+ user.name +'"</h2>'
            +'<div class="lor_ponificator_avatar_preview">'
                +'<p>Ponified:</p>'
                +'<img alt="Ponies everywhere" src="'
                + ponifiedUsers[user.index].avurl +'" /></div>'
            ;

        var originalAvatar = catchOriginalAvatar.call(this);
        if (originalAvatar)
            htmlCode += ''
                +'<div class="lor_ponificator_avatar_original">'
                    +'<p>Original:</p>'
                    +'<img alt="Original avatar" src="'
                    + originalAvatar +'" /></div>'

        htmlCode += ''
            + menu
            + list
            + menu
            ;

        showPopup(htmlCode);

        $('span.lor_ponificator_list_cancel').click(function () {
            popupCloserCallback();
            if (controlCallbackAfterClose) {
                controlCallback();
            }
        });
        $('span.lor_ponificator_list_ok').click(okCallback);
        var usernameThis = new String(user.name);
        var $target = $('div.lor_ponificator_avatar_preview img');
        $('span.lor_ponificator_list_unponify').click(function () {
            unponifyUsername(user.name);
            popupCloserCallback();
        });
        $('span.lor_ponificator_list_prev_avatar').click(function () {
            prevAvatarCallback.call(usernameThis, $target);
            setActive();
        });
        $('span.lor_ponificator_list_next_avatar').click(function () {
            nextAvatarCallback.call(usernameThis, $target);
            setActive();
        });
        $('span.lor_ponificator_list_rand_avatar').click(function () {
            randAvatarCallback.call(usernameThis, $target);
            setActive();
        });
        $('span.lor_ponificator_list_url_avatar').click(function () {
            urlAvatarCallback.call(usernameThis, $target);
            setActive();
        });
        setActive();
        $('ol.lor_ponificator_list_items li.pack ol').hide();
        $('ol.lor_ponificator_list_items span').click(listElementCallback);
    }

    function controlCallback() {
        var checkboxesCode = ''
            +'<form class="lor_ponificator_control_checkboxes">'
                +'<label>'
                    +'<input type="checkbox" class="lor_ponificator_control_random_ponify_unponified" /> '
                    +'Random ponify unponified users avatars'
                +'</label>'
            +'</form>'
            ;

        var htmlCode = ''
            +'<h2>LOR-Ponificator advanced control</h2>'
            + checkboxesCode
            +'<h3>Ponified users avatars list</h3>'
            ;

        var firstBuildList = true;
        var rebuildList = function () {};

        function getUsernameThis() {
            return new String($(this).closest('li')
                .find('span.lor_ponificator_ponified_list_username a')
                .html());
        }

        function initButtons() {
            $('span.lor_ponificator_ponified_list_unponify').click(function () {
                unponifyUsername(getUsernameThis.call(this).toString());
                rebuildList();
            });
            $('span.lor_ponificator_ponified_list_prev_avatar').click(function () {
                prevAvatarCallback.call(getUsernameThis.call(this));
                rebuildList();
            });
            $('span.lor_ponificator_ponified_list_next_avatar').click(function () {
                nextAvatarCallback.call(getUsernameThis.call(this));
                rebuildList();
            });
            $('span.lor_ponificator_ponified_list_rand_avatar').click(function () {
                randAvatarCallback.call(getUsernameThis.call(this));
                rebuildList();
            });
            $('span.lor_ponificator_ponified_list_url_avatar').click(function () {
                urlAvatarCallback.call(getUsernameThis.call(this));
                rebuildList();
            });
            $('span.lor_ponificator_ponified_list_list_avatar').click(function () {
                popupCloserCallback();
                listCallback.call(getUsernameThis.call(this), true);
            });
        }

        rebuildList = function () {
            var code = '';
            if (firstBuildList) {
                code += '<ul class="lor_ponificator_ponified_list_control">';
            }
            ponifiedUsers.forEach(function (user, index) {
                code += '<li>'
                    +'<img alt="Ponies everywhere" src="'
                        + user.avurl
                        +'" class="lor_ponificator_ponified_list_avatar" />'
                    +'<span class="lor_ponificator_ponified_list_username">'
                        +'<a href="http://www.linux.org.ru/people/'
                            + user.user
                            +'/profile" title=\'Go to "'
                            + user.user +'" profile page\'>'
                            + user.user
                            +'</a></span>'
                    +'<span class="lor_ponificator_ponified_list_unponify" title="Unponify this user">UNPONIFY</span>'
                    +'<span class="lor_ponificator_ponified_list_prev_avatar" title="Previous avatar">←</span>'
                    +'<span class="lor_ponificator_ponified_list_next_avatar" title="Next avatar">→</span>'
                    +'<span class="lor_ponificator_ponified_list_rand_avatar" title="Random avatar">RANDOM</span>'
                    +'<span class="lor_ponificator_ponified_list_url_avatar" title="Set cutsom avatar URL">URL</span>'
                    +'<span class="lor_ponificator_ponified_list_list_avatar" title="Choose avatar from list">LIST</span>'
                    +'</li>';
            });
            if (ponifiedUsers.length < 1) {
                code += '<li>Ponified list is empty…</li>';
            }
            if (firstBuildList) {
                code += '</ul>';
                firstBuildList = false;
                return code;
            }
            $('ul.lor_ponificator_ponified_list_control').html(code);
            initButtons();
        }

        htmlCode += rebuildList();
        showPopup(htmlCode);
        initButtons();

        $('form.lor_ponificator_control_checkboxes '
            +'input[type=checkbox].lor_ponificator_control_random_ponify_unponified')
            .each(function () {
                if (randomPonifyUnponified) {
                    $(this).attr('checked', 'checked');
                }
                $(this).change(function () {
                    var checked = '0';
                    randomPonifyUnponified = false;
                    if ($(this).filter(':checked').size() > 0) {
                        checked = '1';
                        randomPonifyUnponified = true;
                    }

                    setCookie('lor_ponificator_random_ponify_unponified', checked);
                    updateAvatars();
                });
            });
    }

    function originalAvatarCallback() {
        var user = catchUsername.call(this);

        var htmlCode = '<h2>Original avatar of "'+ user.name +'"</h2>';

        var originalAvatar = catchOriginalAvatar.call(this);
        if (!originalAvatar)
            htmlCode += '<p>"'+ user.name +'" has no avatar</p>';
        else
            htmlCode += '<p><img alt="Original avatar" src="'
                + originalAvatar
                +'" class="lor_ponificator_original_avatar_only" /></p>';

        showPopup(htmlCode);
    }

    function fixRandomAvatarCallback() {
        var user = catchUsername.call(this);
        var avatarURL = $(this).closest('div.userpic')
            .find('img.lor_ponificator_ponified_avatar')
            .attr('src');

        ponifyUsername(user.name);

        user = catchUsername.call(new String(user.name));

        ponifiedUsers[user.index].avurl = avatarURL;
        setCookie(
            'lor_ponificator_ponified_users_avatars',
            JSON.stringify(ponifiedUsers)
        );
        updateAvatars();
    }

    function newRandomAvatarCallback() {
        var user = catchUsername.call(this);
        for (var i=0; i<tempUsers.length; i++) {
            if (tempUsers[i].user == user.name) {
                tempUsers[i].avurl = getRandomAvaURL();
            }
        }
        updateAvatars();
    }
    
    function initAvatarTools() {
        var style = document.createElement('style');
        style.type = 'text/css';
        var css = ''
            +'div.lor_ponificator_avatar_tools {'
                +'position: absolute;'
                +'left: 0;'
                +'top: 0;'
                +'width: 100%;'
                +'height: 100%;'
                +'display: block;'
                +'opacity: 0.01;'
                +'white-space: nowrap;'
            +'}'
            +'div.lor_ponificator_avatar_tools:hover {'
                +'opacity: 1.0;'
            +'}'
            +'div.lor_ponificator_avatar_tools span {'
                +'display: block;'
                +'line-height: 26px;'
                +'height: 26px;'
                +'background: #272c2d;'
                +'color: #babdb6;'
                +'opacity: 0.9;'
                +'padding: 0 2px;'
                +'text-decoration: underline;'
                +'text-align: center;'
            +'}'
            +'article[id^=topic] div.lor_ponificator_avatar_tools span {'
                +'font-size: 9px;'
            +'}'
            // #whois_userpic for profile page
            +'div.lor_ponificator_avatar_tools span span,'
            +'div.lor_ponificator_avatar_tools span.lor_ponificator_ponify_avatar,'
            +'#whois_userpic div.lor_ponificator_avatar_tools span span,'
            +'#whois_userpic div.lor_ponificator_avatar_tools span.lor_ponificator_ponify_avatar {'
                +'cursor: pointer;'
                +'display: inline-block;'
                +'background: none;'
                +'opacity: 1.0;'
            +'}'
            +'div.lor_ponificator_avatar_tools span.lor_ponificator_ponify_avatar,'
            +'#whois_userpic div.lor_ponificator_avatar_tools span.lor_ponificator_ponify_avatar {'
                +'background: #272c2d;'
                +'display: block;'
                +'opacity: 0.9;'
            +'}'
            +'div.lor_ponificator_avatar_tools span span:hover,'
            +'div.lor_ponificator_avatar_tools span.lor_ponificator_ponify_avatar:hover {'
                +'color: white;'
            +'}'
            ;
        $(style).html(css);
        $(document.head).append(style);

        var tools = ''
            +'<div class="lor_ponificator_avatar_tools">'
                +'<span class="lor_ponificator_ponify_avatar"></span>'
                +'<span class="lor_ponificator_change_avatar">'
                    +'<span class="lor_ponificator_prev_avatar" title="Previous avatar">←</span>'
                    +'<span class="lor_ponificator_next_avatar" title="Next avatar">→</span>'
                    +'<span class="lor_ponificator_rand_avatar" title="Random avatar">RAND</span>'
                    +'<span class="lor_ponificator_url_avatar" title="Set cutsom avatar URL">URL</span>'
                +'</span>'
                +'<span class="lor_ponificator_advanced_avatar_tools">'
                    +'<span class="lor_ponificator_list_avatar" title="Choose avatar from list">LIST</span>'
                    +'<span class="lor_ponificator_advanced_avatars_control" title="Advanced avatars control">CONTROL</span>'
                +'</span>'
                +'<span class="lor_ponificator_third_line">'
                    +'<span class="lor_ponificator_view_original_avatar" title="View original avatar of this user">ORIG</span>'
                    +'<span class="lor_ponificator_fix_random_avatar" title="Fix this random avatar">FIX</span>'
                    +'<span class="lor_ponificator_new_random_avatar" title="New random avatar for this user">NEW</span>'
                +'</span>'
            +'</div>'
            ;

        $('div.userpic').css({
            'position': 'relative'
        }).each(function () {
            $(this).append(tools);
            $(this).find('span.lor_ponificator_ponify_avatar').click(avatarPonifyCallback);
            $(this).find('span.lor_ponificator_prev_avatar').click(prevAvatarCallback);
            $(this).find('span.lor_ponificator_next_avatar').click(nextAvatarCallback);
            $(this).find('span.lor_ponificator_rand_avatar').click(randAvatarCallback);
            $(this).find('span.lor_ponificator_url_avatar').click(urlAvatarCallback);
            $(this).find('span.lor_ponificator_list_avatar').click(listCallback);
            $(this).find('span.lor_ponificator_advanced_avatars_control').click(controlCallback);
            $(this).find('span.lor_ponificator_view_original_avatar').click(originalAvatarCallback);
            $(this).find('span.lor_ponificator_fix_random_avatar').click(fixRandomAvatarCallback);
            $(this).find('span.lor_ponificator_new_random_avatar').click(newRandomAvatarCallback);
        });
    }

    function prepareAvatarsURLs() {
        var list = avatarsDatabase.avatars_database;
        list.forEach(function (item) {
            if (typeof item.pack === 'boolean' && item.pack === true) {
                for (var i=0; i<excludePacksID.length; i++) {
                    if (item.pack_id == excludePacksID[i]) {
                        return;
                    }
                }
                if (onlyPackID.length > 0) {
                    var packCatched = false;
                    onlyPackID.forEach(function (packID) {
                        if (packID == item.pack_id) {
                            packCatched = true;
                        }
                    });
                    if (!packCatched) return;
                }
                item.list.forEach(function (packItem) {
                    for (var i=0; i<excludeURLs.length; i++) {
                        if (packItem.url == excludeURLs[i]) {
                            return;
                        }
                    }
                    avatarsURLs.push(packItem.url);
                });
                if (typeof item.url_prefix === 'string') {
                    item.list_prefixed.forEach(function (packItem) {
                        var url = item.url_prefix + packItem.file;
                        for (var i=0; i<excludeURLs.length; i++) {
                            if (url == excludeURLs[i]) {
                                return;
                            }
                        }
                        avatarsURLs.push(url);
                    });
                }
            } else { // single url (not pack)
                if (onlyPackID.length > 0) return;
                for (var i=0; i<excludeURLs.length; i++) {
                    if (item.url == excludeURLs[i]) {
                        return;
                    }
                }
                avatarsURLs.push(item.url);
            }
        });
        if (avatarsURLs.length < 1) throw new Error('Empty avatars URLs list');
    }

    function ponify() {
        // Verify structure of database
        if (typeof avatarsDatabase !== 'object')
            throw new Error('"avatarsDatabase" is not object');
        if ( ! Array.isArray(avatarsDatabase.avatars_database))
            throw new Error('Incorrect avatars database key type');
        if (avatarsDatabase.avatars_database.length < 1)
            throw new Error('Empty avatars database');

        excludeBroniesFromRandomPonifyUnponified = avatarsDatabase.bronies_list;
        prepareAvatarsURLs();
        initAvatarTools();
        updateAvatars();
    }

    // fast loading ponified avatars
    var style = document.createElement('style');
    style.type = 'text/css';
    $(style).html('img.lor_ponificator_ponified_avatar { max-width: 150px; }');
    $(document.head).append(style);
    updateAvatars(true);

    if (avatarsDatabase === null) {
        $.lor_ponificator_avatars_database_callback = function (jsonObject) {
            avatarsDatabase = jsonObject;
            ponify();
        };
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = avatarsDatabaseURL;
        $(document.head).append(script);
    } else ponify();
});
// vim:set ts=4 sw=4 expandtab:
