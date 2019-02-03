/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  API - Qui inseriamo le funzioni da rendere disponibili a loro
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

/**
Aggiunge il debug a un elemento della console e va a capo
@param {String} out Output
*/
var DEBUG = function(out){
  const outputdiv = document.getElementById('output');
  outputdiv.innerHTML += getTime() + '0s ~ ' + out + '<br>';
  outputdiv.scrollTo(0, outputdiv.scrollHeight);
};

// Error handling

//Restituisce true se è avvenuto un errore
function getSafeCode(code){
  return `(function() {try{
			 ` +
    code +
    `
			 return false;
		}catch(err){
			DEBUG_ERROR("Errore!");
			DEBUG_ERROR(err.message);
			return true;
		}}())`;
}

// Stampa una scritta in rosso
function DEBUG_ERROR(out){
  const outputdiv = document.getElementById('output');
  outputdiv.innerHTML += '<span style="color: red;">' + out + '<br></span>';
  outputdiv.scrollTo(0, outputdiv.scrollHeight);
}


//Restituisce il secondo dell'esecuzione
var appCurrentTime = 0;
var appExecutionTimer;
function getTime(){return appCurrentTime;}


//Restituisce informazioni sullo spheres
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
  initWorld: function() {
    // Aggiunge i muri e gli oggetti alla simulazione
  },


	//Codice che gestisce l'esecuzione
	startExecution: function(){



		//Si prepara per lanciare la simulazione
		onExecution = false;              //Interrompe le simulazioni lanciate precendemente

    const outputdiv = document.getElementById('output');
    outputdiv.innerHTML = '';		      //Pulisce la console
		appCurrentTime = 0;               //Resetta il cronometro


		//Riporta gli oggetti alla loro posizione iniziale
		appExecutionVel = {x: 0, y: 0};



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
      const outputdiv = document.getElementById('output');
      outputdiv.innerHTML += '<span style="color: blue;">Simulazione terminata!<br></span>';
      outputdiv.scrollTo(0, outputdiv.scrollHeight);
			}
	},


	//Termina l'esecuzione
	endExecution: function(){
		onExecution = false;	//Blocca l'esecuzione del loop();
	}


};
