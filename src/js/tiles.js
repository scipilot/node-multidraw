/**
 * Uses the http://touchpunch.furf.com enhancement for JQ UI draggable.
 *
 */

TilesPlugin = function ($) {

	if (!('getContext' in document.createElement('canvas'))) {
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	var doc = $(document),
		canvas = $('#paper'),
		context = canvas[0].getContext('2d');
	var canvasName = $('#canvasName').text();
	var dragging = false;
	var tiles = [];
	var prev = {};

	var settings = {
		//lineWidth: options.penSize
	};

	var socket = io.connect();

	socket.on('connect', function () {

//		socket.emit('drawActionHistory', {
//			canvasName: canvasName
//		});

		// todo: make the test session handling a plugin module - not in the main draw.js
		if(typeof(SciWriter.sessionName) != "undefined"){
			// Note this will result in a 'stimulus' response, which is also sent from admin-UI on demand during sessions.
			socket.emit('getSession', {
				sessionName: SciWriter.sessionName,
				pageNo: SciWriter.pageNo
			});
		}


		// todo create the tiles from CMS?
		makeTile('b');
		makeTile('a');
		makeTile('t');

	});

//	socket.on('moving', function (data) {
//	});

	canvas.on('mousedown', function (e) {
		touchMouseDown(e, e.pageX, e.pageY);
	});
	canvas.on('touchstart', function (e) {
		if (!e) e = event;
		//		pageX = e.targetTouches[0].pageX; // from Apple's tutorials, but targetTouches doesn't exist?!
		//		pageY = e.targetTouches[0].pageY;
		// First we need to move to the new touch point, without drawing. This emulates a mouse's "moving while up" (hover) which touch doesn't have.
		// 	(otherwise we get a spurious line drawn between the last up point and this down point)
		touchMouseMove(e, e.originalEvent.pageX, e.originalEvent.pageY);
		touchMouseDown(e, e.originalEvent.pageX, e.originalEvent.pageY);
	});

	// handler either touch or mousedown
	function touchMouseDown(e, pageX, pageY) {
		e.preventDefault();

		dragging = true;

		prev.x = pageX;
		prev.y = pageY;
		pastDragX = pageX;
		pastDragY = pageY;

		// work out if we hit a tile

	}

	doc.bind('mouseup mouseleave', touchMouseUp);
	doc.bind('touchend', function () {
		touchMouseUp();
	});
	// handles both touch or mouse up
	function touchMouseUp() {
		dragging = false;
	}

	var lastEmit = $.now();

	doc.on('mousemove', function (e) {
		touchMouseMove(e, e.pageX, e.pageY);
	});
	doc.on('touchmove', function (e) {
		touchMouseMove(e, e.originalEvent.pageX, e.originalEvent.pageY);
	});
	// handles either touch or mouse move
	function touchMouseMove(e, pageX, pageY) {
		if ($.now() - lastEmit > 10) {
			socket.emit('mousemove', {
				'x': pageX,
				'y': pageY,
				'drawing': dragging,
//				'id': id,
//				'tile': tile,
				'canvasName': canvasName
			});
			lastEmit = $.now();
		}

		if (dragging) {

//			tiles[data.id].css({
//				'left': data.x,
//				'top': data.y
//			});

			prev.x = pageX;
			prev.y = pageY;
		}
	}

	function makeTile(grapheme){
		var jTile = $('<div class="tile draggable">'+grapheme+'</div>');
		tiles.push(jTile);
		$('div#tiles-overlay').append(jTile);
		jTile.draggable();
	}
};
