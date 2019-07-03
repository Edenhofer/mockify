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
	"mock_accept_header",
	"enable_dnt",
	"mock_navigator",
	"block_tracking_urls",
	"mock_timezone",
	"mock_screen_resolution",
	"mock_language"
];

window.onload = function() {
	initConfigurationPage();

	let new_config = {};

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
				}
				document.getElementById("mode").value = recentMode;
			}

			setToggles(config);
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
			let synced_config = Object.assign({}, response.config, new_config);

			// Actually save the configuration in `config`
			// Note that certain types, such as Function, Date, RegExp, Set, Map,
			// ArrayBuffer and so on may not be saved via this method
			browser.storage.local.set({ config: synced_config });

			// Send a message to the background process to apply the settings
			browser.runtime.sendMessage({ action: "reload" });

			// load complete config to set toggles
			browser.runtime.sendMessage({ action: "getConfig" }).then(
				function(config) {
					setToggles(config);
				});
		},
		function onError() {
			if (browser.runtime.lastError)
				console.error("Runtime Error :( " + browser.runtime.lastError);
		}
	);
}

function setToggles(config){
	for (let setting of binary_settings) {
		document.getElementById("toggle_" + setting).disabled = true;
		document.getElementById("toggle_" + setting).checked = config[setting];
	}
}
