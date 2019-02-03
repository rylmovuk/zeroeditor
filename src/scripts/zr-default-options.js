/** Opzioni predefinite nel caso in cui vengano
omesse al momento della creazione dello zEditor */

export default {
	// Parametri generali
	options: {
		el: 'body',
		code: 'Hello world!',
		logo: '',
		world: {},
		createSprites: function(){},
		events: {},
		api: {},
	},
	
	// Mondo
	world: {
		width: 800,
		height: 600,
		gravity: { x: 0, y: 1, },
	},
	
	// Eventi
	events: {
		onCreate: function(){},
		onStart:  function(){},
		onStop:   function(){},
		onLoop:   function(){},
	},
	
}