"use strict"


let TAG = "mockify"
// TODO: Write a proper configuration handler
let config = {}
config.debug_mode = true
config.alt_header = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"


/*
* Simpler function to log messages
*/
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}


/*
* Rewrite the request header to mock the USER_AGENT
*/
function rewriteRequestHeader(e) {
	if (config.debug_mode) log("Modifying " + e.url);

	for (let header of e.requestHeaders) {
		if (header.name.toLowerCase() === "user-agent") {
			header.value = config.alt_header
		}
	}

	return { requestHeaders: e.requestHeaders }
}


/*
* Rewrite the response header to mock the USER_AGENT
*/
function rewriteResponseHeader(e) {
	if (config.debug_mode) log("Modifying " + e.url);

	for (let header of e.responseHeaders) {
		if (header.name.toLowerCase() === "user-agent") {
			header.value = config.alt_header
		}
	}

	return { responseHeaders: e.responseHeaders }
}


/*
* Add rewriteRequestHeader to onBeforeSendHeaders and rewriteResponseHeader to
* onHeadersReceived.
*/
function addListeners() {
	let target_urls = ["<all_urls>"]

	/* Use blocking listeners to also modify the header */
	browser.webRequest.onBeforeSendHeaders.addListener(rewriteRequestHeader,
		{ urls: target_urls },
		["blocking", "requestHeaders"]);

	browser.webRequest.onHeadersReceived.addListener(rewriteResponseHeader,
		{ urls: target_urls },
		["blocking", "responseHeaders"]);
}


/*
* Remove rewriteRequestHeader and rewriteResponseHeader
*/
function removeListeners() {
	browser.webRequest.onBeforeSendHeaders.removeListener(
		rewriteRequestHeader);
	browser.webRequest.onHeadersReceived.removeListener(
		rewriteResponseHeader);
}


addListeners()
