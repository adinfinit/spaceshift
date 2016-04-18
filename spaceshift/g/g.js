package("spaceshift.g", function(g){
	"use strict";

	g.TAU = Math.PI * 2;
	g.R = R;
	function R(low, high){
		return (high - low) * Math.random() + low;
	}

	g.V2 = V2;
	function V2(x, y){
		this.x = x;
		this.y = y;
	};


	V2.prototype = {
		length2: function(){
			return this.x * this.x + this.y * this.y;
		},
		length: function(){
			return Math.sqrt(this.x * this.x + this.y * this.y);
		}
	};

	g.U = function(x) {
		return x < -1 ? -1 : x > 1 ? 1 : x;
	};

	g.U2 = function(v){
		var n = new V2(v.x, v.y);
		var d = v.length();
		n.x /= d;
		n.y /= d;
		return n;
	};
});