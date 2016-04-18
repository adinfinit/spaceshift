(function(global){
	global.package = function package(name, init){
		if(name == ""){
			throw new Error("package name cannot be empty");
		}

		var info = package.find(name);
		if(package.debug){
			if(info.created){
				console.log("loading: ", name);
			} else {
				console.log("extending: ", name);
			}
		}

		var exports = init(info.namespace);
		if(exports !== undefined) {
			for(var name in exports){
				if(exports.hasOwnProperty(name)){
					info.namespace[name] = exports[name];
				}
			}
		}
	};
	package.debug = false;

	global.package.find = function find(name){
		var created = false;
		var path = name.split(".");
		var namespace = global;

		for(var i = 0; i < path.length; i++){
			var token = path[i];
			var next = namespace[token];
			if(next){
				created = false
			} else {
				next = {};
				namespace[token] = next;
				created = true;
			}
			namespace = next;
		}

		return {
			namespace: namespace,
			created: created
		};
	};

	global.package.test = function test(name, run){
		run(global.package.test.fail, global.package.test.expect);
	};
	global.package.test.fail = function(reason){
		throw new Error(reason);
	};

	global.package.test.expect = function(expected, got){
		if(!Object.equals(expected, got)){
			console.log(expected, got);
			throw new Error("expected " + JSON.stringify(expected) + " " + "got " + JSON.stringify(got));
		}
	};

	global.depends = function depends(name){
		var info = package.find(name);
		if(info.created){
			throw new Error("package " + name + " not initialized.");
		}
		return info.namespace;
	};
})(window || this);