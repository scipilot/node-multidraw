/**
 * The client app manages the connection to the server and loads presentation plugins.
 */
SciWriterClientApp = function () {
	var socket = io.connect();
	// The stimulus presentation strategy ID
	var presentationId = 0, presentation;

	socket.on('connect', function () {

		if(typeof(SciWriter.sessionName) != "undefined"){

			// This will result in a 'session' response.
			// Also an initial 'stimulus' response, which is also sent from admin-UI on demand during sessions.
			// Receiving it on-connect would be from a) DB/CMS/preset-list in the sequence or b) when re-viewing previous session, and wanting to see the drawing in context with the chosen stimulus
			socket.emit('getSession', {
				sessionName: SciWriter.sessionName,
				pageNo: SciWriter.pageNo
			});

			// also request the options. The plugins receive these (there's no general options yet)).
			socket.emit('options');
		}
	});

	// Set up the presentation strategies
	socket.on('session', function (data) {
		console.log('CLIENT received session: ', data);

		presentationId = data.presentation;
		// pseudosingleton
		if(!presentation){
			console.log('CLIENT loading presentation: ', presentationId, presentation);

			// Load up the right presentation and input plugins
			if(presentationId == 1 || presentationId == 2){
				// Text
				$("#presentation-text").show();
				presentation = DrawPlugin($, socket);
			}
			else if (presentationId == 3){
				//Preset Image Backgrounds
				$("#presentation-image").show();
				presentation = DrawPlugin($, socket);
			}
			else if (presentationId == 4){
				// GPC tiles
				$("#presentation-tiles").show();
				presentation = TilesPlugin($, socket);
			}
		}
	});

	// server sent us the test stimulus: word/image background
	// Show this in via the session's presentation strategy
	// todo move to plugins...
	socket.on('stimulus', function (stimulus) {
		console.log('CLIENT received stimulus: ', stimulus);
		if(presentationId == 1 || presentationId == 2){
			console.log("Setting TEXT stimulus...");
			// Text
			$('div#session-bg-text')
				.text(stimulus.text)
				.css("display", "inherit");
		}
		else if (presentationId == 3){
			console.log("Setting IMAGE stimulus...");
			// Image
			//$('div#session-bg-image').css('background-image: url(\"/uploads/'+stimulus.filename+'")');
			$('div#session-bg-image')
				.css('background-image', 'url("/uploads/test'+SciWriter.pageNo+'.png")')
				.css("display", "inherit");
		}
	});

};
