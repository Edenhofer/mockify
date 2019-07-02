"use strict";

let TAG = "mockify";
let mode = {
	OFF: 'off',
	NORMAL: 'normal',
	AGGRESSIVE: 'aggressive'
}

let binary_settings = [
	"debug_mode",
	"mock_user_agent",
	"mock_navigator",
	"block_tracking_urls",
	"mock_timezone",
	"mock_screen_resolution"
];

window.onload = function() {
	initConfigurationPage();

	let new_config = {};

	// Add event listeners for every possible value that could be changed
	for (let setting of binary_settings) {
		document
			.getElementById("toggle_" + setting)
			.addEventListener("click", function() {
				new_config[setting] = document.getElementById(
					"toggle_" + setting
				).checked;
				updateConfig(new_config);
			});
	}

	document.getElementById("mode").addEventListener("change", function() {
		let selectedMode;

		switch (document.getElementById("mode").value){
			case "mode_off":
				selectedMode = mode.OFF;
				break;
			case "mode_normal":
				selectedMode = mode.NORMAL;
				break;
			case "mode_aggressive":
				selectedMode = mode.AGGRESSIVE;
				break;
			default: selectedMode = mode.NORMAL;
		}
		new_config["mode"] = selectedMode;
		updateConfig(new_config);
	});


};

/*
 * Simpler function to log messages
 */
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}

function initConfigurationPage() {
	// Send a message to the background process to get the current settings
	browser.runtime.sendMessage({ action: "getConfig" }).then(
		function(config) {
			if (config.debug_mode) {
				log(
					"Configuration provided by the background process to the config script: " +
						JSON.stringify(config)
				);
			}

			// Adapt the page to the currently configured values
			for (let setting of binary_settings) {
				if (config[setting]) {
					document.getElementById("toggle_" + setting).checked = true;
				}
			}

			if (config["mode"]) {
				let recentMode;

				switch (config["mode"]){
					case mode.OFF:
						recentMode = "mode_off";
						break;
					case mode.NORMAL:
						recentMode = "mode_normal";
						break;
					case mode.AGGRESSIVE:
						recentMode = "mode_aggressive";
						break;
					default: recentMode = "mode_normal";
				}
				document.getElementById("mode").value = recentMode;
			}
		},
		function(e) {
			console.error(e);
		}
	);
}

function updateConfig(new_config) {
	// Merge the current and new config and save it
	browser.storage.local.get("config").then(
		function(response) {
			let synced_config = {};
			if (typeof response["config"] !== "undefined") {
				synced_config = response["config"];
			}

			// Get all new setting values and merge them into the current config
			for (let setting of Object.keys(new_config)) {
				synced_config[setting] = new_config[setting];
			}

			// Actually save the configuration in `config`
			// Note that certain types, such as Function, Date, RegExp, Set, Map,
			// ArrayBuffer and so on may not be saved via this method
			browser.storage.local.set({ config: synced_config });

			// Send a message to the background process to apply the settings
			browser.runtime.sendMessage({ action: "reload" });
		},
		function onError() {
			if (browser.runtime.lastError)
				console.error("Runtime Error :( " + browser.runtime.lastError);
		}
	);
}
