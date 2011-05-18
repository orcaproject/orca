
// Setup depends on: -
// Runtime depends on: console.js, helpers.js

// API:
// st.communication.send(data, handlerId)
// st.communication.sendForked(data, handlerId)
// st.communication.addMessageHandler(string, function)
// st.communication.getMessageHandler(string)

// (st.setup_session_id(int) can be called only once)

// Settings:
// st.communication.MESSAGE_PATH (string)

(function() {

	// Set up the namespace
	if (!window.st) window.st = {};
	var home = st.communication ? st.communication : (st.communication = {});

	// 
	// Settings
	// 

	if (!("MESSAGE_PATH" in home)) home.MESSAGE_PATH = "message";

	// 
	// Local variables
	// 

	var messageHandlers = [];
	var session_id = -1;

	// 
	// API functions
	// 

	home.send = function(data, handlerId) {
		return doSend(data, true, "blocked", handlerId);
	};

	home.sendForked = function(data) {
		// No meaningfull result-value when sending forked
		doSend(data, false, "forked", handlerId, true);
		return null;
	};

	home.addMessageHandler = function(handlerId, handlerFunction) {
		messageHandlers[handlerId] = handlerFunction;
	};

	home.getMessageHandler = function(handlerId) {
		return messageHandlers[handlerId];
	}

	home.setup_session_id = function(id) {
		// Allow calling this function only once - delete after usage
		delete home.setup_session_id;
		st.console.log("This session-id is " + id);
		session_id = id;
		doSend("", false, "forked"); // Open the connection initially
	};

	// 
	// Private functions
	// 

	// Set up default handler
	home.addMessageHandler("default",
		function(messageString) { st.console.log("Received unhandled message: " + messageString); });
	home.addMessageHandler("code",
		function(messageString) { return st.globalEval(messageString); });

	// Use the configured message-handler to evaluate and log the content
	var handleMessage = function(content, handlerId) {
		var result;
		try {
			var handler = messageHandlers[handlerId];
			if (!handler) {
				// Use the default handler or do nothing by default
				handler = messageHandler["default"];
			}
			if (handler)
				result = handler(content);
		} catch (e) {
			st.console.log("Error handling the content of a server-message: " + e + ".\r\n" +
			"Message was: " + content);
		}
		return result;
	};

	// Increased with every send and decreased with every received "answer"
	var awaitedAnswers = 0;

	var doSend = function(data, isSynchronous, status, handlerId, ignoreResponse) {
		if (session_id == -1) {
			throw "Session-ID has not been set up yet! Cannot send.";
		}
		var url = st.fullURL(home.MESSAGE_PATH) + "?id=" + session_id;
		
		var request = st.createRequest();
		var content = "status=" + st.escapeAll(status);
		content += "&message=" + st.escapeAll(data);
		content += "&handlerId=" + st.escapeAll(handlerId);
		if (!ignoreResponse && !isSynchronous)
			request.onreadystatechange = function() { answerToMessage(request); };
		request.open("POST", url, !isSynchronous);
		request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		awaitedAnswers++;
		request.send(content);
		if (!ignoreResponse && isSynchronous)
			return answerToMessage(request);
		return request.responseText;
	}

	// Answering a message can recursively cause doing more sends
	// (either by sending the answer or from inside a message handler)
	// The execution stack will preserve the info, where to return after all the sends
	var answerToMessage = function(request) {
		if (request.readyState == 4) {
			if (request.status == 200) {
				var response = /status=([^&]*)&message=([^&]*)/.exec(request.responseText);
				if (response && response.length >= 2) {
					var status = response[1];
					var message = unescape(response[2]);
					if (status == "answer") {
						// "answerTo: (answer)"
						awaitedAnswers--;
						if (awaitedAnswers < 0) {
							awaitedAnswers = 0;
							st.console.log("Illegal state: Received more answers than sends!");
						}
						return message;
					} else if (status == "blocked") {
						// "answerTo: (blocked)"
						var result = handleMessage(message);
						return doSend(result, false, "answer");
					} else if (status == "forked") {
						// "answerTo: (forked)"
						if (awaitedAnswers >= 2) {
							// Inside any blocking send from the client, a forked
							// send from the server becomes blocking, because the clientInformation
							// needs the opening connection to block
							handleMessage(message); // Ignore result
							return doSend("", true, "answer");
						} else {
							var result = doSend("", false , "answer");
							handleMessage(message); // Ignore result
							return result;
						}
					}
				}
				st.console.log("Illegal message received from the server: " + request.responseText);
			} else {
				st.console.statusInfo("Channel disconnected: " + request.responseText, request.status);
			}
		}
	}

})();
