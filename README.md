# Mock and or block identifying information about your browser

## Reference list for an introduction into browser tracking

A great tool to roughly get an idea of current tracking capabilities is [Panopticlick](https://panopticlick.eff.org/). It tests some simple techniques by which foreign parties try to identify a browser via a combination of non-unique but still identifying information snippets. See the original paper "[How Unique Is Your Web Browser?](https://panopticlick.eff.org/static/browser-uniqueness.pdf)" for more details.

The tool [Uniquemachine](http://uniquemachine.org/) is similar tool focusing on identifying information from graphics cards, CPU, and installed writing scripts. Its main message is that unique information not only identifying the browser instance but the system respectively the user can be retrieved. See the original paper "[(Cross-)Browser Fingerprinting via OS and Hardware Level Features](https://yinzhicao.org/TrackingFree/crossbrowsertracking_NDSS17.pdf)" for more details.

Another great source for some details on more advanced tracking techniques currently used is [The Web never forgets: Persistent tracking mechanisms in the wild](https://securehomes.esat.kuleuven.be/~gacar/persistent/index.html). The paper discusses methods such as canvas fingerprinting, evercookies and cookie syncing.

## Non-exhaustive list of identifying information

* HTTP user agent
* HTTP_ACCEPT Headers
* Browser Plugin Details
* Time Zone
* Screen Size and Color Depth
* System Fonts
* Are Cookies Enabled?
* Limited supercookie test
* Hash of canvas fingerprint
* Hash of WebGL fingerprint
* DNT Header Enabled?
* Language
* Platform
* Touch Support

## Code outline

* [background.js](background.js): JS code to be run in the background; It handles all the configuration management and communicates with other parts of the extension via messenges.
* [content_script.js](content_script.js): JS code to be inserted into every website which is visited by the user; The code contains some gymnastic exercises to actually insert the desired JS scripts into the DOM of the loaded page itself. Thereby, it has to bypass the Content Security Policies (CSP) set by the website.
* [popup/](popup/): Folder containing HTML and JS files for configuring and interacting with the extension.
