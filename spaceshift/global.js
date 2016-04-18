package("global", function(global){
	"use strict";

	var spaceshift = depends("spaceshift");
	var g = depends("spaceshift.g");

	var key = depends("spaceshift.key");

	global.canvas = document.getElementById("view");
	global.view = {
		size: { x: 600, y: 600 }
	};

	var connected = false

	global.comm = new WebSocket("ws://" + window.location.host + "/live");
	global.comm.onmessage = listen;
	global.comm.onopen = opened;
	global.comm.onclose = refresh;
	global.comm.onerror = refresh;

	global.world = new spaceshift.World();

	function opened(){
		connected = true
		console.log("CONNECTION OPEN: ", opened);
	}
	function listen(ev){
		var message = JSON.parse(ev.data);
		if(message.Type == "welcome"){
			global.input.id = message.Data
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

	global.input = {
		id: "",
		turn: 0,
		thrust: 0,
		fire: false
	};

	var context = global.canvas.getContext("2d");
	function render(){
		context.fillStyle = "#333";
		context.fillRect(0, 0, global.view.size.x, global.view.size.y);

		if(!connected){
			return;
		}

		context.save();
		{
			context.translate(global.view.size.x/2, global.view.size.y/2);
			context.SCALE = 2;
			context.scale(context.SCALE,context.SCALE);

			var player = global.world.ships[global.input.id];
			if(player){
				context.translate(player.position.x, player.position.y);
			}

			context.fillStyle = "#fff";
			context.fillRect(-1,-1,1,1);

			{
				// update player input
				global.input.thrust = 0;
				global.input.turn = 0;
				global.input.fire = key.pressed[key.Code.E];
				global.input.dash = key.pressed[key.Code.Q];

				if(key.pressed[key.Code.A]){
					global.input.turn -= 1;
				}
				if(key.pressed[key.Code.D]){
					global.input.turn += 1;
				}
				if(key.pressed[key.Code.W]){
					global.input.thrust += 1;
				}
				if(key.pressed[key.Code.S]){
					global.input.thrust -= 1;
				}

				global.comm.send(JSON.stringify(global.input))
			}

			{
				// update world
				global.world.update(0.033);
			}

			{
				// render world
				global.world.render(0.033, context);
			}
		}
		context.restore();

		var ships = [];
		foreach(global.world.ships, function(ship){
			ships.push(ship);
		});

		ships.sort(function(a,b){
			return a.points < b.points;
		});


		var y = 28;
		var x = 20;

		context.fillStyle = "#FFF";
		context.font = "14px Courier";
		for(var i = 0; i < ships.length; i++){
			var ship = ships[i];
			if(ship.ai){
				context.fillText(ship.id + " = " + ship.points + "[AI]", x, y);
			} else {
				context.fillText(ship.id + " = " + ship.points, x, y);
			}
			y += 16;
		}

		context.fillStyle = "hsla(0,0%,100%,0.1)";
		context.fillRect(10, 10, 150, y - 14);
	}

	function foreach(obj, fn){
		for(var name in obj){
			if(obj.hasOwnProperty(name)){
				fn(obj[name]);
			}
		}
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