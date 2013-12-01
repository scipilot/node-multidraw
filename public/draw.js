$(function(){
    if(!('getContext' in document.createElement('canvas'))){
	alert('Sorry, it looks like your browser does not support canvas!');
	return false;
    }

    var doc = $(document),
    win = $(window),
    canvas = $('#paper'),
    ctx = canvas[0].getContext('2d'),
    instructions = $('#instructions'),
    optionTabOpen = true;
    setColor = '#000';
    
    // Generate an unique ID
    var id = Math.round($.now()*Math.random());
    
    // A flag for drawing activity
    var drawing = false;

    var clients = {};
    var cursors = {};

    var socket = io.connect();
    
    socket.on('moving', function (data) {
	
	if(! (data.id in clients)){
	    // a new user has come online. create a cursor for them
	    cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
	}
	
	// Move the mouse pointer
	cursors[data.id].css({
	    'left' : data.x,
	    'top' : data.y
	});
	
	// Is the user drawing?
	if(data.drawing && clients[data.id]){
	    
	    // Draw a line on the canvas. clients[data.id] holds
	    // the previous position of this user's mouse pointer
	    
	    drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y, data.color);
	}
	
	// Saving the current client state
	clients[data.id] = data;
	clients[data.id].updated = $.now();
    });

    var prev = {};
    
    canvas.on('mousedown',function(e){
	e.preventDefault();
	drawing = true;
	prev.x = e.pageX;
	prev.y = e.pageY;
	
	// Hide the instructions
	instructions.fadeOut();
    });
    
    doc.bind('mouseup mouseleave',function(){
	drawing = false;
    });

    var lastEmit = $.now();

    doc.on('mousemove',function(e){
	if($.now() - lastEmit > 30){
	    socket.emit('mousemove',{
		'x': e.pageX,
		'y': e.pageY,
		'drawing': drawing,
		'id': id,
		'color': setColor
	    });
	    lastEmit = $.now();
	}
	
	// Draw a line for the current user's movement, as it is
	// not received in the socket.on('moving') event above
	
	if(drawing){
	    
	    drawLine(prev.x, prev.y, e.pageX, e.pageY, setColor);
	    
	    prev.x = e.pageX;
	    prev.y = e.pageY;
	}
    });

    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function(){
	
	for(ident in clients){
	    if($.now() - clients[ident].updated > 10000){
		
		// Last update was more than 10 seconds ago. 
		// This user has probably closed the page
		
		cursors[ident].remove();
		delete clients[ident];
		delete cursors[ident];
	    }
	}
	
    },10000);

    function drawLine(fromx, fromy, tox, toy, color){
	ctx.beginPath(); //need to enclose in begin/close for colour settings to work
	ctx.strokeStyle = color;
	ctx.moveTo(fromx, fromy);
	ctx.lineTo(tox, toy);
	ctx.stroke();
	ctx.closePath();
    }

    $('.c').click(function(){
	console.log($(this).css("background-color"));
	setColor = $(this).css("background-color");
    });

    $('#optionPanelTab').click(function(){
	if(optionTabOpen){
	    $('#optionPanel').animate({right: -80});
	    optionTabOpen = false;
	} else {
	    $('#optionPanel').animate({right: 0});
	    optionTabOpen = true;
	}

    });

});
