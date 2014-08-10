var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);

var drawActionStack = [];
var connectedClients = 0;
var clients = {};

app.use(express.logger());
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: false });
app.configure(function(){
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
    res.render('main.jade');
});

io.set("log level", 1);

io.sockets.on('connection', function(socket){

    connectedClients += 1;
    socket.emit('drawActionHistory', drawActionStack);

    socket.on('mousemove', function(data){
	if(data.id in clients){
	    var client = clients[data.id];
	    
	    if(data.drawing){
		var drawAction = {
		    fromX: client.x,
		    fromY: client.y,
		    toX: data.x,
		    toY: data.y,
		    color: data.color
		};
		drawActionStack.push(drawAction);
	    }
	    
	} else {
	    //initilise a new client
	    var newClient = {
		id: data.id
	    };
	    clients[data.id] = newClient;
	}

	clients[data.id].x = data.x;
	clients[data.id].y = data.y;

	socket.broadcast.emit('moving', data);
    });

    socket.on('chatmessage', function(data){
	data.message = data.message.replace(/(<([^>]+)>)/ig,""); //take out possible tags.
	//limit chat message length.
	if (data.message.length <= 135) {
	    socket.broadcast.emit('chatmessage', {
		user: data.user,
		message: data.message
	    });
	}
    });

    socket.on('ping', function(id){
	var data = {
	    drawStackSize: drawActionStack.length,
	    connectedClients: connectedClients
	};
	socket.emit('pong', data);
    });

    socket.on('disconnect', function() {
	connectedClients--; 
    });

});
	      
