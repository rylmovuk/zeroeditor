/** Consente di creare una Sandbox in cui eseguire 
del codice in modo protetto. Rende accessibili solo
le funzioni presenti nell'api */

export default class Sandbox{
	// Costruttore
	constructor(api){
		this._sandbox = new Proxy(api, {
      has: function(target, key) {
        return true;
      },
      get: function(target, key) {
        if (key === Symbol.unscopables) return undefined;
        if (typeof target[key] === 'function') {
          return target[key].bind(zEditor);
        }
        return target[key];
      },
    })
	}
	
	// Esegue del codice
	run(src){
		src = 'with (sandbox) { return new function(){' + src + '}}';
		const code = new Function('sandbox', src);
		return code(this._sandbox);
	}
}