
// Setup depends on: communication.js
// Runtime depends on: (console.js)

// API:
// st.classes = array
// st.peekCallStack()
// st.supa(methodName)
// st.nonLocalReturn(returnValue)
// st.block(function)
// st.klass(classname, attributes)

// API defined on classes:
// _addInstanceMethods(methodDictionary)
// _addClassMethods(methodDictionary)
// _initializeInstanceVariables(defaultValue)
// _addInstanceVariables(aStringArray)
// _addClassInstanceVariables(aStringArray)
// _addClassVariables(aStringArray)
// _newInstance()
// _classname

// API defined on instances of classes:
// _theClass

// Settings:
// st.DEBUG (boolean)
// st.PRINT_CALLS (boolean)

(function(){

	// Set up the namespace
	var home = window.st ? window.st : (window.st = {});

	// Set up foreign namespaces
	if (!window.st) window.st = {};
	if (!st.communication) st.communication = {};

	// Settings
	if (!("DEBUG" in home)) home.DEBUG = true;
	if (!("PRINT_CALLS" in home)) home.PRINT_CALLS = false;

	// Globals
	home.classes = [];

	// 
	// API functions
	// 

	home.peekCallStack = function() {
		return callStack[callStack.length - 1];
	};
	
	home.getCurrentMethodContext = function(caller) {
		var methodContext = caller.methodContext;
		
		if (methodContext == undefined) {
			methodContext = home.peekCallStack();
		}
		
		return methodContext
	};

	home.supa = function(methodName) {
		return function() {
			var methodContext = st.getCurrentMethodContext(arguments.callee.caller);
			var superMethod = methodContext.currentMethod.methodHome.__proto__[methodName];

			return superMethod.apply(methodContext.currentThis, arguments);
		};
	};

	home.nonLocalReturn = function(value) {
		var blockFunction = arguments.callee.caller;
		blockFunction.throwNonLocalReturnException(value);
	};

	home.block = function(func) {
		var b = st.BlockClosure._newInstance();
		var nonLocalReturnException = home.peekCallStack();
		
    	var blockContext = arguments.callee.caller;
		func.throwNonLocalReturnException = function(value) {
	    	// If this block is created inside another block after another message is on the call stack
	    	// the dispatch of the non local return has 2 dimensions:
	    	// 1) messages sent on the call stack
	    	// 2) blocks wrapped around blocks (because inner blocks may be created after further messages have been sent)
			if (blockContext.throwNonLocalReturnException) {
	      		blockContext.throwNonLocalReturnException(value);
	    	} else {
	      		nonLocalReturnException.nonLocalReturnValue = value;
	      		throw nonLocalReturnException;
      		}
    	};

		func.methodContext = st.getCurrentMethodContext(blockContext);
		
		// Unboxing a real block must give the same function as when evaluating it.
		b._evaluated = function() {
			// Use the callStack to get the object, this block should be executed in.
			// box the arguments in any case, as this is code parsed from Squeak-code and relies on the auto-boxing.
			return func.apply(func.methodContext.currentThis, st.boxIterable(arguments));
		};

		b._original = b._evaluated;
		b._constructor = function() {
			// When using real blocks as constructor, don't unpack the constructor-parameters, 
			// but box them to be sure (should not be necessary).
			// Use the real 'this' instead of the currentThis from the artificial stack
			return func.apply(this, st.boxIterable(arguments));
		};
		return b;
	};

	// This function creates a class with a given name and attributes.
	home.klass = function(classname, attrs) {
		var addVariables = function(newClass) {
			if('instanceVariables' in attrs) {
				newClass._addInstanceVariables(attrs.instanceVariables, null);
			}
		};
		
		var addMethods = function(newClass) {
			if('instanceMethods' in attrs) {
				newClass._addInstanceMethods(attrs.instanceMethods);
			}
		};
		
		var setFormat = function (newClass) {
			if ('format' in attrs){
				/* strage construct avoiding the function st.number, because it is not accessible just yet */
				newClass.__defineGetter__('$format', 
					(function (format){ 
						return function (){ 
							return st.number(format)}})(attrs.format));
				/* if we set $format, getter and setter are deleted and format is set to aNumber */
				newClass.__defineSetter__('$format', 
					function (aNumber){ 
						delete this[$format]; 
						this.$format = aNumber;
						return aNumber;});
			}
		};
		
		var theClass;
		
		if((classname in this) == false) {
			// create a new class if it does not yet exist
			theClass = createMetaclassAndInstantiate(classname, attrs);
			this[classname] = theClass;
		}
		else {
			// the class does already exist
			// we will use the given parameters to extend the class
			var theClass = this[classname];
			if('superclass' in attrs) {
				theClass._inheritFrom(attrs['superclass']);
			}
		}
		
		addVariables(theClass);
		addMethods(theClass);
		
		setFormat(theClass);
		
		return theClass;
	};
	
	home.stubClass = function(classname) {
		this[classname] = new Object();
		makeClass(this[classname], classname);
	};

	// 
	// Private functions
	// 

	var createMetaclassAndInstantiate = function(classname, attrs) {
		var newClass;
		var metaClass;
		
		if(classname.endsWith(' class')) {
			// in case the class is a metaclass, it is
			// an instance of MetaClass
			metaClass = st['Metaclass'];
		}
		else {
			var metaSuperClass;
			
			if ('superclass' in attrs) {
				if(attrs.superclass._classname.endsWith(' class'))
					metaSuperClass = attrs.superclass;
				else
					metaSuperClass = st[attrs.superclass._classname + ' class'];
			}
			else {
				// if there is no superclass, the metaSuperClass is Class
				// this is important for ProtoObject class superclass
				metaSuperClass = st['Class'];
			}
		
			// metaclasses are actually anonymous but when getting accessed
			// the naming convention for class "X" is "X class"
			metaClass = st.klass(classname + ' class', {
					superclass: metaSuperClass,
					instanceVariables: attrs.classVariables,
					instanceMethods: attrs.classMethods
			});
		}

		newClass = metaClass._newInstance();

		makeClass(newClass, classname);
		
		if('superclass' in attrs) {
			newClass._inheritFrom(attrs.superclass);
		}
		else {
			newClass._instancePrototype.prototype._theClass = newClass;
		}

		return newClass;
	};

	var makeClass = function(newClass, classname) {
		var createMethod = function(aPrototype, methodName, method) {
			aPrototype[methodName] = wrapFunction(method);
			aPrototype[methodName].methodName = methodName;
			aPrototype[methodName].originalMethod = method;
			method.methodName = methodName;
			method.methodHome = aPrototype; // This is the object, that actually contains this method
		}
		
		var initializeVariables = function(aPrototype, newInitialValue) {
			for (instVar in aPrototype) {
				if (aPrototype[instVar] == null) {
					aPrototype[instVar] = newInitialValue;
				}
			}
		}
		
		newClass._classname = classname;
		
		newClass._instancePrototype = st.isChrome() 
								? (st.localEval("(function " + 
										(classname.endsWith(' class') 
											? "class_" + classname.replace(/ class/g, "")
											: "instance_of_" + classname
										) + "() { })")) 
								: (function () { });
								
		newClass._instances = new Array();
		
		newClass._newInstance = function() {
			var instance = new this._instancePrototype();
			instanceCount++; 
			instance._instanceNumber = instanceCount;
			this._instances.push(instance);
			
			return instance;				
		}
		
		newClass._instancePrototype.prototype._theClass = newClass;
		
		// Initialize all fields, that are null to the given value
		newClass._initializeInstanceVariables = function(newInitialValue) {
			initializeVariables(this._instancePrototype.prototype, newInitialValue);
		}
		
		newClass._addInstanceMethods = function(methodTable) {
			for(methodName in methodTable) {
				if (typeof methodTable[methodName] == 'function'){
					createMethod(this._instancePrototype.prototype, methodName, methodTable[methodName]);
				}
			}
		}
		
		newClass._addClassMethods = function(methodTable) {
			for(methodName in methodTable) {
				if (typeof methodTable[methodName] == 'function'){
					createMethod(this._theClass._instancePrototype.prototype, methodName, methodTable[methodName]);
				}
			}
		}
		
		newClass._addInstanceVariables = function(variableNames, defaultValue) {
			for(idx in variableNames) {
				this._instancePrototype.prototype[variableNames[idx]] = defaultValue;
			}
			if (variableNames)
				this._instancePrototype.prototype.instanceVariables = (this._instancePrototype.prototype.instanceVariables === undefined) ? variableNames : this._instancePrototype.prototype.instanceVariables.concat(variableNames);
		}
		
		newClass._inheritFrom = function(superClass) {
			this._instancePrototype.prototype = superClass._newInstance();
			this._instancePrototype.prototype._theClass = this;

			for (var i=0; i < this._instances.length; i++) {
				this._instances[i].__proto__ = this._instancePrototype.prototype;
			}
			
			this.$superclass = superClass;
		}
		
		home.classes.push(newClass);
	};

	var wrapFunction = function(aFunc) {
		if(home.DEBUG)
			return __debugging(__nonLocalReturn(aFunc));
		else
			return __nonLocalReturn(aFunc);
	}
	// This is not part of the API, but must be exposed to access it in the eval()-call below
	st.wrapFunction = wrapFunction;

	// Each time an object (excluding classes) is created, this is incremented
	var instanceCount = 0;

	// Each element has the slot 'currentThis' set, that represents the object, the execution is currently in
	// The element itself is a unique instance, that is used to enable the non-local-return-functionality.
	var callStack = [];

	// From here on, messages from the server potentially contain non-local-returns
	// and must be wrapped into the appropriate wrapper-function
	var oldCodeHandler = st.communication.getMessageHandler("code");
	st.communication.addMessageHandler("code", function(source) {
		return oldCodeHandler(
			"st.wrapFunction(function() {" + 
			source + "}).apply(st.nil);" );
	});

	var DontDebugMarker = {};
	var MethodContext = function(currentThis, method) { 
		this.DontDebug = DontDebugMarker;
		this.currentThis = currentThis;
		this.currentMethod = method;
	};

	// A wrapper to enable several debugging-functionalities
	var __debugging = function(method) {
		return function() {
			try {
				if (home.PRINT_CALLS) {
					var indent = "";
					for (var i = 0; i < callStack.length; i++) {
						indent += "  ";
					}
					if (window.st && st.console) {
						if (this._theClass == undefined) {
							st.console.log(indent + this._classname + "." + arguments.callee.methodName);
						} else {
							st.console.log(indent + this._theClass._classname + "." + arguments.callee.methodName);
						}
					}
				}
				var result = method.apply(this, arguments);
				return result;
			} catch (e) {
				if (e.DontDebug === DontDebugMarker) {
					throw e;
				} else if (home.DEBUG) {
					debugger;
				}else {
					/* is an ST Exception */
					throw e;
				}
			}
		}
	};

	// hide real method behind a wrapper method which catches exceptions
	var __nonLocalReturn = function(method) {
		// this is a wrapper for method invocation
		return function() {
			var lastCallee = new MethodContext(this, method);
			callStack.push(lastCallee);
			try {
				var ret =  method.apply(this, arguments);
				callStack.pop();
				return ret;
			}
			catch( e ) {
				callStack.pop();
				e.method = method;
				if ( e === lastCallee ) {
					return e.nonLocalReturnValue;
				} else {
					throw e;
				}
			}
		};
	};

	/*********** <PRELOAD> ********************/

	home.stubClass('Metaclass');
	home.stubClass('Class');

	home["Metaclass class"] = home.Metaclass._newInstance();
	home["Metaclass class"]._instancePrototype = function() {};
	home["Metaclass class"]._instancePrototype.prototype._theClass = home["Metaclass class"];
	home["Metaclass class"]._classname = 'Metaclass class';

	// Metaclass is also instance from Metaclass class
	home.Metaclass.__proto__ = home["Metaclass class"]._instancePrototype.prototype;

	/*********** </PRELOAD> *******************/

})();
