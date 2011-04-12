
// Setup dependencies: -
// Runtime dependencies: boxing.js, console.js, server.js

// API:
// st.tests.assert(boolean)
// st.tests.assertEquals(anObject, aReferenceObject, exeptionMessage)
// st.tests.runTests()
// st.tests.setupSqueakEnvironment()

// Settings:
// st.tests.DEBUG_ON_ERROR (boolean)
// st.tests.ORCA_TESTS (Array of Strings)

(function() {

	// Setup the namespace
	if (!window.st) window.st = {}; // This also acts as foreign namespace here! (st.DEBUG is set below)
	var home = st.tests ? st.tests : (st.tests = {});

	// 
	// Settings
	// 

	home.DEBUG_ON_ERROR = false;

	home.ORCA_TESTS = [
		"test_squeakyJS.js", 
		"test_primitives.js", 
		"test_blocks.js", 
		"test_super.js", 
		"test_communication.js",
		"test_boxing.js",
		"test_doesNotUnderstand_.js" ];

	// 
	// API functions
	// 

	home.runTests = function() {
		// The tests are executed directly in these files
		for (testScript in home.ORCA_TESTS) {
			var scriptName = home.ORCA_TESTS[testScript];
			if (typeof scriptName == "string") {
				runTestScript(scriptName);
			}
		}
		
		// Send the results to the server
		st.communication.performOnServer(
			"[ :failed :errors | OrcaJavascriptTest reportJSResults: failed and: errors ]",
			testResults.fail.length, testResults.error.length);
	};

	// Load all resources needed to setup the squeak-environment on the client
	home.setupSqueakEnvironment = function() {
		if (!squeakEnvironmentLoaded) {
			loadClasses();
			
			var scripts = [ "js/perform.js", "js/boxing.js", "js/bootstrap.js", 
			// The primitives of all classes. TODO must be refactored.
			"js/primitives/Array.js", "js/primitives/BlockClosure.js", "js/primitives/Exception.js",
			"js/primitives/Float.js", "js/primitives/Js.js", "js/primitives/Number.js",
			"js/primitives/Object.js", "js/primitives/OrcaWidget.js", "js/primitives/Point.js",
			"js/primitives/ProtoObject.js", "js/primitives/String.js" ]
			
			for (var i = 0; i < scripts.length; i++) {
				loadScript(scripts[i]);
			}
			
			squeakEnvironmentLoaded = true;
		}
	};

	home.assert = function (condition, exception_message){
		if (!condition) {
			throw new AssertionFail(exception_message);
		}
	};

	home.assertEquals = function (anObject, aReferenceObject, exceptionMessage) {
		return home.assert(st.unbox(anObject) == aReferenceObject, exceptionMessage);
	};

	// 
	// Private functions
	// 

	// This determines which application is used to load the js-scripts and compiled classes
	var applicationName = null;

	// This will be the html-element, that contains the test-results
	var resultContainer = null;

	// Remember the currently run script and test
	var currentScript = null;
	var currentTest = null;

	// Exception-object to signalize assert-fails
	var AssertionFail = function(message) { this.Orca_IS_AssertionFail = true; this.message = message; };

	var squeakEnvironmentLoaded = false;

	var testResults = {
		ok: 0,
		fail: new Array(),
		error: new Array()
	};

	// Disable debugging-support when executing tests
	st.DEBUG = false;

	// Simply load the resource (relative to root)
	var GET = function(path) {
		var req = new XMLHttpRequest();
		req.open("GET", path, false);
		req.send(null);
		if (req.status == 200) {
			return req.responseText;
		} else {
			throw "Could not load file: " + path;
		}
	};

	// Load the resource and evaluate it in global context. Return the evaluated result.
	var loadFile = function(fileName) {
		var script = GET(fileName);
		return (function() { return window.eval(script); })(); // The scripts need global context
	};

	// Load and evaluate the compiled squeak-classes
	var loadClasses = function() {
		return loadFile("classes");
	};

	// Load the resource distributed from our file-handler in the image
	var loadScript = function(scriptName) {
		return loadFile("file/" + scriptName);
	};

	// Run one test-script.
	// This loads a script and evaluates it. Directory "test/" is prepended.
	// The script must be thought of as a big function returning one object.
	// The returned object is iterated and each function-slot starting with test* is executed as test-case.
	// If the slot/function setUp is present, it is called before each test*-function.
	// If the slot (string) testedApp is present, the named application is used to load scripts (instead of default test).
	var runTestScript = function(scriptName) {
		st.console.log("Running test-script " + scriptName + "...");
		currentScript = scriptName;
		currentTest = "(?)";
		var tester = null;
		startNewTest(scriptName);
				
		tryCatch(function() {
			applicationName = "test";
			tester = loadScript("js/test/" + scriptName);
		}, function(e) {
			testError("Could not load and evaluate script. " + e);
		});
		if (tester) {
			if (tester.testedApp !== undefined) {
				applicationName = tester.testedApplication;
			} else if (setup !== undefined) {
				applicationName = "test";
			}
			var setup = tester.setUp;
			for (mt in tester) {
				if(/^test/.test(mt) && typeof tester[mt] === "function"){
					currentTest = mt;
					tryCatch(function() {
						if (setup !== undefined) {
							setup.apply(tester);
						}
						tryCatch(function() {
								tester[mt].apply(tester);
								testOk();
							}, function(e) {
								if (e.Orca_IS_AssertionFail === true) {
									testFail(e.message);
								} else {
									testError(e);
								}
							});
					}, function(e) {
						testError("SetUp failed. " + e);
					});
				}
			}
	  }
	};

	var tryCatch = function(tryFunction, catchFunction) {
		try {
			tryFunction();
		} catch(e) {
			catchFunction(e);
			if (home.DEBUG_ON_ERROR) {
				debugger;
				// Step into this function to re-execute, what just has failed.
				tryFunction();
			}
		}
	};

	var testError = function(message) {
		var message = logError(testResults.error, message, "Error running test");
		showResult("red", "ERROR", message);
	};

	var testFail = function(message) {
		var message = logError(testResults.fail, message, "Assertion failed");
		showResult("yellow", "FAIL", message);
	};

	var testOk = function() {
		testResults.ok++;
		showResult("green", "OK", currentTestName());
	};

	var logError = function(errorArray, exception_message, error_type) {
		var message = currentTestName() + ": " + error_type + ". Message: " + exception_message;
		errorArray.push(message);
		st.console.log(message);
		return message;
	};

	var currentTestName = function() {
		return currentScript + "/" + currentTest;
	};

	var showResult = function(colorClass, message, errorMessage) {
		var result = document.createElement("li");
		result.setAttribute("class", colorClass);
		result.innerHTML = message;
		var textBox = new TextBox(result, errorMessage);
		result.onclick = function(event) { textBox.show(event, true); };
		result.onmouseover = function(event) { textBox.show(event, false); };
		result.onmouseout = function(event) { textBox.hide(); };
		resultContainer.appendChild(result);
	};

	var startNewTest = function (testScriptName){
		showHeadingFor(testScriptName);
		resultContainer = document.createElement("ul");
		document.getElementsByTagName("body")[0].appendChild(resultContainer);
	};

	var showHeadingFor = function (testScriptName){
		var heading = document.createElement("h1");
		var headingText = /(?:^test\_(\w*)|(\w*)).js$/.exec(testScriptName);
		headingText = document.createTextNode(headingText[1] || headingText[2] || testScriptName);
		heading.appendChild(headingText);
		document.getElementsByTagName("body")[0].appendChild(heading);
	};

	// box for test-results, shown on mouse-hovering of result-labels
	var TextBox = function(aNode, aMessage) {
		var textNode = document.createElement("div");
		textNode.className = "textBox";
		var parentNode = aNode;
		textNode.innerHTML = aMessage;
		var durable = false;
		
		this.show = function(event, toggleDurability){
			if (!durable) {
				parentNode.appendChild(textNode);
				textNode.style.top = event.pageY + 1 + "px";
				textNode.style.left = event.pageX + 1 + "px";
			}
			if (toggleDurability) {
				durable = !(durable || false);
			}
		};
		this.hide = function(){
			if(!durable){
				parentNode.removeChild(textNode);
			}
		};
		return this;
	};

})();