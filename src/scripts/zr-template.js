
export default class Template{
	constructor(el, logo){
		document.querySelector(el).innerHTML = this.defaultTemplate(logo)
		
		this._editor = document.querySelector('#zr-editor')
		this._game   = document.querySelector('#zr-game')
	}
	
  defaultTemplate(logo){
  	return 	`<table style="height: 100%">
						<tr style="height: 100%">
							<td style="height: 100%; width: 100%; max-width: calc(100vw - 640px)">
								<div id="zr-navbar">
									<img src="${logo}"></img>
								</div>
								<div id="zr-editor"></div>
							</td>
							<td style="height: 100%">
								<div style="display: flex;  flex-direction: column; height: 100%"> 
									<div id="zr-game"></div>
									<div id="zr-console">
										<div class="title">
										 Console 
										 <span style="float: right">
											 <button id="zr-button-start">Start</button>
											 <button id="zr-button-stop">Stop</button>
											 <button id="zr-button-reset">Reset</button>
										 </span>
										</div>
										<hr>
										<div class="output" style="overflow-y: scroll; max-height: calc(100vh - 600px)"></div>
									</div>
								</div>
							</td>
						</tr>
					</table>`;
	}
	
	get editor(){ return this._editor }
	get game  (){ return this._game   }
	
	
	
	set onStart(action){document.getElementById('zr-button-start').addEventListener('click', action)} 
	set onStop (action){document.getElementById('zr-button-stop' ).addEventListener('click', action)}
	set onReset(action){document.getElementById('zr-button-reset').addEventListener('click', action)}
	
	
	clearInput(){
		document.querySelector('#zr-console .output').innerHTML = '';
	}
	info(string){
		let p = document.createElement('p')
		p.style.color = 'blue'
		p.append(document.createTextNode(string))
		const out = document.querySelector('#zr-console .output')
		out.append(p);	
		out.scrollTo(0, out.scrollHeight)
	}
	debug(string){
		let p = document.createElement('p')
		p.append(document.createTextNode(string))
		const out = document.querySelector('#zr-console .output')
		out.append(p);	
		out.scrollTo(0, out.scrollHeight)
	}
	error(string){
		let p = document.createElement('p')
		p.style.color = 'red'
		p.append(document.createTextNode(string))
		const out = document.querySelector('#zr-console .output')
		out.append(p);	
		out.scrollTo(0, out.scrollHeight)
	}
}