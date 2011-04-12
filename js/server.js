
// Setup depends on: -
// Runtime depends on: communication.js, classes.js

// API:
// st.communication.performOnServer(squeakCode)
// st.communication.serverBlock(squeakCodeEvaluatingToABlock)

// Settings:
// home.METHOD_INVOKATION_URL (String)

(function() {

	// Set up the namespace
	if (!window.st) window.st = {};
	var home = st.communication ? st.communication : (st.communication = {});

	// Settings
	if (!home.CODE_EXECUTION_URL) home.CODE_EXECUTION_URL = "mi";
	if (!home.MESSAGE_SEND_URL) home.MESSAGE_SEND_URL = "send";

	// 
	// API functions
	// 

	home.performOnServer = function(squeakCode) {
		var length = arguments.length;
		var args = "";
		for (var i = 1; i < arguments.length; i++) {
			// to make sure the arguments and code get sent properly we must url-encode them by escape
			args += "&arg" + (i - 1) + "=" + realEscape(arguments[i]);
		}
		var data = "code=" + realEscape(squeakCode) + args;
		var result = st.communication.sendSynchronously(data, home.CODE_EXECUTION_URL);
		return st.communication.handleMessage(result);
	};

	home.serverBlock = function (squeakCode) {
		// Returns block, that will be evaluated directly on the server, when evaluated
		return st.block(function() {
			// debugger;
			var args = [ squeakCode ].concat(st.unboxIterable(arguments));
			return home.performOnServer.apply(home, args);
		});
	};

	// 
	// Private functions
	// 

	// TODO this method is not finished and not used.
	var passMessage = function(receiver, message) {
		if (false) { //(receiver.isRemote()){
			// transparent message passing
		} else {
			if (st.unbox(receiver.isBehavior()) && st.unbox(message.selector()) == "newOnServer"){
				var data = "newObjectOfClassNamed=" + this.realEscape(receiver.name()._unbox());
				st.communication.sendSynchronously(data, home.MESSAGE_SEND_URL);
			} else {
				receiver.error_(string("Unexpected remote message send."));
			}
		}
	}

	var realEscape = function(string) {
		// * @ - _ + . / are not escaped by this default js-function
		var result = escape(string);
		result = result.replace(/(\*)/g, "%2A");
		result = result.replace(/(\@)/g, "%40");
		result = result.replace(/(\-)/g, "%2D");
		result = result.replace(/(\_)/g, "%5F");
		result = result.replace(/(\+)/g, "%2B");
		result = result.replace(/(\.)/g, "%2E");
		result = result.replace(/(\/)/g, "%2F");
		return result;
	};

})();
