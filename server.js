var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var morgan = require('morgan'); //http logger module
var compression = require('compression')
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);
var os = require('os');
var redis = require("redis");
var redisClient = redis.createClient();
var lzwCompress = require('lzwcompress');
var compressor = require('node-minify');

var localConnectedClients = 0;
var clients = {};
var netUsage = 0;

//compress all JS into one file on startup
new compressor.minify({
    type: 'uglifyjs',
    fileIn: ['public/alertify.min.js',
	     'public/jquery.hammer.min.js',
	     'public/lzwCompress.js',
	     'public/draw.js'
	    ],
    fileOut: 'public/draw.min.js',
    callback: function(err, min){
        if (err){
	    console.log(err);
	}
    }
});

//compress css
new compressor.minify({
    type: 'clean-css',
    fileIn: ['public/alertify.core.css',
	     'public/alertify.default.css',
	     'public/style.css'
	    ],
    fileOut: 'public/style.min.css',
    callback: function(err, min){
	if(err){
	    console.log(err);
	}
    }
});

app.use(compression())
app.use(express.static(__dirname + '/public', {maxAge: 60*60*24*1000}));
app.use(morgan('combined'));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: false });
app.enable('trust proxy');

/* Main 'lobby' canvas */
app.get('/', function(req, res){
    res.render('main.jade');
});

/* User canvas */
app.get("/c/:canvasname", function (req, res, next) {
    res.render('main.jade', {canvasName: req.params.canvasname});
});


redisClient.on("error", function(err){
    console.log("Redis Error: " + err);
});

//set client connection key if not exists
redisClient.setnx("clientcount", 0);

io.sockets.on('connection', function(socket){
    localConnectedClients += 1;
    redisClient.incr("clientcount");

    socket.on('drawActionHistory', function(data){
	//client has asked for all the draw action history.
	var drawActions = [];
	var key = "drawactions:"+data.canvasName;
	redisClient.lrange(key, 0, -1, function(err, replies){
	    if(err){
		console.log("Error fetching draw history key: " + key);
		return;
	    }
	    replies.forEach(function(reply, i){
		drawActions.push(JSON.parse(reply));
	    });

	    //compress drawaction history data
	    var compressedActions = lzwCompress.pack(drawActions)
	    //send it
	    socket.emit('drawActionHistory', compressedActions);
	    //increment netusage tracker.
	    netUsage += sizeof(compressedActions);
	});
    });

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
		var key = "drawactions:"+data.canvasName;
		redisClient.rpush(key, JSON.stringify(drawAction));
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

	netUsage += sizeof(data) * localConnectedClients;
	socket.broadcast.emit('moving', data);
    });

    socket.on('chatmessage', function(data){
	netUsage += sizeof(data) * localConnectedClients;
	//take out possible tags.
	data.message = data.message.replace(/(<([^>]+)>)/ig,"");
	//limit chat message length.
	if (data.message.length <= 135) {
	    socket.broadcast.emit('chatmessage', {
		user: data.user,
		message: data.message
	    });
	}
    });

    socket.on('stats', function(id){
	var multi = redisClient.multi();
	var data = {
	    load1: (os.loadavg()[0]).toFixed(2),
	    netUsageKB: (netUsage / 1000).toFixed(1),
	    nodeConnections: localConnectedClients
	};
	
	/*
	multi.llen("drawactions", function(err, reply){
	    data['drawStackSize'] = reply;
	});
	*/

	multi.get('clientcount', function(err, reply){
	    data['globalConnectedClients'] = reply;
	});

	multi.lastsave(function(err, reply){
	    var now = (new Date().getTime()) / 1000;
	    data['lastStateSave'] = ((now - reply) / 60).toFixed(1);
	});

	multi.exec(function(err, replies){
	    socket.emit('stats', data);
	    netUsage += sizeof(data);
	});
    });

    socket.on('ping', function(data){
	socket.emit('pong');
    });

    socket.on('disconnect', function() {
	localConnectedClients -= 1;
	redisClient.decr("clientcount");
    });
});

/**
 * Get the estimated size of an object in bytes
 */
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
