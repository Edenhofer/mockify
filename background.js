"use strict";

let TAG = "mockify";
let config = {};
let fallback_config = {
	power: true,
	debug_mode: true,
	mock_user_agent: true,
	block_tracking_urls: false,
	alt_header:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
};

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
			header.value = config.alt_header;
		}
	}

	return {
		requestHeaders: e.requestHeaders
	};
}

/*
 * Rewrite the response header to mock the USER_AGENT
 */
function rewriteResponseHeader(e) {
	if (config.debug_mode) log("Modifying " + e.url);

	for (let header of e.responseHeaders) {
		if (header.name.toLowerCase() === "user-agent") {
			header.value = config.alt_header;
		}
	}

	return {
		responseHeaders: e.responseHeaders
	};
}

/*
 * Add rewriteRequestHeader to onBeforeSendHeaders and rewriteResponseHeader to
 * onHeadersReceived.
 */
function addHeaderListeners() {
	let target_urls = ["<all_urls>"];

	/* Use blocking listeners to also modify the header */
	browser.webRequest.onBeforeSendHeaders.addListener(
		rewriteRequestHeader,
		{
			urls: target_urls
		},
		["blocking", "requestHeaders"]
	);

	browser.webRequest.onHeadersReceived.addListener(
		rewriteResponseHeader,
		{
			urls: target_urls
		},
		["blocking", "responseHeaders"]
	);
}

/*
 * Remove rewriteRequestHeader and rewriteResponseHeader
 */
function removeHeaderListeners() {
	browser.webRequest.onBeforeSendHeaders.removeListener(rewriteRequestHeader);
	browser.webRequest.onHeadersReceived.removeListener(rewriteResponseHeader);
}

function updateListeners() {
	if (!config.power) {
		removeHeaderListeners();

		return;
	}

	if (config.mock_user_agent) {
		addHeaderListeners();
	} else {
		removeHeaderListeners();
	}

	if (config.block_tracking_urls) null; // TODO
}

function handleMessage(message, sender, sendResponse) {
	if (message.action === "reload") {
		// Load local configuration
		browser.storage.local.get("config").then(
			function(response) {
				// We already know that the config object exist so just make it
				// globally available
				config = response.config;

				if (config.debug_mode)
					log(
						"Loaded the following configuration: " +
							JSON.stringify(config)
					);

				updateListeners();
			},
			function onError() {
				if (browser.runtime.lastError)
					console.error(
						"Runtime Error :( " + browser.runtime.lastError
					);
			}
		);
	}
}

function init() {
	// Load local configuration and update listeners
	browser.storage.local.get("config").then(
		function(response) {
			// Check whether we are run for the first time
			if (Object.entries(response).length === 0) {
				// Use the fallback configuration values as config and save them
				config = fallback_config;
				browser.storage.local.set({ config: config }).then(
					function() {
						if (config.debug_mode)
							log("Successfully initialized config");
					},
					function onError(e) {
						console.error("Failure in initializing config" + e);
					}
				);
			} else {
				// Make the configuration globally available
				config = response.config;
			}

			if (config.debug_mode) {
				log(
					"Loaded the following configuration: " +
						JSON.stringify(config)
				);
			}

			updateListeners();
		},
		function onError() {
			if (browser.runtime.lastError)
				console.error("Runtime Error :( " + browser.runtime.lastError);
		}
	);

	// Add a listener for communicating with the settings page
	browser.runtime.onMessage.addListener(handleMessage);
}

init();
