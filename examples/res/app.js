/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  API - Qui inseriamo le funzioni da rendere disponibili a loro
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

// Aggiunge il debug a un elemento della console e va a capo
function DEBUG(out){
  $('#output').html($('#output').html() + getTime() + '0s ~ ' + out + '<br>');
  $('#output').scrollTop($('#output')[0].scrollHeight);
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
function vectorMagnitude(vector1) { return Matter.Vector.magnitude(vector1);}

function vectorAdd(vector1, vector2){ return Matter.Vector.add(vector1, vector2);}
function vectorSub(vector1, vector2){ return Matter.Vector.sub(vector1, vector2);}

function vectorMult(vector1, scalar){ return Matter.Vector.mult(vector1, scalar);}
function vectorDiv(vector1, scalar){ return Matter.Vector.div(vector1, scalar);}
function vectorScale(vector1, scalar){ return Matter.Vector.mult(Matter.Vector.normalise(vector1), scalar);}


//Memorizza la forza da applicare per questo secondo
var appExecutionVel;
function setForces(vector){ appExecutionVel = vector; }
function setVelocity(vel){ setForces( vectorSub(vel,getVelocity())); }
function setPosition(pos){
  var vectBet = vectorSub(pos, getPosition());
 	setVelocity(vectorScale(vectBet, Math.sqrt(vectorMagnitude(vectBet)*2*0.009) ));
}



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
	setPosition( {x: 400, y:300});

}`,

	initWorld: function(){
		//Mette la gravità (per ora l'ho messa per fare dei test)
		engine.world.gravity.x = 0;		engine.world.gravity.y = 0;

		// Crea lo spheres rosso
		appSphereRosso = Matter.Bodies.circle(200, 300, 40, {
						density: 0.1,
						frictionAir: 0,
						restitution: 0,
						friction: 0,
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



		//Si prepara per lanciare la simulazione
		onExecution = false;              //Interrompe le simulazioni lanciate precendemente
		$("#output").html("");		      //Pulisce la console
		appCurrentTime = 0;               //Resetta il cronometro


		//Riporta gli oggetti alla loro posizione iniziale
		appExecutionVel = {x: 0, y: 0};
		Matter.Body.setVelocity(appSphereRosso, appExecutionVel);
		Matter.Body.setPosition(appSphereRosso, {x: 200, y:300});
		Matter.Body.setVelocity(appSphereBlu, appExecutionVel);
		Matter.Body.setPosition(appSphereBlu, {x: 600, y:300});



		//Valida il codice
		if(window.eval(getSafeCode("esprima.parseScript(editor.getValue());"))) return;

		//Init
		window.eval(editor.getValue());
		if(window.eval(getSafeCode("init();"))) return;

		onExecution = true;


	},

  onExecution: function() {
    // Opzioni
    let EXECUTION_MAX_TIME = 100; // Durata della simulazione

    // Aggiorna il numero dei secondi passati
    appCurrentTime++;

    // Controlla se sono già passati 100 secondi
    if (appCurrentTime <= EXECUTION_MAX_TIME) {
      // Se non ci sono problemi, esegue il loop
      if(window.eval(getSafeCode('loop();'))) {
        if (window.eval(getSafeCode('loop();'))) return;
      }

			//Applica le forze specificate dal programma
			//L'accelerazione massima applicabile deve avere modulo massimo = 1
			Matter.Body.setVelocity(appSphereRosso, Matter.Vector.add(vectorMagnitude(appExecutionVel) > 0.1 ? vectorScale(appExecutionVel, 0.1) : appExecutionVel, appSphereRosso.velocity));

		}else{

			//Se sono già passati 100 secondi, avvisa che la simulazione è terminata
			onExecution = false;      //Blocca l'esecuzione del loop();
			$("#output").html($("#output").html() + '<span style="color: blue;">Simulazione terminata!<br></span>');
			$("#output").scrollTop($("#output")[0].scrollHeight);
			}
	},


	//Termina l'esecuzione
	endExecution: function(){
		onExecution = false;	//Blocca l'esecuzione del loop();
	}


};
