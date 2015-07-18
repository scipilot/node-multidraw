/**
 * Uses the http://touchpunch.furf.com enhancement for JQ UI draggable.
 */
TilesPlugin = function ($) {

	var canvasName = $('#canvasName').text();
	var tiles = [];

	var settings = {
	};

	var socket = io.connect();

	socket.on('connect', function () {

		// todo: make the test session handling a plugin module - not in the main draw.js
		if(typeof(SciWriter.sessionName) != "undefined"){
			// Note this will result in a 'stimulus' response, which is also sent from admin-UI on demand during sessions.
			socket.emit('getSession', {
				sessionName: SciWriter.sessionName,
				pageNo: SciWriter.pageNo
			});
		}
	});

	// data.text is a space-separate list of graphemes
	socket.on('stimulus', function(data){
		console.log('stimulus', data);

		clearTiles();

		var gs = data.text.split(' ');
		var i;
		gs.map(makeTile);

	});

	// server is telling us someone is dragging
	socket.on('drag', function (data) {
//		console.log('drag', data);
		$('#tile-'+data.grapheme)
			.css('top', data.y)
			.css('left', data.x)
		;
	});

	socket.on('cleared', function(data){
		clearTiles();
	});

	function clearTiles(){
		$('.grapheme-tile').remove();
	}

	function makeTile(grapheme){
		var jTile = $('<div id="tile-'+grapheme+'" class="grapheme-tile draggable">'+grapheme+'</div>');
		tiles.push(jTile);
		var jTray = $('div#grapheme-tiles-tray');
		jTray.append(jTile);

		// position
		// random
		var w = parseFloat(jTray.css('width')) - parseFloat(jTile.css('width'));
		var h = parseFloat(jTray.css('height')) - parseFloat(jTile.css('height'));
		jTile.css('top', Math.random()*h);
		jTile.css('left', Math.random()*w);

		jTile.draggable({
			drag: function( event, ui ) {
				socket.emit('drag', {
					'x': ui.position.left,
					'y': ui.position.top,
					'canvasName': canvasName,
					'grapheme': grapheme
				});
			}
		});
	}
};
