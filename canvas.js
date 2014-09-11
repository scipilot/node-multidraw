var Canvas = require('canvas'),
canvas = new Canvas(1600,1000),
ctx = canvas.getContext('2d');
var redis = require("redis");
var redisClient = redis.createClient();

function drawLine(ctx, fromx, fromy, tox, toy, color){
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
}

redisClient.lrange("drawactions", 0, -1, function(err, replies){
    replies.forEach(function(reply, i){
	var event = JSON.parse(reply);
	drawLine(ctx,
		 event.fromX,
		 event.fromY,
		 event.toX,
		 event.toY,
		 event.color);
    });

    //console.log("done");
    ctx.font = '60px Open Sans';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    //.fill();
    //ctx.rotate(.1);
    ctx.fillText("Online Multiplayer Draw!", 50, 100);

    console.log('<img src="' + canvas.toDataURL() + '" />');
    process.exit(0);
});


