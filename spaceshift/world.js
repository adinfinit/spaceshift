package("spaceshift", function(spaceshift){
	"use strict";

	var g = depends("spaceshift.g");

	spaceshift.World = World;
	function World(){
		this.ships = {};
		this.player = "";
		this.bullets = [];
	}

	World.prototype = {
		update: function(dt){
			var world = this;

			// world.ships.forEach(function(ship){ ship.update(dt); });
			// world.bullets.forEach(function(bullet){ bullet.update(dt); });
		},
		sync: function(state){
			var world = this;

			world.ships = {};
			foreach(state.ships, function(sship){
				var ship = new Ship();
				ship.id = sship.id;

				ship.orientation = sship.orientation;
				ship.position.x = sship.position.x;
				ship.position.y = sship.position.y;
				ship.velocity.x = sship.velocity.x;
				ship.velocity.y = sship.velocity.y;
				ship.force.x = sship.force.x;
				ship.force.y = sship.force.y;
				ship.mass = sship.mass;

				world.ships[ship.id] = ship;
			})
		},
		render: function(dt, context){
			var world = this;

			foreach(world.ships, function(ship){ ship.render(dt, context); });
			//Object.values(world.bullets).
			//	forEach(function(bullet){ bullet.render(dt, context); });
		}
	};

	function foreach(obj, fn){
		for(var name in obj){
			if(obj.hasOwnProperty(name)){
				fn(obj[name]);
			}
		}
	}

	spaceshift.Ship = Ship;
	function Ship(){
		this.id = "";

		this.orientation = 0;
		this.position = new g.V2(0, 0);
		this.velocity = new g.V2(0, 0);
		this.force = new g.V2(0,0);
		this.mass = 100;

		// inputs
		this.thrust = 0; // between -1, 1
		this.turn = 0; // between -1, 1
	}

	Ship.prototype = {
		resetForce: function(){
			var ship = this;

			ship.force.x = 0;
			ship.force.y = 0;
		},
		update: function(dt){
			var ship = this;
			ship.resetForce();

			ship.force.x = -10000 * ship.thrust * Math.cos(ship.orientation);
			ship.force.y = -10000 * ship.thrust * Math.sin(ship.orientation);

			ship.orientation += g.TAU * g.U(ship.turn) * dt;

			ship.velocity.x += dt * ship.force.x / ship.mass;
			ship.velocity.y += dt * ship.force.y / ship.mass;

			ship.velocity.x *= 0.99;
			ship.velocity.y *= 0.99;

			ship.position.x += dt * ship.velocity.x;
			ship.position.y += dt * ship.velocity.y;
		},
		render: function(dt, context){
			var ship = this;

			context.save();
			{
				context.translate(-ship.position.x, -ship.position.y);

				context.fillStyle = "#ccc";
				context.font = "8px Courier";
				context.fillText(ship.id, -6, -6);

				context.rotate(ship.orientation);

				if(ship.force.length2() > 0.1){
					context.beginPath();
					context.moveTo(0, 0);
					context.lineTo(-4, -2);
					context.lineTo(-8, 0);
					context.lineTo(-4, 2);
					context.closePath();

					context.fillStyle = "hsla(" + (g.R(-30, 30)|0) + ", 100%, 50%, 1)"
					context.fill();
				}

				context.beginPath();
				context.moveTo(-4, -2.5);
				context.lineTo(-4,  2.5);
				context.lineTo( 4,  0.0);
				context.closePath();

				// context.strokeStyle = "hsla(0, 70%, 70%, 1)";
				var color = (parseInt(ship.id) * 1.618 * 360 / g.TAU) | 0;
				context.fillStyle = "hsla(" + color + ", 70%, 70%, 1)";
				context.fill();
			}
			context.restore();
		}
	};

});