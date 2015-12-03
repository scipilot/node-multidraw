/**
 * The client app manages the connection to the server and loads presentation plugins.
 */
SciWriterClientApp = function ($, SciWriterApp) {
	var socket = io.connect();
	// The stimulus presentation strategy ID
	var presentationId = 0, presentation = null, admin = null;

	// Create the admin plugin, before connecting.
	if(SciWriterApp.role == 'admin'){
		if(!admin) admin = AdminPlugin($, socket);
	}

	socket.on('connect', function () {

		if(typeof(SciWriterApp.sessionName) != "undefined"){

			// This will result in a 'session' response.
			// Also an initial 'stimulus' response, which is also sent from admin-UI on demand during sessions.
			// Receiving it on-connect would be from a) DB/CMS/preset-list in the sequence or b) when re-viewing previous session, and wanting to see the drawing in context with the chosen stimulus
			socket.emit('getSession', {
				sessionName: SciWriterApp.sessionName,
				pageNo: SciWriterApp.pageNo
			});

			// also request the options. The plugins receive these (there's no general options yet)).
			socket.emit('options');
		}
		else {
			// welcome screen?
			presentation = new DrawPlugin($, socket);
		}
	});

	// Receives the options, and selects the current role.
	socket.on('options', function(options){
		var roleOptions = jQuery.extend(true, {}, options);

		// override the top-level options with any role-specific ones.
		$.extend(roleOptions, options.roles[SciWriter.role]);
		roleOptions.roles = null; // hide

		// call the presentation API
		if(presentation) presentation.options(roleOptions);
	});

	// Set up the presentation strategies
	socket.on('session', function (data) {
		console.log('CLIENT received session: ', data);

		presentationId = data.presentation;
		// pseudosingleton
		if(!presentation){
			console.log('CLIENT loading presentation: ', presentationId, presentation);

			// Load up the right presentation and input plugins
			// Really there's two independent options: presentation, and user-input/UI (+ admin ok 3)
			// todo: I was thinking of just providing a list of plugins for each test scenario?
			if(presentationId == 1 || presentationId == 2){
				// Text
				$("#presentation-text").show();
				presentation = new DrawPlugin($, socket);
			}
			else if (presentationId == 3){
				//Preset Image Backgrounds
				$("#presentation-image").show();
				presentation = new DrawPlugin($, socket);
			}
			else if (presentationId == 4){
				// GPC tiles
				$("#presentation-tiles").show();
				presentation = new TilesPlugin($, socket);
			}
		}
	});

	// server sent us the test stimulus: word/image background
	// Show this in via the session's presentation strategy
	// todo move remaining stimulus handling to plugins...
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
				.css('background-image', 'url("/uploads/test'+SciWriterApp.pageNo+'.png")')
				.css("display", "inherit");
		}
	});

	// Guided navigation - usually from admin to user
	socket.on('redirect', function(data){
		window.location = data.url;
	});

	return this;
};
