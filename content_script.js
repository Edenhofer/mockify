"use strict";

let TAG = "mockify";

let mode = {
	OFF: 'off',
	NORMAL: 'normal',
	AGGRESSIVE: 'aggressive'
};

/*
 * Simpler function to log messages
 */
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}

// Send a message to the background process to get the current settings
browser.runtime.sendMessage({ action: "getConfig" }).then(
	function(config) {
		if (config.debug_mode) {
			log(
				"Configuration provided by the background process to the content-script: " +
					JSON.stringify(config)
			);
		}

		let code = `
let TAG = "mockify";

/*
 * Simpler function to log messages
 */
function log(message) {
	console.log(new Date() + " " + TAG.toUpperCase() + ": " + message);
}

/*
 * Overwrite the desired properties of a given window with new values
 */
function override(window, properties_to_overwrite) {
	for (let entry of properties_to_overwrite) {
		if (entry.obj == "window") {
			window[entry.prop] = entry.value;
			continue;
		}

		if (entry.value == "undefined") {
			entry.value = undefined;
		}
		Object.defineProperty(
			entry.obj.split(".").reduce((p, c) => (p && p[c]) || null, window),
			entry.prop,
			{
				configurable: true,
				value: entry.value
			}
		);
	}
}

function overrideWindowProperties(properties) {
	if (${config.debug_mode}) log("window overriding invoked...");

	// Override properties of the default window \`window\`
	override(window, properties);

	// Prevent properties from leaking through windows in trusted iFrames
	let observer = new MutationObserver(mutations => {
		for (let mutation of mutations) {
			for (let node of mutation.addedNodes) {
				if (
					typeof node.contentWindow !== "undefined" &&
					node.contentWindow !== null &&
					typeof node.contentWindow.navigator !== "undefined"
				) {
					override(node.contentWindow, properties);
				}
				
				if (
					${config.mock_touch_support} &&
					typeof node.contentWindow !== "undefined" &&
					node.contentWindow !== null &&
					typeof node.contentWindow.ontouchstart !== "undefined"
				) {
					delete window.ontouchstart;
				}
			}
		}
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	if (${config.debug_mode}) log("window overriding completed...");
}

function overrideTimeZoneOffset() {
	Date.prototype.getTimezoneOffset = function () {
		return ${config.alt_timezone};
	}
	
	if (${config.debug_mode}) log("timezone overriding completed with value: " + ${config.alt_timezone});
}

if (${config.mock_navigator}) {
	overrideWindowProperties(${JSON.stringify(config.alt_navigator)});
}

if (${config.mock_language}) {
	overrideWindowProperties(${JSON.stringify(config.alt_language)});
}

if (${config.mock_screen_resolution}) {
	overrideWindowProperties(${JSON.stringify(config.alt_screen_resolution)});
}

if (${config.mock_timezone}) {
	overrideTimeZoneOffset();
}
`;

		// Do not change any Javascript code if the extension is not enabled
		if (config.mode === mode.OFF) {
			return;
		} else {
			try {
				document.documentElement.appendChild(
					Object.assign(document.createElement("script"), {
						textContent: code
					})
				);
			} catch (e) {
				if (config.debug_mode) {
					log("CSP forbids inline scripts; trying another way...");
				}
			}

			// Inject code block for sites where the Content Security Policy (CSP)
			// would otherwise forbid inline scripts
			let script = document.createElement("script");
			script.src = URL.createObjectURL(
				new Blob([code], { type: "text/javascript" })
			);
			(document.head || document.documentElement).appendChild(script);
			try {
				URL.revokeObjectURL(url);
			} catch (e) {}
			script.remove();
		}
	},
	function(e) {
		console.error(e);
	}
);
