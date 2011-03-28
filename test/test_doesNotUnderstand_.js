// Here, we test the doesNotUnderstandSends

S2JTests.setupSqueakEnvironment();

Class("DoesNotUnderstandTester", { 
	superclass: _Object,
	classInstanceVariables: [ ],
	instanceVariables: [ "lastDoesNotUnderstand" ],
	
	instanceMethods: {
		
		setUp: function(){
			this.$lastDoesNotUnderstand = "";
		},
		
		testdoesNotUnderstand: function (){
			this.ifTrue_();
			assert(this.$lastDoesNotUnderstand._equals(string("ifTrue_")).not().js(), 
				"Although we are within the JavaScriptWorld, the doesNotUnderstand comes from Smalltalk and therefore, the symbol should be the Smalltalk selector-Name.");
			assert(this.$lastDoesNotUnderstand._equals(string("ifTrue:")).js());
		},
		
		doesNotUnderstand_: function (aMessage){
			this.$lastDoesNotUnderstand = aMessage.selector();
		}
	}
	
});

DoesNotUnderstandTester._newInstance();
