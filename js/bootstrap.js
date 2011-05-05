
// Code, that sets up some global squeak-variables, after all classes have been loaded.
// Also, initializes all instance-variables to nil, as it's available now.

// Setup depends on: classes, classes.js
// Runtime depends on: -

// API (not a real API, just values mostly used in compiled code):
// st.primitiveDeclaration (function())
// st.true
// st.false
// st.nil

(function() {

	// Set up the namespace
	var home = window.st ? window.st : (window.st = {});

	// Function called when a method with an unimplemented primitive declaration is called
	home.primitiveDeclaration = function() {
		var current = st.peekCallStack();
		var msg = "Primitive has been called!!! The method containing it is: \n" +
			"\n" +
			current.currentThis._theClass._classname + "." + current.currentMethod.methodName + "\n" +
			"(implemented in class " + current.currentMethod.methodHome._theClass._classname + ")\n" +
			"\n" +
			"You can either rely on the software-implementation of this primitive " +
			" and add this method to the list in OrcaSqueakAstToJsAst class >> #ignoredPrimitives\n" +
			"Or you implement the primitive in a Javascript-file in the primitives/-subfolder.\n" +
			"The file must be called <name of the home-class of the primitive>.js and is included automatically.\n" +
			"If it is not there, create it.";
		alert(msg)
		throw msg;
	};

	// Set up immutable globals
	home.true = st.True._newInstance();
	home.false = st.False._newInstance();
	home.nil = st.UndefinedObject._newInstance();

	// Now, that nil is available, initialize all instance-variables of all classes to nil
	for (aClass in st.classes) {
		st.classes[aClass]._initializeInstanceVariables(home.nil);
	}

	// TODO if we're sure everything is fixed, remove these warnings.
	var deprecatedError = function(methodName) {
		var msg = "We have an obsolete " + methodname + "()-call! Fix it.";
		alert(msg);
		throw msg;
	};
	st.Object._addInstanceMethods({
		jsEval: function() {
			deprecatedError("jsEval (which is EVIL!!)");
		},
		js: function() {
			deprecatedError("js");
		},
		js_: function() {
			deprecatedError("js:");
		},
		slot_be_: function() {
			deprecatedError("slot:be:");
		},
		slot_: function() {
			deprecatedError("slot:");
		},
		slot_apply_: function() {
			deprecatedError("slot:apply:");
		}
	});
	
	// Error message if remoteObject session is not used, but attempt to pass message to a remote-object
	st.passMessage = function() {
		throw "You have tried to use remote objects, but a RemoteObjectSession was not set in your application (>>#orcaSessionClass should return OrcaRemoteObjectsSession) ";
	};

})();
