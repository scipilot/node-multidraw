/**
 * Uses the http://touchpunch.furf.com enhancement for JQ UI draggable.
 */
TilesPlugin = function ($) {

	var canvasName = $('#canvasName').text();
	var tiles = [];
	var self = this; // event closure buster

	var settings = {
		liveDrag: true
	};

	// UI -----------------------------------------------------------------------
	$("#graphemeStimulusButton").click(function(){
		sendAllTilesPosition();
	});

	$("#graphemeDragLive").change(function(){
		settings.liveDrag = $('#graphemeDragLive').prop('checked');
		$("#graphemeStimulusButton").toggle(!settings.liveDrag);
	});

	// SOCKET FUNCTIONS ---------------------------------------------------------
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

		if(data.text) data.text.split(' ').map(makeTile);
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


	// TILE FUNCTIONS -----------------------------------------------------------

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
				if(settings.liveDrag){
					socket.emit('drag', {
						'x': ui.position.left,
						'y': ui.position.top,
						'canvasName': canvasName,
						'grapheme': grapheme
					});
				}
			}
		});
	}

	function sendAllTilesPosition(){
		$('.grapheme-tile').each(function(){
			socket.emit('drag', {
				'x': this.style.left,
				'y': this.style.top,
				'canvasName': canvasName,
				'grapheme': $(this).text()
			})
		});
	}
};
