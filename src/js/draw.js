/** This is Tim's original online drawing library.
 * PJ: I initially mangled it by adding all the SciWriter stuff to it, then separated it into a plugin. It should be back to normal.
 * PJ: I also got it working on iPad (manually implementing touchstart etc) but I've since noticed the Hammer lib? needs deduping!
 */
DrawPlugin = function ($, socket) {
	if (!('getContext' in document.createElement('canvas'))) {
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	$('#status').text('Loading...')

	var doc = $(document),
		//win = $(window),
		canvas = $('#paper'),
		context = canvas[0].getContext('2d'),
		instructions = $('#instructions'),
		colourTabOpen = true,
		settingsTabOpen = false,
		setColor = '#000',
		defaultName = "Guest",
		draggingTool = false,
		canvasName = $('#canvasName').text(),
		dragging = false;
	alertify.set({ delay: 1000 * 30 });

	var settings = {
		lineWidth: 3
	};

	var pastDragX = 0, pastDragY = 0;

	// Generate an unique ID
	var id = Math.round($.now() * Math.random());

	// A flag for drawing activity
	var drawing = false;
	//store the last time a ping was sent.
	var lastPing = 0;

	var clients = {};
	var cursors = {};

	if (canvasName === "") {
		canvasName = "lobby";
		$('#canvasName').text('Main Lobby');
	}

	$("#presentation-drawing").show();

	$('#status').text('Connecting...')

	socket.on('connect', function () {
		$('#status').text('Connected').fadeOut(5000);
		socket.emit('drawActionHistory', {
			canvasName: canvasName
		});
	});

	socket.on('moving', function (data) {

		if (!(data.id in clients)) {
			// a new user has come online. create a cursor for them
			cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
		}

		// Move the mouse pointer
		cursors[data.id].css({
			'left': data.x,
			'top': data.y
		});

		// Is the user drawing?
		if (data.drawing && clients[data.id]) {

			// Draw a line on the canvas. clients[data.id] holds
			// the previous position of this user's mouse pointer

			drawLine(context, clients[data.id].x, clients[data.id].y, data.x, data.y, data.color);
		}

		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = $.now();
	});

	socket.on('cleared', function(data){
		if(data.canvasName == canvasName)	clearCanvas();
	});

	function clearCanvas(){
		context.clearRect(0, 0, canvas.width(), canvas.height());
	}

	socket.on('chatmessage', function (data) {
		console.log(data.user + ": " + data.message);
		alertify.log(data.user + ": " + data.message);
	});

	socket.on('drawActionHistory', function (compressedHistory) {
		var i = 0;
		$('#status').text("Decompressing History...");
		var history = lzwCompress.unpack(compressedHistory);
		$('#status').text("Rendering history...");
		//offscreen canvas
		var osc = document.createElement('canvas');
		osc.width = 1900;
		osc.height = 1000;
		var osctx = osc.getContext('2d');

		for (i = 0; i < history.length; i += 1) {
			osctx.beginPath();
			osctx.strokeStyle = history[i].color;
			osctx.lineWidth = settings.lineWidth;
			osctx.lineCap = "round";
			osctx.moveTo(history[i].fromX, history[i].fromY);
			osctx.lineTo(history[i].toX, history[i].toY);
			osctx.stroke();
			osctx.closePath();
		}

		context.drawImage(osc, 0, 0);
		$('#status').text("");
	});

	this.options = function (options){
		setColor = '#'+options.penColour;
		settings.lineWidth = options.penSize;
	};

	/*Respond to server 'pings' */
	socket.on('ping', function (data) {
		socket.emit('pong', id);
	});

	socket.on('pong', function (data) {
		var s, latency;
		latency = $.now() - lastPing;
		lastPing = $.now();
		s = $('#serverStats');
		s.empty();
		s.append("<tr><th>Server Latency</th><td>" + latency + " ms</td></tr>");
		socket.emit('stats');
	});

	socket.on('stats', function (data) {
		var s = $('#serverStats');
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				s.append("<tr><th>" +
					key +
					"</th><td>" +
					data[key] +
					"</td></tr>");
			}
		}
	});

	var prev = {};

	canvas.on('mousedown', function (e) {
		touchMouseDown(e, e.pageX, e.pageY);
	});
	canvas.on('touchstart', function (e) {
		if (!e)  var e = event;
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
		if (!draggingTool) {
			drawing = true;

			prev.x = pageX;
			prev.y = pageY;
			// Hide the instructions
			instructions.fadeOut();
		} else {
			//we're dragging the page around
			dragging = true;
		}
		pastDragX = pageX;
		pastDragY = pageY;
	}

	doc.bind('mouseup mouseleave', touchMouseUp);
	doc.bind('touchend', function () {
		touchMouseUp();
	});
	// handles both touch or mouse up
	function touchMouseUp() {
		drawing = false;
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
		if (!draggingTool) {
			if ($.now() - lastEmit > 10) {
				socket.emit('mousemove', {
					'x': pageX,
					'y': pageY,
					'drawing': drawing,
					'id': id,
					'color': setColor,
					'canvasName': canvasName
				});
				lastEmit = $.now();
			}

			// Draw a line for the current user's movement, as it is
			// not received in the socket.on('moving') event above

			if (drawing) {
				drawLine(context, prev.x, prev.y, pageX, pageY, setColor);

				prev.x = pageX;
				prev.y = pageY;
			}
		} else {
			//we're dragging!
			if (dragging) {
				var curX = parseInt($('#paper').css('left'), 10);
				var curY = parseInt($('#paper').css('top'), 10);
				var dX = e.pageX - pastDragX;
				var dY = e.pageY - pastDragY;
				$('#paper').css({top: curY + dY, left: curX + dX});
				pastDragX = pageX;
				pastDragY = pageY;
			}
		}
	}

	// Remove inactive clients after 10 seconds of inactivity
	setInterval(function () {

		for (ident in clients) {
			if ($.now() - clients[ident].updated > 1000 * 10) {
				cursors[ident].remove();
				delete clients[ident];
				delete cursors[ident];
			}
		}

	}, 1000);

	function drawLine(ctx, fromx, fromy, tox, toy, color) {
		ctx.beginPath(); //need to enclose in begin/close for colour settings to work
		ctx.strokeStyle = color;
		ctx.lineWidth = settings.lineWidth;
		ctx.lineCap = "round";
		ctx.moveTo(fromx, fromy);
		ctx.lineTo(tox, toy);
		ctx.stroke();
		ctx.closePath();
	}

	$('.c').click(function () {
		setColor = $(this).css("background-color");
	});

	//colour picker
	$('#colourPanelTab').click(function () {
		if (colourTabOpen) {
			$('#colourPanel').animate({right: -80}, 200);
			colourTabOpen = false;
		} else {
			$('#colourPanel').animate({right: 0}, 200);
			colourTabOpen = true;
		}

	});

	//settings panel
	$('#settingsPanelTab').click(function () {
		if (!settingsTabOpen) {
			socket.emit('ping', id);
			lastPing = $.now();
			$('#settingsPanel').animate({bottom: 0}, 200);
			settingsTabOpen = true;
		} else {
			$('#settingsPanel').animate({bottom: -320}, 200);
			settingsTabOpen = false;
		}
	});


	var paper = document.getElementById('paper');

	Hammer(document).on("drag", function (e) {
		e.preventDefault();
	});

	Hammer(document).on('dragstart', function (e) {
		e.preventDefault();
	});

	function preventBehavior(e) {
		e.preventDefault();
	}

	document.addEventListener("touchmove", preventBehavior, false);

	/**
	 Chat related
	 */
	$('#chatBox').keyup(function (e) {
		if (e.keyCode == 13) {
			sendMessage();
		}
	});

	$('#statsShow').click(function () {
		$('#serverStats').toggle();
	});

	function sendMessage() {
		var message = $("#chatBox").val();
		var user = $("#usernameInput").val();
		if (user.length < 1) {
			user = defaultName + "-" + id;
		}

		socket.emit('chatmessage', {
			message: message,
			user: user
		});
		alertify.log("You: " + message);
		$('#chatBox').val("");
	}

	//enable/disable the dragging tool
	$('#handTool').click(function () {
		draggingTool = !draggingTool; //toggle state
		if (draggingTool) {
			$('canvas').addClass("canvas-draggable");
			$('#handTool').addClass('active');
		} else {
			$('canvas').removeClass("canvas-draggable");
			$('#handTool').removeClass('active');
			//if they turned off the hand tool animate back
			//this is probably temp untill I get tiling working
			$('#paper').animate({top: 0, left: 0});
		}
	});
};
