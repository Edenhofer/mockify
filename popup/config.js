"use strict"


let TAG = "mockify"
let binary_settings = ["power", "debug_mode", "mock_user_agent",
	"block_tracking_urls"]


window.onload = function () {
	initConfigurationPage();

	// Add event listeners for every possible value that could be changed
	for (let setting of binary_settings) {
		document.getElementById("toggle_" + setting).addEventListener("click",
			writeConfiguration);
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
	browser.storage.local.get("config").then(function (config) {
		if (config.debug_mode) log("Loaded the following configuration: " +
			JSON.stringify(config));

		// Adapt the page to the currently configured values
		for (let setting of binary_settings) {
			if (config[setting]) {
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

function writeConfiguration() {
	let config = {}

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
}
