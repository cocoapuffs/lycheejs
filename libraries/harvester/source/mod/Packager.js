
lychee.define('harvester.mod.Packager').requires([
	'harvester.data.Package'
]).exports(function(lychee, global, attachments) {

	const _Package = lychee.import('harvester.data.Package');



	/*
	 * HELPERS
	 */

	const _serialize = function(project) {

		let json = {};
		let tmp  = {};


		try {

			json = JSON.parse(project.filesystem.read('/lychee.pkg'));

		} catch (err) {

			console.error('harvester.mod.Packager: FAILURE ("' + project.identifier + '")');

			try {
				json = JSON.parse(JSON.stringify(project.package.json));
			} catch (err) {
			}

		}

		if (json === null)                      json        = {};
		if (typeof json.api    === 'undefined') json.api    = {};
		if (typeof json.build  === 'undefined') json.build  = {};
		if (typeof json.source === 'undefined') json.source = {};

		json.api.files    = {};
		json.build.files  = {};
		json.source.files = {};

		_walk_directory.call(project.filesystem, tmp, '/api');
		_walk_directory.call(project.filesystem, tmp, '/build');
		_walk_directory.call(project.filesystem, tmp, '/source');

		json.api.files    = tmp.api    || {};
		json.build.files  = tmp.build  || {};
		json.source.files = tmp.source || {};

		json.api.files    = _sort_recursive(json.api.files);
		json.build.files  = _sort_recursive(json.build.files);
		json.source.files = _sort_recursive(json.source.files);

		json.build.tags   = _walk_tags(json.build.files);
		json.source.tags  = _walk_tags(json.source.files);


		return {
			api:    json.api,
			build:  json.build,
			source: json.source
		};

	};

	const _sort_recursive = function(obj) {

		if (obj instanceof Array) {

			return obj.sort();

		} else if (obj instanceof Object) {

			for (let prop in obj) {
				obj[prop] = _sort_recursive(obj[prop]);
			}

			return Object.sort(obj);

		} else {

			return obj;

		}

	};

	const _walk_tags = function(files) {

		let tags = {};

		if (files.platform instanceof Object) {

			tags.platform = {};

			for (let id in files.platform) {
				tags.platform[id] = 'platform/' + id;
			}

		}

		return tags;

	};

	const _walk_directory = function(pointer, path) {

		let that = this;
		let name = path.split('/').pop();

		let info = this.info(path);
		if (info !== null && name.substr(0, 1) !== '.') {

			if (info.type === 'file') {

				let identifier = path.split('/').pop().split('.')[0];
				let attachment = path.split('/').pop().split('.').slice(1).join('.');

				// Music and Sound asset have a trailing mp3 or ogg
				// extension which is dynamically chosen at runtime
				let ext = attachment.split('.').pop();
				if (/(mp3|ogg)$/.test(ext)) {
					attachment = attachment.split('.').slice(0, -1).join('.');
					ext        = attachment.split('.').pop();
				}

				if (/(msc|snd|js|json|fnt|png|md|tpl)$/.test(ext) || path.substr(0, 7) === '/source') {

					if (pointer[identifier] instanceof Array) {

						if (pointer[identifier].indexOf(attachment) === -1) {
							pointer[identifier].push(attachment);
						}

					} else {
						pointer[identifier] = [ attachment ];
					}

				}

			} else if (info.type === 'directory') {

				pointer[name] = {};

				this.dir(path).forEach(function(child) {
					_walk_directory.call(that, pointer[name], path + '/' + child);
				});

			}

		}

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
				'reference': 'harvester.mod.Packager',
				'arguments': []
			};

		},



		/*
		 * CUSTOM API
		 */

		can: function(project) {

			if (project.identifier.indexOf('__') === -1 && project.package !== null && project.filesystem !== null) {

				let diff_a = JSON.stringify(project.package.json);
				let diff_b = JSON.stringify(_serialize(project));
				if (diff_a !== diff_b) {
					return true;
				}

			}


			return false;

		},

		process: function(project) {

			if (project.package !== null) {

				let data = _serialize(project);
				let blob = JSON.stringify(data, null, '\t');
				if (blob !== null) {
					project.filesystem.write('/lychee.pkg', blob);
					project.package = null;
					project.package = new _Package(new Buffer(blob, 'utf8'));
				}

			}

		}

	};


	return Module;

});

