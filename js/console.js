
// Setup depends on: -
// Runtime depends on: -

// API:
// st.console.debug(text)
// st.console.info(text)
// st.console.error(text)
// st.console.statusInfo(content, httpStatus)
// st.console.print(object)

// Settings:
// st.console.USE_FIREBUG (boolean)

(function() {

	// Set up the namespace
	if (!window.st) window.st = {};
	var home = st.console ? st.console : (st.console = {});

	// 
	// Settings
	// 

	if (!home.USE_FIREBUG) home.USE_FIREBUG = true;

	// 
	// API functions
	// 

	home.log = function(text) {
		if (home.USE_FIREBUG) {
			console.log(text);
		}
	};

	home.statusInfo = function(text, httpStatus) {
		if ((httpStatus == 200) || (httpStatus == 201)) {
			logHTTP(text, httpStatus, "OK");
		}
		else if (httpStatus == 204) {
			logHTTP(text, httpStatus, "No content");
		}
		else {
			logHTTP(text, httpStatus, "Client aborted");
		} 
	};

	home.print = function(obj) {
		for (index in obj) {
			home.log(index + " = " + obj[index]);
		}
	};

	// 
	// Private functions
	// 

	var logHTTP = function(text, httpStatus, statusText) {
		home.log("HTTP -" + statusText + "(" + httpStatus + "). Content: " + text);
	}

})();