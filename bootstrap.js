
// Make JsGlobal alert: 'something' work out of the box
// Not really needed... !? TODO this object should be accessible through a js-keyword or something, parse it directly instead of JsGlobal
var JsGlobal = this;

// Each function can be instantiated like a Squeak-object. This feels kind of like a hack... TODO Is there a cleaner way?
Function.prototype._new = function(){
 var obj = {};
 this.apply(obj, arguments);
 return obj;
};

// Function called when a method with an unimplemented primitive declaration is called
var primitiveDeclaration = function(){ alert("Primitive has been called!!! The code is: \n\n" + arguments.callee.caller) };

// instead of bool(true) and bool(false) (which would be the equivalent to string(""), number(2) etc.)
var _true = True._newInstance();
var _false = False._newInstance();
var nil = null; //UndefinedObject._newInstance();

// 
// Each object can convert itself into a js-only version. Used to unpack primitive values like Strings and Numbers from
// their Squeak-wrapper-objects. As short as possible, as it is called on every argument of js-library-calls.
// A js-function is also added to the prototype of the js-primitive Object (but at the very end of all our scripts).
// 
_Object._addInstanceMethods( { js: function() { 
	alert("Trying to pass a Squeak-object into a javascript-library-call! " + this); } } );
False._addInstanceMethods( { js: function() { return false; } } );
True._addInstanceMethods( { js: function() { return true; } } );
ByteString._addInstanceMethods( { js: function() { return this.string$; } } );
_Number._addInstanceMethods( { js: function() { return this.num$; } } );
Character._addInstanceMethods( { js: function() { return this.character$; } } );
_Array._addInstanceMethods( { js: function() { return this.arr$; } } );
BlockClosure._addInstanceMethods( { js: function() { 
	return this.func$; } } );

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

var number = function(number) {
  var resultNumber = Float._newInstance();
  resultNumber.num$ = number;
  return resultNumber;
}

var array = function(anArray) {
  var resultArray = _Array._newInstance();
  resultArray.arr$ = anArray;
  return resultArray;
}

var block = function(func, that) {
	var b = BlockClosure._newInstance();
	b.creationContext$ = arguments.callee.caller;
	
	b.func$ = function() {
		try {
			ret = func.apply(that, arguments);
			if (ret != undefined) {
			  if(ret.creationContext$ == func) {
				  ret.creationContext$ = this.creationContext$;
			  }
		  }
			return ret;
		}
		catch(e) {
			if(e == func) {
				this.creationContext$.nonLocalReturnValue = e.nonLocalReturnValue;
				throw this.creationContext$;
			} 
			else {
				throw e;
			}
		}
	}
	b.func$.creationContext$ = arguments.callee.caller;
	
	return b;
};