"use strict"


let TAG = "mockify"
let binary_settings = ["power", "debug_mode", "mock_user_agent",
	"block_tracking_urls"]


window.onload = function () {
	initConfigurationPage();

	// Add event listeners for every possible value that could be changed
	for (let setting of binary_settings) {
		document.getElementById("toggle_" + setting).addEventListener("click",
			updateConfiguration);
	}
}

/*
* Simpler function to log messages
*/
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}

function initConfigurationPage() {
	// Load local configuration
	browser.storage.local.get("config").then(function (response) {
		if (response.debug_mode) log("Loaded the following configuration: " +
			JSON.stringify(response));

		// Adapt the page to the currently configured values
		for (let setting of binary_settings) {
			if (response.config[setting]) {
				document.getElementById("toggle_" + setting).checked = true;
			}
		}
	},
		function onError() {
			if (browser.runtime.lastError) console.error("Runtime Error :( " +
				browser.runtime.lastError);
		}
	);
}

function updateConfiguration() {
	let config = {}
	config.alt_header = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"

	// Get all setting values
	for (let setting of binary_settings) {
		config[setting] = document.getElementById("toggle_" + setting).checked
	}

	// Actually save the settings
	// Note that certain types, such as Function, Date, RegExp, Set, Map,
	// ArrayBuffer and so on may not be saved via this method
	browser.storage.local.set({ config: config });
	if (config.debug_mode) log("Stored the following configuration: " +
		JSON.stringify(config));

	// Send a message to the background process to apply the settings
	let message = browser.runtime.sendMessage({ action: "reload"});
	message.then(function (m) {
		log("Message from the background script: " + JSON.stringify(m));
	},
		function (e) { console.error(e); }
	);
}
