package("spaceshift.key", function(key){
	key.pressed = [];
	for(var i = 0; i < 256; i++){
		key.pressed[i] = false;
	}

	key.Code = {
		A: 65,
		D: 68,
		S: 84,
		W: 87
	};

	window.onkeydown = function(ev){
		key.pressed[ev.keyCode] = true;
	};
	window.onkeyup = function(ev){
		key.pressed[ev.keyCode] = false;
	};
});