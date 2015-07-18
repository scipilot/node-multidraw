/**
 * The client app manages the connection to the server and loads presentation plugins.
 */
SciWriterClientApp = function () {
	var socket = io.connect();
	// The stimulus presentation strategy ID
	var presentation = 0;

	socket.on('connect', function () {

		if(typeof(SciWriter.sessionName) != "undefined"){
			// Note this will result in a 'stimulus' response, which is also sent from admin-UI on demand during sessions.
			// Receiving it on-connect would be from a) DB/CMS/preset-list in the sequence or b) when re-viewing previous session, and wanting to see the drawing in context with the chosen stimulus
			socket.emit('getSession', {
				sessionName: SciWriter.sessionName,
				pageNo: SciWriter.pageNo
			});
		}
	});

	// Set up the presentation strategies
	socket.on('session', function (data) {
		console.log('received session: ', data);
		presentation = data.presentation;

		// Load up the right presentation and input plugins
		if(presentation == 1 || presentation == 2){
			// Text
			$("#presentation-text").show();
			DrawPlugin($, socket);
		}
		else if (presentation == 3){
			//Preset Image Backgrounds
			$("#presentation-image").show();
			DrawPlugin($, socket);
		}
		else if (presentation == 4){
			// GPC tiles
			$("#presentation-tiles").show();
			TilesPlugin($);
		}
	});

	// server sent us the test stimulus: word/image background
	// Show this in via the session's presentation strategy
	// todo move to plugins...
	socket.on('stimulus', function (stimulus) {
		console.log('received stimulus: ', stimulus);
		if(presentation == 1 || presentation == 2){
			console.log("Setting text stimulus...");
			// Text
			$('div#session-bg-text')
				.text(stimulus.text)
				.css("display", "inherit");
		}
		else if (presentation == 3){
			console.log("Setting IMAGE stimulus...");
			// Image
			//$('div#session-bg-image').css('background-image: url(\"/uploads/'+stimulus.filename+'")');
			$('div#session-bg-image')
				.css('background-image', 'url("/uploads/test'+SciWriter.pageNo+'.png")')
				.css("display", "inherit");
		}
	});

};
