// Dependencies
import '../dependencies/codemirror/lib/codemirror.js';
import '../dependencies/codemirror/addon/hint/show-hint.js';
import '../dependencies/codemirror/addon/hint/javascript-hint.js';
import '../dependencies/codemirror/mode/javascript/javascript.js';


export default class CodeEditor{
	constructor(el, code){
		return new CodeMirror(el, {
		 value: code,
		 lineNumbers: true,
		 viewportMargin: Infinity, // Autoresize
		 extraKeys: { 'Ctrl-Space': 'autocomplete' }, // Ctrl+space to autocomplete
		 mode: { name: 'javascript', globalVars: true }, // Set javascript
	 });
	}
	
}