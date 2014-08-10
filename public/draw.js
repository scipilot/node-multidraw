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
    settingsTabOpen = false;
    setColor = '#000';
    defaultName = "Guest";
    
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

    socket.on('chatmessage', function (data) {
	alertify.log(data.user + ": " + data.message);
    });

    socket.on('drawActionHistory', function(history){
	var i = 0, oc = {};
	console.log("History length is " + history.length);
	for(i = 0; i < history.length; i += 1){
	    if(history[i].drawing && oc[history[i].id]){
		drawLine(oc[history[i].id].x, oc[history[i].id].y, history[i].x, history[i].y, history[i].color)
	    }
	    oc[history[i].id] = history[i]; //update state.
	}

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
	if($.now() - lastEmit > 10){
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
	    if($.now() - clients[ident].updated > 1000 * 10){
		cursors[ident].remove();
		delete clients[ident];
		delete cursors[ident];
	    }
	}
	
    },1000);

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
    
    //colour picker
    $('#optionPanelTab').click(function(){
	if(optionTabOpen){
	    $('#optionPanel').animate({right: -80}, 200);
	    optionTabOpen = false;
	} else {
	    $('#optionPanel').animate({right: 0}, 200);
	    optionTabOpen = true;
	}

    });
    //settings panel
    $('#settingsPanelTab').click(function(){
	if(!settingsTabOpen){
	    $('#settingsPanel').animate({bottom: 0}, 200);
	    settingsTabOpen = true;
	} else {
	    $('#settingsPanel').animate({bottom: -300}, 200);
	    settingsTabOpen = false;
	}
	
    });
    
    var paper = document.getElementById('paper');
    var hammertime = Hammer(paper).on("tap", function(e){
	//console.log("tap");
	//console.log(e);
    });
    
    Hammer(document).on("drag", function(e) {
	e.preventDefault();
        //console.log(this, event);
	//console.log(e);
    });
    Hammer(document).on('dragstart', function(e){
	e.preventDefault();
	//console.log("dragstart");
    });

    function preventBehavior(e){ 
	e.preventDefault(); 
    };
    
    document.addEventListener("touchmove", preventBehavior, false);

    /** 
	Chat related 
    */
    $('#chatBox').keyup(function(e){
	if(e.keyCode == 13){
            sendMessage();
	}
    });

    function sendMessage(){
	var message = $("#chatBox").val();
	var user = $("#usernameInput").val();
	if(user.length < 1){
	    user = defaultName;
	}
	
	socket.emit('chatmessage', {
	    message: message,
	    user: user
	});
	$('#chatBox').val("");
    }

});
