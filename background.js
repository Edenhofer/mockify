"use strict";

let TAG = "mockify";
let mode = {
	OFF: 'off',
	NORMAL: 'normal',
	AGGRESSIVE: 'aggressive'
}
let config = {};
let fallback_config_normal = {
	mode: mode.NORMAL,
	debug_mode: true,
	mock_user_agent: true,
	mock_accept_header: true,
	enable_dnt: true,
	mock_navigator: true,
	block_tracking_urls: true,
	mock_timezone: false,
	mock_screen_resolution: false,
	mock_language: false
};

let fallback_config_off = {
	mode: mode.OFF,
	debug_mode: true,
	mock_user_agent: false,
	mock_accept_header: false,
	enable_dnt: false,
	mock_navigator: false,
	block_tracking_urls: false,
	mock_timezone: false,
	mock_screen_resolution: false,
	mock_language: false
};

let fallback_config_aggressive = {
	mode: mode.AGGRESSIVE,
	debug_mode: true,
	mock_user_agent: true,
	mock_accept_header: true,
	enable_dnt: true,
	mock_navigator: true,
	block_tracking_urls: true,
	mock_timezone: true,
	mock_screen_resolution: true,
	mock_language: true
};

let general_config = {
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
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
	alt_accept_header: [
		"text/html, */*; q=0.01",
		"gzip, deflate, br",
		"gzip, deflate",
		"en-US,en;q=0.5"
	],

	alt_navigator: [
		{ obj: "window.navigator", prop: "oscpu", value: "Windows NT 10.0" },
		{ obj: "window.navigator", prop: "platform", value: "Win32" },
		{ obj: "window.navigator", prop: "vendor", value: "" },
		{ obj: "window.navigator", prop: "doNotTrack", value: true}
	],
	alt_timezone: -120,
	alt_screen_resolution: [
		{obj: "window.screen", prop: "height", value: 1080},
		{obj: "window.screen", prop: "width", value: 1920},
		{obj: "window.screen", prop: "colorDepth", value: 24}
	],
	alt_language: [
		{obj: "window.navigator", prop: "language", value: "en-US"}
	]
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
 * Rewrite the request header to mock the USER_AGENT and accept-header
 */
function rewriteRequestHeader(e) {
	if (config.debug_mode) log("Modifying " + e.url);

	let https = (e.url.indexOf("https://") === 0);

	for (let header of e.requestHeaders) {
		if (header.name.toLowerCase() === "user-agent") {
			header.value = config.alt_header;
		} else if (header.name.toLowerCase() === "accept") {
			header.value = config.alt_accept_header[0];
		} else if (header.name.toLowerCase() === "accept-encoding") {
			// set accept-encoding header according to page being http or https
			https ? header.value = config.alt_accept_header[1] : header.value = config.alt_accept_header[1];
		} else if(header.name.toLowerCase() === "accept-language") {
			header.value = config.alt_accept_header[3];
		}
	}

	// set DoNotTrack to enabled
	let dntIndex = e.requestHeaders.findIndex(function h(obj) {
		return obj.name.toLowerCase() === "dnt";
	});

	if (dntIndex === -1) e.requestHeaders.push({ name: "DNT", value: "1"});

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
	if (config.block_urls.length === 0) {
		return;
	}

	for (let idx in type_callback_map) {
		// Redirect images and iFrames to the void, and cancel everything else
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
	if (config.mode === mode.OFF) {
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

/*
 * Load local configuration and update the global one in `config`.
 * Furthermore, update listeners.
 */
function reload() {
	browser.storage.local.get("config").then(
		function(response) {
			// Use the configured setting and else fallback; set `config` globally
			config = {};

			switch (response.config["mode"]){
				case mode.OFF:
					config = Object.assign({}, fallback_config_off, general_config);
					break;
				case mode.NORMAL:
					config = Object.assign({}, fallback_config_normal, general_config);
					break;
				case mode.AGGRESSIVE:
					config = Object.assign({}, fallback_config_aggressive, general_config);
					break;
				default:
					config = Object.assign({}, fallback_config_aggressive, general_config);
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
}

function handleMessage(message, sender) {
	if (message.action === "reload") {
		reload();
	} else if (message.action === "getConfig") {
		// Load local configuration and send it back
		let promiseConfig = new Promise(function(resolve, reject) {
			browser.storage.local.get("config").then(
				function(response) {
					// Use the configured setting and else fallback; set `config` globally
					config = {};

					switch (response.config["mode"]){
						case mode.OFF:
							config = Object.assign({}, fallback_config_off, general_config);
							break;
						case mode.NORMAL:
							config = Object.assign({}, fallback_config_normal, general_config);
							break;
						case mode.AGGRESSIVE:
							config = Object.assign({}, fallback_config_aggressive, general_config);
							break;
						default:
							config = Object.assign({}, fallback_config_aggressive, general_config);
					}

					if (config.debug_mode) {
						log(
							"Sending the following configuration back: " +
								JSON.stringify(config)
						);
					}

					resolve(config);
				},
				function onError() {
					if (browser.runtime.lastError) {
						console.error(
							"Runtime Error :( " + browser.runtime.lastError
						);
					}

					resolve(fallback_config);
				}
			);
		});

		return promiseConfig;
	}
}

function init() {
	// Add a listener for communicating with the settings page
	browser.runtime.onMessage.addListener(handleMessage);

	reload();
}

init();
