
lychee.define('harvester.mod.Fertilizer').tags({
	platform: 'node'
}).requires([
	'harvester.data.Filesystem'
]).supports(function(lychee, global) {

	if (typeof global.require === 'function') {

		try {

			global.require('child_process');

			return true;

		} catch (err) {

		}

	}


	return false;

}).exports(function(lychee, global, attachments) {

	const _child_process = global.require('child_process');
	const _setInterval   = global.setInterval;
	const _Filesystem    = lychee.import('harvester.data.Filesystem');
	let   _ACTIVE        = false;
	const _CACHE         = {};
	const _QUEUE         = [];
	const _ROOT          = new _Filesystem().root;



	/*
	 * FEATURE DETECTION
	 */

	(function(cache) {

		_setInterval(function() {

			if (_ACTIVE === false) {

				let tmp = _QUEUE.splice(0, 1);
				if (tmp.length === 1) {

					_ACTIVE = true;
					_fertilize(tmp[0].project, tmp[0].target);

				}

			}

		}, 1000);

	})(_CACHE);



	/*
	 * HELPERS
	 */

	const _is_cached = function(id, target, pkg) {

		let cache = _CACHE[id] || null;
		if (cache !== null) {

			if (cache[target] === pkg) {
				return true;
			}

		}

		return false;

	};

	const _fertilize = function(project, target) {

		_child_process.execFile(_ROOT + '/bin/fertilizer.sh', [
			target,
			project
		], {
			cwd: _ROOT
		}, function(error, stdout, stderr) {

			_ACTIVE = false;

			if (error || stdout.indexOf('SUCCESS') === -1) {
				console.error('harvester.mod.Fertilizer: FAILURE ("' + project + ' | ' + target + '")');
			} else {
				console.info('harvester.mod.Fertilizer: SUCCESS ("' + project + ' | ' + target + '")');
			}

		});

	};



	/*
	 * IMPLEMENTATION
	 */

	const Module = {

		/*
		 * ENTITY API
		 */

		// deserialize: function(blob) {},

		serialize: function() {

			return {
				'reference': 'harvester.mod.Fertilizer',
				'arguments': []
			};

		},



		/*
		 * CUSTOM API
		 */

		can: function(project) {

			let id  = project.identifier;
			let pkg = project.package;

			if (id.indexOf('__') === -1 && pkg !== null) {

				let build = pkg.json.build || null;
				if (build !== null) {

					let environments = build.environments || null;
					if (environments !== null) {

						let targets = Object.keys(environments).filter(function(target) {
							return _is_cached(id, target, pkg) === false;
						});

						if (targets.length > 0) {
							return true;
						}

					}

				}

			}


			return false;

		},

		process: function(project) {

			let id  = project.identifier;
			let pkg = project.package;

			if (project.filesystem !== null && pkg !== null) {

				let build = pkg.json.build || null;
				if (build !== null) {

					let environments = build.environments || null;
					if (environments !== null) {

						Object.keys(environments).filter(function(target) {
							return _is_cached(id, target, pkg) === false;
						}).forEach(function(target) {

							let cache = _CACHE[id] || null;
							if (cache === null) {
								cache = _CACHE[id] = {};
							}

							cache[target] = pkg;

							_QUEUE.push({
								project: id,
								target:  target
							});

						});

					}

				}

			}

		}

	};


	return Module;

});

