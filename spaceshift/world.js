package("spaceshift", function(spaceshift){
	"use strict";

	var g = depends("spaceshift.g");

	spaceshift.World = World;
	function World(){
		this.ships = {};
		this.player = "";
		this.bullets = [];

		this.halfsize = new g.V2(200, 200);
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

				ship.energy = sship.energy;
				ship.cooldown = sship.cooldown;
				ship.invulnerable = sship.invulnerable;

				world.ships[ship.id] = ship;
			});

			world.bullets = [];
			for(var i = 0; i < state.bullets.length; i++){
				var sbullet = state.bullets[i];
				var bullet = new Bullet();
				bullet.shooter = sbullet.shooter;
				bullet.position.x = sbullet.position.x;
				bullet.position.y = sbullet.position.y;
				bullet.velocity.x = sbullet.velocity.x;
				bullet.velocity.y = sbullet.velocity.y;

				world.bullets.push(bullet);
			}

			world.halfsize.x = state.halfsize.x;
			world.halfsize.y = state.halfsize.y;
		},
		render: function(dt, context){
			var world = this;

			context.lineWidth = 3;
			context.strokeStyle = "#d66";
			context.beginPath();
			context.rect(
				-world.halfsize.x, -world.halfsize.y,
				2*world.halfsize.x, 2*world.halfsize.y);
			context.stroke();


			foreach(world.ships, function(ship){ ship.render(dt, context); });
			for(var i = 0; i < world.bullets.length; i++){
				var bullet = world.bullets[i];
				bullet.render(dt, context);
			}
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

		this.energy = 1;
		this.cooldown = 1;
		this.invulnerable = 3;
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

			this.cooldown -= dt;
			this.invulnerable -= dt;

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

				if(ship.invulnerable > 0) {
					context.beginPath()
					context.arc(0, 0, 10, 0, g.TAU);

					var alpha = ship.invulnerable > 1 ? 1 : ship.invulnerable;
					context.strokeStyle = "hsla(" + (g.R(90, 150)|0) + ", 80%, 80%, " + alpha + ")";
					context.stroke();
				}

				{
					var W = 16, H = 1;
					var w = W * (ship.energy < 0 ? 0 : ship.energy);
					context.beginPath();
					context.rect(-W/2, -8, w, H);
					context.fillStyle = "#aaf";
					context.fill();

					context.beginPath();
					context.rect(-W/2, -8, W, H);
					context.strokeStyle = "#aaf";
					context.lineWidth = 0.1;
					context.stroke();
				}

				context.fillStyle = "#ccc";
				context.font = (12 / context.SCALE) + "px Courier";
				context.fillText(ship.id, -14, -5);

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

				var color = (parseInt(ship.id) * 1.618 * 360 / g.TAU) | 0;
				context.fillStyle = "hsla(" + color + ", 70%, 70%, 1)";
				context.fill();

				if(ship.cooldown > 0) {
					var cooldown = ship.cooldown > 1 ? 0.5 : ship.cooldown / 2;
					context.lineWidth = 1;
					context.strokeStyle = "hsla(0, 100%, 50%, " + cooldown + ")";
					context.stroke();
				}
			}
			context.restore();
		}
	};

	spaceshift.Bullet = Bullet;
	function Bullet(){
		this.shooter = "";
		this.position = new g.V2(0, 0);
		this.velocity = new g.V2(0, 0);
	}

	Bullet.prototype = {
		update: function(dt){
			var bullet = this;

			bullet.position.x += dt * bullet.velocity.x;
			bullet.position.y += dt * bullet.velocity.y;
		},
		render: function(dt, context){
			var bullet = this;

			context.save();
			{
				context.translate(-bullet.position.x, -bullet.position.y);

				context.beginPath()
				context.arc(0, 0, 1, 0, g.TAU);

				var color = (parseInt(bullet.shooter) * 1.618 * 360 / g.TAU) | 0;
				context.fillStyle = "hsla(" + color + ", 70%, 70%, 1)";
				context.fill();
			}
			context.restore();
		}
	};

});