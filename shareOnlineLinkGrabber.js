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

// usage: var linkGrabber = new shareOnlineLinkGrabber("captchaIframeId","captchaIframeName",pyloadPageCallbackFunction);
// iframeId, iframeName: <iframe id="iframeId" name="iframeName"> of the iframe which shows the share-online page to manually solve the captcha
// linkCallbackFunction: this callback function is called after the download link is grabbed
// this function should take one argument: the download link (a string).
function shareOnlineLinkGrabber(iframeId, iframeName, linkCallbackFunction)
{
	this._iframeId = iframeId;
	this._iframeName = iframeName;
	this._linkCallbackFunction = linkCallbackFunction; // this function is called when the link is sucessfully grabbed, with 1 argument (the link)
	
	this._active = false; // true: link grabbing is running, false: standby
}

// action codes for communication with iframe via postMessage
shareOnlineLinkGrabber.prototype.captchaIframeActionCodes =
{
	activatePyloadLinkGrabber:"activatePyloadLinkGrabber",
	sendDownloadLink:"sendDownloadLink"
};

// this function listens to messages from the tampermonkey script in the iframe
shareOnlineLinkGrabber.prototype.windowEventListener = function(e)
{
	linkGrabberInstance = e.data;
	var request = jQuery.parseJSON(e.originalEvent.data);
	if(request.actionCode == linkGrabberInstance.captchaIframeActionCodes.sendDownloadLink)
	{
		// we got the link! pass it to the callback function
		linkGrabberInstance._linkCallbackFunction(request.value);
		
		// deactivate
		linkGrabberInstance._active = false;
		// clean up
		$(window).off('message', linkGrabberInstance.windowEventListener);
		$("#"+linkGrabberInstance._iframeId).off("load", linkGrabberInstance.iframeLoaded);
	}
}

// downloadLink: http://www.share-online.biz/dl/...
shareOnlineLinkGrabber.prototype.grabShareOnlineDownloadLink = function(downloadLink)
{
	// activate
	this._active = true;
	// register event listener for communication with iframe
	$("#"+this._iframeId).on("load", this, this.iframeLoaded);
	$(window).on('message', this, this.windowEventListener);

	if(downloadLink.endsWith("/"))
	{
		downloadLink += "free"
	}
	else
	{
		downloadLink += "/free"
	}
	// load page in iframe
	this.postShareOnlineLinkToIframe(downloadLink);
}

// this function creates a temporary form, and triggers a POST request to share-online to load the page in the iframe
shareOnlineLinkGrabber.prototype.postShareOnlineLinkToIframe = function(url)
{
	$('body').append('<form action="'+url+'" method="POST"  target="'+this._iframeName+'" id="postToIframeForm">');
	$('#postToIframeForm').append('<input type="hidden" name="dl_free" value="1" />');
	$('#postToIframeForm').append('<input type="hidden" name="choice" value="free" />');
    $('#postToIframeForm').submit().remove();
}

//this function is called when the iframe is loaded, and it activates the link grabber of the tampermonkey script
shareOnlineLinkGrabber.prototype.iframeLoaded = function(event)
{
	linkGrabberInstance = event.data;
	if(linkGrabberInstance._active)
	{
		returnObject = {actionCode: linkGrabberInstance.captchaIframeActionCodes.activatePyloadLinkGrabber, value:null};
		$("#"+linkGrabberInstance._iframeId).get(0).contentWindow.postMessage(JSON.stringify(returnObject),"*");
	}
}