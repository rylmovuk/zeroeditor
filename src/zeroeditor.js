// Imports
import defaultOptions      from './scripts/zr-default-options.js'
import Template            from './scripts/zr-template.js'
import CodeEditor          from './scripts/zr-code-editor.js'
import Sandbox             from './scripts/zr-sandbox.js'
import MatterManager       from './scripts/zr-matter-manager.js'


/** ZeroEditor class */
export default class ZeroEditor{
	constructor(options = {}){
		const zEditor = this;
		this._setPrivateProps();

		
		// Args parsing
		zEditor._options = { ...defaultOptions.options, ...options }
		zEditor._world   = { ...defaultOptions.world,	  ...zEditor._options.world	}
		zEditor._events  = {	...defaultOptions.events,	...zEditor._options.events }

    // Api
		zEditor._api = {
			info (...args) { zEditor._template.info ('[' + zEditor.api.getTime() + ' info] ' + JSON.stringify(args)) },
			debug(...args) { zEditor._template.debug('[' + zEditor.api.getTime() + ' debug] ' + JSON.stringify(args)) },
			error(...args) { zEditor._template.error('[' + zEditor.api.getTime() + ' error] ' + JSON.stringify(args)) },
			getTime() {return zEditor.getTime(); },
			...zEditor._options.api,
		}
		
		//Init
		zEditor._template = new Template(zEditor._options.el, zEditor._options.logo)
		zEditor._editor = new CodeEditor(zEditor._template.editor, zEditor._options.code)
		
		zEditor.engine = Matter.Engine.create(); // Engine constructor
		zEditor._clearWorld();

    Matter.Events.on(zEditor.engine, 'beforeUpdate', function(event) {
      if (zEditor._isStart) {
        if (zEditor.events.onLoop)
          try {
            zEditor.events.onLoop.call(this);
            zEditor._time++;
          } catch (e) {
						zEditor.api.error(e.message);
						zEditor.stop()
          }
      }
    });

    zEditor.render = Matter.Render.create({
      // Crea il Renderer
      element:  zEditor._template.game,
      engine: zEditor.engine,
      options: {
        width:  zEditor._template.game.clientWidth,
        height:  zEditor._template.game.clientHeight,
        showAngleIndicator: false,
        wireframes: false,
        hasBounds: true,
      },
    });

    // run the engine and the renderer
    Matter.Engine.run(zEditor.engine);
    Matter.Render.run(zEditor.render);

    // Resize Handling
    zEditor.render.bounds.min.x = 0;
    zEditor.render.bounds.max.x = zEditor._world.width;
    zEditor.render.bounds.min.y = 0;
    zEditor.render.bounds.max.y = zEditor._world.height;
    const render = this.render;
    window.addEventListener('resize', function() {
      render.context.canvas.width =  zEditor._template.game.clientWidth;
      render.options.width =  zEditor._template.game.clientWidth;
      render.canvas.width =  zEditor._template.game.clientWidth;

      render.context.canvas.height =  zEditor._template.game.clientHeight;
      render.options.height =  zEditor._template.game.clientHeight;
      render.canvas.height =  zEditor._template.game.clientHeight;
    });


    zEditor._sandbox = new Sandbox(zEditor._api)
		
		zEditor._template.onStart =() => zEditor.start();
		zEditor._template.onStop  =() => zEditor.stop ();
		zEditor._template.onReset =() => zEditor.reset();
	}

  /** Initialize private variables */
  _setPrivateProps() {
    this._time = 0;
    this._isReset = true;
    this._isStart = false;
  }


  /**
   *
   */
  _clearWorld() {
		const zEditor = this;
			
    Matter.World.clear(zEditor.engine.world);
    zEditor._sprites = new zEditor._options.createSprites();
    zEditor.engine.world.gravity = zEditor._world.gravity;

    if (zEditor._world.walls) {
      // Proprietà dei muri, in modo che il satellite non esca
      const offs = 25;
      const opt = { isStatic: true };

      // Aggiunge i muri e gli oggetti alla simulazione
      Matter.World.add(zEditor.engine.world, [
        Matter.Bodies.rectangle(400, -offs, 800.5 + 2 * offs, 50.5, opt),
        Matter.Bodies.rectangle(400, 600 + offs, 800.5 + 2 * offs, 50.5, opt),
        Matter.Bodies.rectangle(800 + offs, 300, 50.5, 600.5 + 2 * offs, opt),
        Matter.Bodies.rectangle(-offs, 300, 50.5, 600.5 + 2 * offs, opt),
      ]);
    }

    if (zEditor._world.background) {
      Matter.World.add(zEditor.engine.world, [
        Matter.Bodies.rectangle(
          zEditor._world.width / 2,
          zEditor._world.height / 2,
          zEditor._world.width,
          zEditor._world.height,
          {
            isSensor: true,
            isStatic: true,
            render: { sprite: { texture: zEditor._world.background } },
          },
        ),
      ]);
    }

    // Add sprites to the world
    Matter.World.add(this.engine.world, Object.values(this.sprites));
    try {
      this.events.onCreate.call(this, true);
    } catch (e) {
      zEditor.api.error(e.message);
    }
  }

	
  /** Sprites   */
  get sprites() { return this._sprites; }
  get api() {   return this._api;  }
  get events() { return this._events;  }
	

  // +++++++++++++++++++++++++++++++++++++++++++++++++
  // + Control lyfecycle                             +
  // +++++++++++++++++++++++++++++++++++++++++++++++++

  /** Start (reset if not) */
  start() {
    this.reset();
		try{
    	this.code = this._sandbox.run(this._editor.getValue());
		}catch(e){
			this.api.error('Can\'t parse code: ' + e.message)
			return
		}
    this._isStart = true;
    this._isReset = false;
    if (this.events.onStart)
      try {
        this.events.onStart.call(this);
      } catch (e) {
				zEditor.api.error(e.message);
      }
  }

  /** Stop (stop the code, if started, but no reset) */
  stop() {
    if (this._isStart) {
      this._isStart = false;
      Matter.Render.stop(this.render);
      this.events.onStop.call(this);
    }
  }

  /** Reset (also stop the code) */
  reset() {
    if (!this._isReset) {
      this.stop();
			this._time = 0;
			this._template.clearInput()
      this._clearWorld();
      Matter.Render.run(this.render);
      this._isReset = true;
    }
  }

  /** @return {Int} current time */
  getTime() {
    return this._time;
  }
	
	static import(name){
		const defaultApi = {
			vector: {
				//Matter vector function alias
				vectorMagnitude : Matter.Vector.magnitude,
				vectorAdd       : Matter.Vector.add,
				vectorSub       : Matter.Vector.sub,
				vectorMult      : Matter.Vector.mult,
				vectorDiv       : Matter.Vector.div,
				vectorScale : function(v1, scalar){
					return Matter.Vector.mult(Matter.Vector.normalise(v1), scalar);
				},
			},
		}
		return defaultApi[name]
	}
}
