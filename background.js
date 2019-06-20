"use strict";

let TAG = "mockify";
let config = {};
let fallback_config = {
	power: true,
	debug_mode: true,
	mock_user_agent: true,
	block_tracking_urls: true,
	block_urls: [
		// Taken from https://github.com/slingamn/simpleblock/commit/87fe5cdcd4307d006689ad2d824193f0ba55c731
		"*://*.doubleclick.net/*",
		"*://partner.googleadservices.com/*",
		"*://*.googlesyndication.com/*",
		"*://*.google-analytics.com/*",
		"*://creative.ak.fbcdn.net/*",
		"*://*.adbrite.com/*",
		"*://*.exponential.com/*",
		"*://*.quantserve.com/*",
		"*://*.scorecardresearch.com/*",
		"*://*.zedo.com/*"
	],
	alt_header:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
};

let type_callback_map = [
	[["image"], blockImage],
	[["sub_frame"], blockPage],
	[
		[
			"main_frame",
			"object",
			"script",
			"xmlhttprequest",
			"stylesheet",
			"font",
			"media",
			"ping",
			"csp_report",
			"other"
		],
		blockObject
	]
];

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

function blockImage(e) {
	if (config.debug_mode) log("Blocking " + e.url);

	// Magic objects that the webRequest API can interprets, taken from
	// https://github.com/slingamn/simpleblock/commit/b3e22e7be75c87b8d5e16f343f97bc546f6b252f
	return {
		redirectUrl:
			"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI="
	};
}

function blockPage(e) {
	if (config.debug_mode) log("Blocking " + e.url);

	return { redirectUrl: "about:blank" };
}

function blockObject(e) {
	if (config.debug_mode) log("Blocking " + e.url);

	return { cancel: true };
}

function addURLListeners() {
	// Note, enabling callbacks with no URLs will block *all* URLs
	if (config.block_urls.length == 0) {
		return;
	}

	for (let idx in type_callback_map) {
		// Redirect images and iframes to the void, and cancel everything else
		browser.webRequest.onBeforeRequest.addListener(
			type_callback_map[idx][1],
			{ urls: config.block_urls, types: type_callback_map[idx][0] },
			// Use blocking listeners to actually cancel/redirect requests
			["blocking"]
		);
	}

	// The "*" schema does not match "ws://" and "wss://" in Chrome, see
	// https://developer.chrome.com/extensions/match_patterns.
	// However, we still want to block requests coming via those protocols.
	let ws_filters = [];
	let prefix = "*://";
	config.block_urls.forEach(function(filter) {
		if (filter.startsWith(prefix)) {
			let no_prefix_url = filter.slice(prefix.length);
			ws_filters.push("ws://" + no_prefix_url);
			ws_filters.push("wss://" + no_prefix_url);
		}
	});
	if (ws_filters.length > 0) {
		browser.webRequest.onBeforeRequest.addListener(
			blockObject,
			{ urls: ws_filters, types: ["websocket"] },
			// Use blocking listeners to actually cancel/redirect requests
			["blocking"]
		);
	}
}

function removeURLListeners() {
	for (let idx in type_callback_map) {
		browser.webRequest.onBeforeRequest.removeListener(
			type_callback_map[idx][1]
		);
	}
}

function updateListeners() {
	if (!config.power) {
		removeHeaderListeners();
		removeURLListeners();

		return;
	}

	if (config.mock_user_agent) {
		addHeaderListeners();
	} else {
		removeHeaderListeners();
	}

	if (config.block_tracking_urls) {
		addURLListeners();
	} else {
		removeURLListeners();
	}
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

				// Check that `config` provides all the keys of `fallback_config`
				// else amend the configuration in `config` and save it again
				if (
					Object.keys(config)
						.sort()
						.toString() !==
					Object.keys(fallback_config)
						.sort()
						.toString()
				) {
					for (let setting of Object.keys(fallback_config)) {
						if (typeof config[setting] === undefined) {
							config[setting] = fallback_config[setting];
						}
					}

					browser.storage.local.set({ config: config }).then(
						function() {
							if (config.debug_mode)
								log("Successfully updated config");
						},
						function onError(e) {
							console.error("Failure in updating config" + e);
						}
					);
				}
			}

			if (config.debug_mode) {
				log(
					"Loaded the following configuration: " +
						JSON.stringify(config)
				);
			}

			// Enable the desired functionality via an update of the listeners
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
