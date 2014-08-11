var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);
var os = require('os')

var drawActionStack = [];
var connectedClients = 0;
var clients = {};
var netUsage = 0;

app.use(express.logger());
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: false });
app.enable('trust proxy');
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
    netUsage += sizeof(drawActionStack);

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

	netUsage += sizeof(data) * connectedClients;
	socket.broadcast.emit('moving', data);
    });

    socket.on('chatmessage', function(data){
	netUsage += sizeof(data) * connectedClients;
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
	    connectedClients: connectedClients,
	    load1: (os.loadavg()[0]).toFixed(2),
	    netUsageKB: (netUsage / 1000).toFixed(1)
	};
	netUsage += sizeof(data);
	socket.emit('pong', data);
    });

    socket.on('disconnect', function() {
	connectedClients--; 
    });
});

function sizeof(object) {
    var objectList = [];
    var stack = [object];
    var bytes = 0;

    while (stack.length) {
        var value = stack.pop();

        if (typeof value === 'boolean' ) {
            bytes += 4;
        } else if (typeof value === 'string') {
            bytes += value.length * 2;
        } else if (typeof value === 'number') {
            bytes += 8;
        } else if (typeof value === 'object' && objectList.indexOf( value ) === -1) {
            objectList.push(value);
            for(var i in value) {
                stack.push(value[i]);
            }
        }
    }
    return bytes;
}
