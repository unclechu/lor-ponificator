// ==UserScript==
// @name        LOR-Ponificator
// @namespace   LOR
// @include     http://*.linux.org.ru/*
// @include     https://*.linux.org.ru/*
// @version     1.0
// ==/UserScript==

$(function () {
    // Configs
    var avatarsDatabaseURL = 'https://raw.github.com/unclechu/lor-ponificator/master/avatars_database.js';
    var excludePacksID = [ /* "bronyland_other_pony_avatars" */ ];
    var excludeURLs = [ /* "http://www.bronyland.com/goodies/avatars/other/100/berry_punch_avatar.png" */ ];
    var onlyPackID = [ /* "bronyland_other_pony_avatars" */ ];

    var avatarsDatabase = null;
    var ponifiedUsers = [];
    var avatarsURLs = [];

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

    // (c) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function getRandomAvaURL() {
        return avatarsURLs[ getRandomInt( 0, avatarsURLs.length-1 ) ];
    }

    function nextAvatar(username) {
        var userAvaURL = null;
        var userIndex = -1;
        for (var i=0; i<ponifiedUsers.length; i++) {
            if (ponifiedUsers[i].user == username) {
                userAvaURL = ponifiedUsers[i].avurl;
                userIndex = i;
            }
        }

        if (userAvaURL === null) throw new Error('Username "'+ username +'" not found');

        for (var i=0; i<avatarsURLs.length; i++) {
            if (avatarsURLs[i] == userAvaURL) {
                var newAvaIndex;
                if (i+1 >= avatarsURLs.length) {
                    newAvaIndex = 0;
                } else {
                    newAvaIndex = i+1;
                }
                ponifiedUsers[userIndex].avurl = avatarsURLs[newAvaIndex];
                setCookie('lor_ponificator_ponified_users_avatars', JSON.stringify(ponifiedUsers));
                updateAvatars();
                return;
            }
        }
        
        ponifiedUsers[userIndex].avurl = getRandomAvaURL();
        setCookie('lor_ponificator_ponified_users_avatars', JSON.stringify(ponifiedUsers));
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
    
    function updateAvatars() {
        $('div.userpic').each(function () {
            var $msg = $(this).closest('div.msg-container');
            var username = $msg.find('div.sign a');
            var usernameFound = false;
            if (username.size() < 1) {
                username = 'anonymous';
            } else {
                username = username.text();
            }

            ponifiedUsers.forEach(function (user, index) {
                if (user.user == username) usernameFound = index;
            });

            if (usernameFound === false) {
                $(this).find('img:not(.lor_ponificator_ponified_avatar)').show();
                $(this).find('img.lor_ponificator_ponified_avatar').remove();
                $(this).find('span.lor_ponificator_ponify_avatar').show().text('PONIFY!');
                $(this).find('span.lor_ponificator_next_avatar').hide().text('');
            } else {
                var $ava = $(this).find('img:not(.lor_ponificator_ponified_avatar)');
                $ava.hide();
                if ($(this).find('img.lor_ponificator_ponified_avatar').size() < 1) {
                    $ava.after('<img alt="Ponies everywhere" src="'
                        + ponifiedUsers[usernameFound].avurl
                        +'" class="lor_ponificator_ponified_avatar" />');
                } else {
                    $(this).find('img.lor_ponificator_ponified_avatar')
                        .attr('src', ponifiedUsers[usernameFound].avurl)
                        .show();
                }
                $(this).find('span.lor_ponificator_ponify_avatar').show().text('UNPONIFY');
                $(this).find('span.lor_ponificator_next_avatar').show().text('NEXT AVATAR');
            }
        });
    }

    function avatarPonifyCallback() {
        var $msg = $(this).closest('div.msg-container');
        var username = $msg.find('div.sign a');
        var usernameFound = false;
        if (username.size() < 1) {
            username = 'anonymous';
        } else {
            username = username.text();
        }

        ponifiedUsers.forEach(function (user, index) {
            if (user.user == username) usernameFound = index;
        });

        if (usernameFound === false) {
            ponifyUsername(username);
        } else {
            unponifyUsername(username);
        }

        return false;
    }

    function nextAvatarCallback() {
        var $msg = $(this).closest('div.msg-container');
        var username = $msg.find('div.sign a');
        var usernameFound = false;
        if (username.size() < 1) {
            username = 'anonymous';
        } else {
            username = username.text();
        }

        ponifiedUsers.forEach(function (user, index) {
            if (user.user == username) usernameFound = index;
        });

        if (usernameFound !== false) {
            nextAvatar(username);
        }

        return false;
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
                +'padding: 0 5px;'
                +'cursor: pointer;'
                +'text-decoration: underline;'
                +'text-align: center;'
            +'}'
            ;
        $(style).html(css);
        $(document.head).append(style);

        var tools = ''
            +'<div class="lor_ponificator_avatar_tools">'
                +'<span class="lor_ponificator_ponify_avatar"></span>'
                +'<span class="lor_ponificator_next_avatar"></span>'
            +'</div>'
            ;

        $('div.userpic').css({
            'position': 'relative'
        }).each(function () {
            $(this).append(tools);
            $(this).find('span.lor_ponificator_ponify_avatar').click(avatarPonifyCallback);
            $(this).find('span.lor_ponificator_next_avatar').click(nextAvatarCallback);
        });
    }

    function prepareAvatarsURLs() {
        var list = avatarsDatabase.avatars_database;
        list.forEach(function (item) {
            if (item.pack) {
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
                        if (item.url == excludeURLs[i]) {
                            return;
                        }
                    }
                    avatarsURLs.push(packItem.url);
                });
            } else { // url
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

        prepareAvatarsURLs();
        initAvatarTools();
        updateAvatars();
    }

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
