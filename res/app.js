/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  API - Qui inseriamo le funzioni da rendere disponibili a loro
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

//Aggiunge il debug a un elemento della console e va a capo
function DEBUG(out){		
	$("#output").html($("#output").html() + getTime()  + "s ~ " + out + "<br>");
	$("#output").scrollTop($("#output")[0].scrollHeight);	
}


//Error handling

//Restituisce true se è avvenuto un errore
function getSafeCode(code){
		return `(function() {try{
			 ` + code + `
			 return false;
		}catch(err){
			DEBUG_ERROR("Errore!");
			DEBUG_ERROR(err.message);
			return true;
		}}())`;
}
//Stampa una scritta in rosso
function DEBUG_ERROR(out){		
	$("#output").html($("#output").html() + '<span style="color: red;">'+ out + "<br></span>");
	$("#output").scrollTop($("#output")[0].scrollHeight);	
}


//Restituisce il secondo dell'esecuzione
var appCurrentTime = 0;
var appExecutionTimer;
function getTime(){return appCurrentTime;}


//Restituisce informazioni sullo spheres
var appSphereRosso;
function getPosition(){return {x: appSphereRosso.position.x, y: appSphereRosso.position.y}; }
function getVelocity(){return {x: appSphereRosso.velocity.x, y: appSphereRosso.velocity.y}; }

//Funzioni matematiche
function vectorAdd(vector1, vector2){ return Matter.Vector.add(vector1, vector2);}
function vectorSub(vector1, vector2){ return Matter.Vector.sub(vector1, vector2);}

//Memorizza la forza da applicare per questo secondo
var appExecutionVel;
function setForces(vector){ appExecutionVel = vector; }


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  App - Contiene le funzioni necessarie a gestire la sfida
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
var app = {
	
	//Il codice che compare a inizio simulazione
	startingCode: `
function init(){
	
}

function loop(){
	
	DEBUG("x:" + getPosition().x);
	setForces( vectorSub({x: 400, y:300}, getPosition()));
}`,
	
	initWorld: function(){
		//Mette la gravità (per ora l'ho messa per fare dei test)
		engine.world.gravity.x = 0;		engine.world.gravity.y = 0;

		// Crea lo spheres rosso
		appSphereRosso = Matter.Bodies.circle(200, 300, 40, {
						density: 0.1,
						frictionAir: 0.0001,
						restitution: 0.3,
						friction: 0.2,
						render: {
							sprite: {
								texture: 'res/textures/red.png'
							}
						}
		});
		
		// Crea lo spheres blu		
		appSphereBlu = Matter.Bodies.circle(600, 300, 40, {
						density: 0.1,
						frictionAir: 0.0001,
						restitution: 0.3,
						friction: 0.2,
						render: {
							sprite: {
								texture: 'res/textures/blue.png'
							}
						}
		});

		// Crea l'oggetto contenente l'immagine di sfondo
		var background = Matter.Bodies.rectangle(400, 300, 800, 600, {
				isSensor: true,
				isStatic: true,
				render: {
							sprite: {
								texture: 'res/textures/space.png'
							}
				}
		});

		//Proprietà dei muri, in modo che il satellite non esca
		var offset = 10, options = { isStatic: true	};

		//Aggiunge i muri e gli oggetti alla simulazione
		Matter.World.add(engine.world,  [
				Matter.Bodies.rectangle(400, -offset, 800.5 + 2 * offset, 50.5, options),      //Muri
				Matter.Bodies.rectangle(400, 600 + offset, 800.5 + 2 * offset, 50.5, options),
				Matter.Bodies.rectangle(800 + offset, 300, 50.5, 600.5 + 2 * offset, options),
				Matter.Bodies.rectangle(-offset, 300, 50.5, 600.5 + 2 * offset, options),
				background, //Immagine di sfondo
				appSphereRosso, //Palla
				appSphereBlu
			]);
		
	},
	
	
	//Codice che gestisce l'esecuzione
	startExecution: function(){
		
		//Opzioni
		var EXECUTION_MAX_TIME = 100;     //Durata della simulazione
		
		//Si prepara per lanciare la simulazione
		clearInterval(appExecutionTimer); //Interrompe le simulazioni lanciate precendemente
		$("#output").html("");		      //Pulisce la console
		appCurrentTime = 0;               //Resetta il cronometro


		//Riporta gli oggetti alla loro posizione iniziale
		appExecutionVel = {x: 0, y: 0};   
		Matter.Body.setVelocity(appSphereRosso, appExecutionVel);
		Matter.Body.setPosition(appSphereRosso, {x: 200, y:300});
		Matter.Body.setVelocity(appSphereBlu, appExecutionVel);
		Matter.Body.setPosition(appSphereBlu, {x: 600, y:300});
		
		
		
		//Valida il codice
		if(eval(getSafeCode("esprima.parseScript(editor.getValue());"))) return;
		
		//Init
		eval(editor.getValue());
		if(eval(getSafeCode("init();"))) return;
		

		//Inizia il loop();
		appExecutionTimer = setInterval(function(){
		
			//Aggiorna il numero dei secondi passati
			appCurrentTime++;
			
			//Controlla se sono già passati 100 secondi
			if( appCurrentTime <= EXECUTION_MAX_TIME){
				
				//Se non ci sono problemi, esegue il loop
				if(eval(getSafeCode("loop();"))){
					clearInterval(appExecutionTimer);
					return;
				}
				
				//Applica le forze specificate dal programma
				//L'accelerazione massima applicabile deve avere modulo massimo = 1
				Matter.Body.setVelocity(appSphereRosso, Matter.Vector.add(Matter.Vector.magnitude(appExecutionVel) > 1 ? Matter.Vector.normalise(appExecutionVel) : appExecutionVel, appSphereRosso.velocity));

			}else{
				
				//Se sono già passati 100 secondi, avvisa che la simulazione è terminata
				clearInterval(appExecutionTimer); //Blocca l'esecuzione del loop();
				$("#output").html($("#output").html() + '<span style="color: blue;">Simulazione terminata!<br></span>');
				$("#output").scrollTop($("#output")[0].scrollHeight);	
			}
		}, 100);
			
	},
	
	
	
	
	//Termina l'esecuzione
	endExecution: function(){
		clearInterval(appExecutionTimer);	//Blocca l'esecuzione del loop();	
	}
	
	
};



