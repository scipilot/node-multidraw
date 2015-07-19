/**
 * Uses the http://touchpunch.furf.com enhancement for JQ UI draggable.
 */
TilesPlugin = function ($, socket) {

	var canvasName = $('#canvasName').text();
	var tiles = [];
	var self = this; // event closure buster

	var settings = {
		liveDrag: true,
		graphemeTrayVisible: false
	};

	// UI -----------------------------------------------------------------------

	$('div#grapheme-tiles-tray').droppable({
		accept: ".grapheme-tile",
		drop: function( event, ui ) {
			socket.emit('drop',{
				'canvasName': canvasName,
				'grapheme': $(ui.draggable).text()
			})
		}
	});

	// Admin
	$("#graphemeStimulusButton").click(function(){
		sendAllTilesPosition();
	});

	$("#graphemeDragLive").change(function(){
		settings.liveDrag = $('#graphemeDragLive').prop('checked');
		$("#graphemeStimulusButton").toggle(!settings.liveDrag);
	});

	$("#graphemeTrayVisible").change(function(){
		settings.graphemeTrayVisible = $('#graphemeTrayVisible').prop('checked');
		// Tell the server, it broadcasts to all clients.
		socket.emit('setOption', {key:'graphemeTrayVisible', val:settings.graphemeTrayVisible})
	});

	// SOCKET FUNCTIONS ---------------------------------------------------------

	socket.on('options', function(options){
		console.log('TILES received options:', options);

		settings.graphemeTrayVisible = (options.graphemeTrayVisible == "true");

		console.log('TILES settings.graphemeTrayVisible:', settings.graphemeTrayVisible);
		if(SciWriter.role == 'admin'){
			$('#graphemeTrayVisible').prop('checked', settings.graphemeTrayVisible);
		}
		else {
			$('div#grapheme-tiles-tray').css('visibility', settings.graphemeTrayVisible ? 'visible' : 'hidden');
		}
	});

	// data.text is a space-separate list of graphemes
	socket.on('stimulus', function(data){
		console.log('TILES received stimulus:', data);

		clearTiles();

		if(data.text) data.text.split(' ').map(makeTile);
	});

	// server is telling us someone is dragging
	socket.on('drag', function (data) {
		//		console.log('drag', data);
		// todo: doesn't allow two of the same tile! use a GUID...
		$('#tile-'+data.grapheme)
			.css('top', data.y)
			.css('left', data.x)
			.css('visibility', 'visible')
		;
	});

	// hide back into a hidden tray
	socket.on('drop', function (data) {
		console.log('TILES got drop', data);
		//$('#tile-'+data.grapheme).css('visibility', settings.graphemeTrayVisible ? 'visible' : 'hidden');
		$('#tile-'+data.grapheme).css('visibility', 'inherit');
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

		// note CSS layout is float:left, so they just form a horizontal list

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
			// it's a bit of a hack, to send a fake drag for all tiles above the tray, i.e. on the canvas,
			// limit to only those, because the on-drag above shows the tile - again a bit side-effecty.
			// perhaps we should track dropped in/out of the tray with a css class?
			if(parseFloat(this.style.top) < 0)
				socket.emit('drag', {
					'x': this.style.left,
					'y': this.style.top,
					'canvasName': canvasName,
					'grapheme': $(this).text()
				})
		});
	}

	return this;
};
