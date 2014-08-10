var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);

var drawActionStack = [];
var connectedClients = 0;

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
    connectedClients++;
    /* Send new connection the drawing history as one large array. */
    socket.emit('drawActionHistory', drawActionStack);

    socket.on('mousemove', function(data){
	//if they drew something add it to the action stack.
	if(data.drawing){
	    drawActionStack.push(data);
	} else if( drawActionStack.length > 1 && drawActionStack[drawActionStack.length - 1]){
	    drawActionStack.push(data);
	}
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
	    stackSize: drawActionStack.length,
	    connectedClients: connectedClients
	};
	socket.emit('pong', data);
    });

    socket.on('disconnect', function() {
	connectedClients--; 
    });

});
	      
