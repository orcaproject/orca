
// Runtime depends on: boxing.js

(function() {

	st.Array._addInstanceMethods({
		_privateGet: function(index) {
			return st.box(st.unbox(this)[index]);
		},
		_privateSet: function(index, obj) {
			st.unbox(this)[index] = st.unbox(obj);
		},
		
		size: function(){
			return st.number(st.unbox(this).length);
		},
		at_put_: function(idx, val){
			this._privateSet(st.unbox(idx) - 1, val);
			return val;
		},
		at_: function(idx){
			return this._privateGet(st.unbox(idx) - 1);
		},
		isEmpty: function(){
			return st.bool(st.unbox(this).length == 0);
		},
		
		/* this is actually not a primitive and should be implemented by squeak.
		   it is only implemented here to work around a hardly tracable bug, probably in out blocks
		   and nonlocal return */
		includes_: function(anElement) {
			for (var i = 0; i < st.unbox(this).length; i++) {
				if (st.unbox(this._privateGet(i)._equals(anElement)))
					return st.true;
			}
			return st.false;
		},
		asObject: function () {
			// creates Prototype from object literal
			// Can only be called on arrays containing only Associations (understanding key()/value())
			var newObject = {};
			for (var i = 0; i < st.unbox(this).length; i++) {
				var anAssociation = this._privateGet(i);
				newObject[st.unbox(anAssociation.key())] = st.unbox(anAssociation.value());
			}
			// Box the resulting primitive object, that is filled with unboxed values.
			return st.box(newObject);
		}
	});
	st.Array._addClassMethods({
		new_: function(size) {
			// Not filling the indices of the array with 'nil', because of autoboxing
			return st.array(new Array(st.unbox(size)));
		}
	});

})();
