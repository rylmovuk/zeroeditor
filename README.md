# Zeroeditor
An user-friendly IDE thought for people who have never got in contact with code.  
Built on top of [Matter.js](http://brm.io/matter-js/) and [CodeMirror](https://codemirror.net/).
Inspired by (but not affiliated with) [Zero Robotics Tournament](http://zerorobotics.mit.edu/).  
Won't work on old browser due to proxy support missing (which is an un-shimmable ES2015+ feature).


## How does a challenge works
Studends will have a mission and should write code to accomplish it.
They will have avaiable an api to interact with the environment, either getting
informations about the world around them and giving instructions to their robot/player. 
The code must be automatic (= no user interaction during execution).  
Everything is done client-side, without needing a server, in a jail environment
where only the provided api will work.
  
  
## Usage
Import files from jsDelivr adding to your head:
```html
<script src="https://cdn.jsdelivr.net/gh/lucafabbian/zeroeditor/dist/zeroeditor.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lucafabbian/zeroeditor/dist/zeroeditor.min.css" type="text/css">
```
Then, inside javascript, create a new instance of ZeroEditor with:
```javascript
var zEditor = new ZeroEditor(new function(){
	// Define here your challenge
})
```


### Constructor
Below a complete list of the constructor's options.
```javascript
var zEditor = new ZeroEditor(new function(){
	this.el = 'body'               // Root element. Could be either body or another valid querySelector
	this.logo = './img/myLogo.gif' // Logo to place on code editor's navbar

	
	/* Default code placeholder */
	this.code = `this.functionToComplete = function(){
		// Hey student, you shoud complete this function to solve the challenge
	}`;
		
	
	/* Information about game's world */
	this.world = {
		width:       800,                // Width in virtual unit of measurement
		height:      600,                // Height in virtual unit of measurement
		gravity: { x: 0, y: 1, },        // Gravity. {x: 0, y:0} means space
		background:  './background.png', // Adds an image on screen background
		walls:       true                // Prevent objects to go out of screen
	};
	
	
	/* World sprites constructor. Could be either a class or
	a constructor function. It will be call every time simulation is reset.
	See Matter.js docs about bodies for a complete documentation
	http://brm.io/matter-js/docs/classes/Bodies.html */
	this.createSprites = function(){
		this.myObject = Matter.Bodies.circle(200, 300, 40, {
			density: 0.1, frictionAir: 0, restitution: 0, friction: 0,
			render: { sprite: { texture: './objectTexture.png' } }
		});
	}
	
	/* Here is where your game logic goes. Inside events you should:
	- update game world
	- call user functions with zEditor.code.functionWrittenByStudent()
	- calculate things like score and so on */
	this.events = {
		onStart (){ },  // Called when simulation starts
		onStop  (){ },  // Called when simulation stops
    onLoop  (){ }   // Called every Matter.js tick    
	};
	
	
	/* Api avaible to user */
	this.api = {
		
		
	}
})
```
### ZeroEditor Api
```javascript
var zEditor = new ZeroEditor( { /* Stuffs */ })

// Here is a list of ZeroEditor public Api

/* Contains the result of user code evaluated
 For example, if the user writes:
 this.onInit = function(){ debug('hello world!')}
 you can call zEditor.code.onInit() to run the 
 function he has written  */
zEditor.code;

/* You can use those methods to trigger
 simulation start/stop/reset. Since the simulation
 doesn't have a predefined way to end, is your
 responsability to call zEditor.stop() once the
 game is complete, for example setting:
 zEditor.events.onLoop = function(){ 
   if(zEditor.getTime() > 600) zEditor.stop()
 }*/
zEditor.start();
zEditor.stop();
zEditor.reset();

/* Return time since simulation has started.
 Times is measured in ticks, where 1 tick ~ 0.1 real seconds
 tick is the default unit of measure of Matter.js
 If an object has a speed of 1, it means 1px every tick */
zEditor.getTime()


/* Return the sprites/api/events passed as constructor options,
 and make them avaible for further editing.
 Please note zEditor.api will also contain default api function
 such as zEditor.api.debug(), zEditor.api.info(), zEditor.api.error() */
zEditor.sprites; 
zEditor.api; 
zEditor.events;
```

### Examples
I've put an example.html file inside root folder.  
New examples will be posted soon.  


## Building (Node and npm required)
Clone with git, open a terminal and type:
`npm install`


Then you could use:
- `npm run build` - production build, will create zeroeditor.js and zeroeditor.css on /dist folder
Internally, rollup and cleancss are used to minify/compile code
  
  
## License
Distributed under [GPL 3+](LICENSE.md)  
CodeMirror and Matter.js are licensed under [Mit license](http://opensource.org/licenses/MIT).
