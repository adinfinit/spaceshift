package("global", function(global){
	"use strict";

	var spaceshift = depends("spaceshift");
	var g = depends("spaceshift.g");

	var key = depends("spaceshift.key");

	global.canvas = document.getElementById("view");
	global.view = {
		size: { x: 600, y: 600 }
	};

	global.comm = new WebSocket("ws://" + window.location.host + "/live");
	global.comm.onmessage = listen;
	global.comm.onopen = opened;
	global.comm.onclose = refresh;
	global.comm.onerror = refresh;

	global.world = new spaceshift.World();

	function opened(){
		console.log("CONNECTION OPEN: ", opened);
	}
	function listen(ev){
		var message = JSON.parse(ev.data);
		if(message.Type == "welcome"){
			global.world.playerID = message.Data
		} else if (message.Type == "sync") {
			global.world.sync(message.Data)
		}
	}

	function refresh(message){
		console.log(message);
		window.setTimeout(function(){
			window.location.reload();
		}, 500)
	}

	var context = global.canvas.getContext("2d");
	function render(){
		context.fillStyle = "#333";
		context.fillRect(0, 0, global.view.size.x, global.view.size.y);

		context.save();
		{
			context.translate(global.view.size.x/2, global.view.size.y/2);
			context.scale(2,2);

			context.fillStyle = "#fff";
			context.fillRect(-1,-1,1,1);

			// update player input
			if(false){
				global.world.player.thrust = 0;
				global.world.player.turn = 0;
				if(key.pressed[key.Code.A]){
					global.world.player.turn -= 1;
				}
				if(key.pressed[key.Code.D]){
					global.world.player.turn += 1;
				}
				if(key.pressed[key.Code.W]){
					global.world.player.thrust += 1;
				}
				if(key.pressed[key.Code.S]){
					global.world.player.thrust -= 1;
				}
			}

			// update world
			global.world.update(0.033);

			// render world
			global.world.render(0.033, context);
		}
		context.restore();
	}

	window.setInterval(render, 30);

	function resize() {
		global.canvas.width = window.innerWidth;
		global.canvas.height = window.innerHeight;

		global.view.size.x = global.canvas.width;
		global.view.size.y = global.canvas.height;
		render();
	}
	window.addEventListener('resize', resize, false); resize();
});