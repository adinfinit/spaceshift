package("spaceshift.key", function(key){
	key.pressed = [];
	for(var i = 0; i < 256; i++){
		key.pressed[i] = false;
	}

	key.Code = {
		A: 65,
		D: 68,
		S: 83,
		W: 87,
		Q: 81,
		E: 69,

		Left: 37,
		Right: 39,
		Up: 38,
		Down: 40,

		Space: 32,
		Shift: 16
	};

	window.onkeydown = function(ev){
		key.pressed[ev.keyCode] = true;
	};
	window.onkeyup = function(ev){
		key.pressed[ev.keyCode] = false;
	};
});