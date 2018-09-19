import './styles/main.scss';
import CodeMirror from 'codemirror';

import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/javascript-hint.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/markdown/markdown.js';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.css';

/** ZEditor Editor
 * A quick
 */
class ZEditor {
  /**
   * @param {Object} elements - Object with id of render div
   * @param {string} elements.name - The name of the employee.
   * @param {string} elements.department - The employee's department.
   */
  constructor(elements) {
    this.elements = elements;
    // Inizializza l'editor di codice settando sul javascript
    this.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
      lineNumbers: true,
      viewportMargin: Infinity, // Resize automatico
      extraKeys: { 'Ctrl-Space': 'autocomplete' }, // Funzi completamento parole
      mode: { name: 'javascript', globalVars: true }, // Mette javascript
    });
  }
}

export default ZEditor;
