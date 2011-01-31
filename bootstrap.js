
// Make JsGlobal alert: 'something' work out of the box
// Not really needed... !? TODO this object should be accessible through a js-keyword or something, parse it directly instead of JsGlobal
var JsGlobal = this;

// Function called when a method with an unimplemented primitive declaration is called
var primitiveDeclaration = function(){ alert("Primitive has been called!!! The code is: \n\n" + arguments.callee.caller) };

// instead of bool(true) and bool(false) (which would be the equivalent to string(""), number(2) etc.)
var _true = True._newInstance();
var _false = False._newInstance();
var nil = UndefinedObject._newInstance();

// Now, that nil is available, initialize all instance-variables of all classes to nil
for (aClass in ALL_CLASSES) {
	ALL_CLASSES[aClass]._initializeInstanceVariables(nil);
}

// This must be called after all primitives have been initialized, as it disturbs the functions _addInstanceMethod, etc.
// Add the js()-function to ech object, to be able to call it without checking. This method is deleted after being called.
JsGlobal.AddJsFunctionToAllObjects = function() {
	Object.prototype.js = function() {
		return this;
	}
	JsGlobal.AddJsFunctionToAllObjects = undefined;
}

// 
// Each object can convert itself into a js-only version. Used to unpack primitive values like Strings and Numbers from
// their Squeak-wrapper-objects. As short as possible, as it is called on every argument of js-library-calls.
// A js-function is also added to the prototype of the js-primitive Object (but at the very end of all our scripts).
// 
_Object._addInstanceMethods( { js: function() { 
	alert("Trying to pass a Squeak-object into a javascript-library-call! " + this); } } );
False._addInstanceMethods( { js: function() { return false; } } );
True._addInstanceMethods( { js: function() { return true; } } );
UndefinedObject._addInstanceMethods( { js: function() { return null; } } );
ByteString._addInstanceMethods( { js: function() { return this.string$; } } );
_Number._addInstanceMethods( { js: function() { return this.num$; } } );
Character._addInstanceMethods( { js: function() { return this.character$; } } );
_Array._addInstanceMethods( { js: function() { return this.arr$; } } );
BlockClosure._addInstanceMethods( { js: function() { return this.func$; } } );

// 
// Functions to bootstrap primitive values and wrap them into 'squeak'-objects
// 

// the compiled code does not use this (uses _true/_false) directly. Can use this in kernel_primitives.js etc.
var bool = function(aBool) {
	if (aBool) {
		return _true;
	} else {
		return _false;
	}
}

var character = function(aString) {
	var resultCharacter = Character._newInstance();
	resultCharacter.character$ = aString;
	return resultCharacter;
}

var string = function(aString) {
	var resultString = ByteString._newInstance();
	resultString.string$ = aString;
	return resultString;
}

var Pool = function(){
	var a = new Array();
	for(var i = -256; i < 256; i++){//MaxInt = 2^53 = 9 007 199 254 740 992
		a[i] = Float._newInstance();
		a[i].num$ = i;
	};
	return a;
}();
var number = function(number) {
	if(Pool[number])
		return Pool[number]
	else {
		var resultNumber = Float._newInstance();
		resultNumber.num$ = number;
		return resultNumber;}
}

var array = function(anArray) {
	var resultArray = _Array._newInstance();
	resultArray.arr$ = anArray;
	return resultArray;
}

var block = function(func) {
	var b = BlockClosure._newInstance();
	func.nonLocalReturnException = CALL_STACK.peek();
	var currentThis = arguments.callee.caller.originalThis;
	if (currentThis == undefined) {
		// We are in the most-outer block of a method. The 'current this' is the top of the call-stack.
		currentThis = CALL_STACK.peek().currentThis;
	}
	func.originalThis = currentThis;
	b.func$ = function() {
		// Use the CALL_STACK to get the object, this block should be executed in
		return func.apply(currentThis, arguments);
	}
	return b;
}

S2JConnection.doIt = function(source) {
  return eval("WithNonLocalReturn(function(){" + source + "}).apply(nil);");
}

var serverBlock = function (squeakCode) {
	// Will be evaluated directly on the server
	// evaluation is needed for the serialization of
	// Smalltalks Object>>storeString method
	return block(function(){
		var args = [ squeakCode ];
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i].js());
		}
		return S2JServer.performOnServer.apply(S2JServer,args);
	});
}
