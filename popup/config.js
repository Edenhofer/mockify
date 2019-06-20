"use strict";

let TAG = "mockify";
let binary_settings = [
	"power",
	"debug_mode",
	"mock_user_agent",
	"block_tracking_urls"
];

window.onload = function() {
	initConfigurationPage();

	// Add event listeners for every possible value that could be changed
	for (let setting of binary_settings) {
		document
			.getElementById("toggle_" + setting)
			.addEventListener("click", updateConfiguration);
	}
};

/*
 * Simpler function to log messages
 */
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}

function initConfigurationPage() {
	// Load local configuration
	browser.storage.local.get("config").then(
		function(response) {
			// The value `config` will be set by the background script
			// if it is not set, print an error
			if (Object.entries(response).length === 0) {
				console.error(
					"Configuration was not initialized by the background process"
				);
			}
			let config = response.config;

			if (config.debug_mode) {
				log(
					"Loaded the following configuration: " +
						JSON.stringify(config)
				);
			}

			// Adapt the page to the currently configured values
			for (let setting of binary_settings) {
				if (config[setting]) {
					document.getElementById("toggle_" + setting).checked = true;
				}
			}
		},
		function onError() {
			if (browser.runtime.lastError)
				console.error("Runtime Error :( " + browser.runtime.lastError);
		}
	);
}

function updateConfiguration() {
	// Merge the current and new config and save it
	browser.storage.local.get("config").then(
		function(response) {
			// The value `config` will be set by the background script
			// if it is not set, print an error
			if (Object.entries(response).length === 0) {
				console.error(
					"Configuration was not initialized by the background process"
				);
			}
			let config = response.config;

			// Get all new setting values and merge them into the current config
			for (let setting of binary_settings) {
				config[setting] = document.getElementById(
					"toggle_" + setting
				).checked;
			}

			// Actually save the configuration in `config`
			// Note that certain types, such as Function, Date, RegExp, Set, Map,
			// ArrayBuffer and so on may not be saved via this method
			browser.storage.local.set({ config: config }).then(
				function() {
					if (config.debug_mode) log("Successfully updated config");
				},
				function onError(e) {
					console.error("Failure in updating config" + e);
				}
			);

			// Send a message to the background process to apply the settings
			browser.runtime.sendMessage({ action: "reload" }).then(
				function(m) {
					if (config.debug_mode)
						log(
							"Message from the background script: " +
								JSON.stringify(m)
						);
				},
				function(e) {
					console.error(e);
				}
			);
		},
		function onError() {
			if (browser.runtime.lastError)
				console.error("Runtime Error :( " + browser.runtime.lastError);
		}
	);
}
