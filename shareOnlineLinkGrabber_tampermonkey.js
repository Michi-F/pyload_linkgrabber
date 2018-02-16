// ==UserScript==
// @name         Pyload Script for share-online
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://www.share-online.biz/*
// @grant        none
// ==/UserScript==

/*
	Copyright (C) 2018, Michi-F

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

(function() {
    'use strict';

	// action codes for communication with pyload main page
    window.pyloadActionCodes = {
		activatePyloadLinkGrabber:"activatePyloadLinkGrabber",
		sendDownloadLink:"sendDownloadLink"
	};

	// 1s timer, checks if captcha is completed, activated by "activatePyloadLinkGrabber" postMessage-command from pyload
    window.pyloadLinkGrabberInterval = false;

	// this function listens to messages from the pyload main page
    window.addEventListener('message', function(e) {
        var request = jQuery.parseJSON(e.data);
        var returnObject = null;
        if(request.actionCode == window.pyloadActionCodes.activatePyloadLinkGrabber)
        {
			window.pyloadLinkGrabberInterval = window.setInterval(pyloadCaptchaCompletedCallback, 1000);
        }
    });

	// modified function from share-online
	// on first call, it returns some crazy value: "result:chk||...27 alphanumeric characters..."
	// on a second call (after 30s!), it returns a valid download link
	// both values are stored in file[5]
    window.pyloadGrabDownloadLink = function()
    {
        if(captcha)
		{
			$.ajax({
				type: "POST",
				url: url.split("///").join("/free/captcha/"),
				cache: !1,
				timeout: 2e4,
				data: "dl_free=1&captcha=" + captcha + "&recaptcha_challenge_field=" + grecaptcha.getResponse() + "&recaptcha_response_field=" + grecaptcha.getResponse(),
				success: function(e)
				{
					if("0" == $.trim(e))
					{
						grecaptcha.reset();
					}
					else
					{
						captcha = !1;
						file[5] = $.base64Decode($.trim(e));
						finish = new Date();
						finish.setSeconds(finish.getSeconds() + wait);
						$("#dl_captcha").css("display", "none");
						$("#dl_wait").css("padding", old[1]);
						$("#dl_wait").css("width", old[2]);
						$("#dll").css("margin", old[3]);
						$("#dll").css("width", old[4]);
						$("#dl_ticket").html("");
						$("#dl_ticket").hide();
						$("#dl_wait").show();
						interval = setInterval(dl_countdown, delay);
					}
				}
			});
		}
		return file[5];
    };

	// function that is called when the captcha is completed
    window.pyloadCaptchaCompletedCallback = function()
    {
        if(pyloadIsCaptchaCompleted())
        {
			// captcha is completed -> disable 1s timer which checks if captcha is completed
			window.clearInterval(window.pyloadLinkGrabberInterval);
			window.pyloadLinkGrabberInterval = false;

			// get download link
            var pyloadDownloadLink = pyloadGrabDownloadLink();
            if(pyloadDownloadLink.startsWith("http"))
            {
				// yes, we got a valid download link!
				// pass the download link to the callback function on the pyload page
                var returnObject = {actionCode: window.pyloadActionCodes.sendDownloadLink, value: pyloadDownloadLink};
                parent.postMessage(JSON.stringify(returnObject),"*");
            }
			else
			{
				// pyloadGrabDownloadLink() returns a crazy value on the first call, therefore, we have to call it again
				// but we have to wait some time (value of the variable wait, in seconds)
				// otherwise the download link will not be valid
				window.setTimeout(window.pyloadCaptchaCompletedCallback, wait*1000);
			}
        }
    };

	// checks if the captcha is completed
    window.pyloadIsCaptchaCompleted = function()
    {
        return grecaptcha && grecaptcha.getResponse().length !== 0;
    };
})();