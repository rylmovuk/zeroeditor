var ZeroEditor = (function () {
	'use strict';

	/** Opzioni predefinite nel caso in cui vengano
	omesse al momento della creazione dello zEditor */

	var defaultOptions = {
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
		
	};

	class Template{
		constructor(el, logo){
			document.querySelector(el).innerHTML = this.defaultTemplate(logo);
			
			this._editor = document.querySelector('#zr-editor');
			this._game   = document.querySelector('#zr-game');
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
		
		
		
		set onStart(action){document.getElementById('zr-button-start').addEventListener('click', action);} 
		set onStop (action){document.getElementById('zr-button-stop' ).addEventListener('click', action);}
		set onReset(action){document.getElementById('zr-button-reset').addEventListener('click', action);}
		
		
		clearInput(){
			document.querySelector('#zr-console .output').innerHTML = '';
		}
		info(string){
			let p = document.createElement('p');
			p.style.color = 'blue';
			p.append(document.createTextNode(string));
			const out = document.querySelector('#zr-console .output');
			out.append(p);	
			out.scrollTo(0, out.scrollHeight);
		}
		debug(string){
			let p = document.createElement('p');
			p.append(document.createTextNode(string));
			const out = document.querySelector('#zr-console .output');
			out.append(p);	
			out.scrollTo(0, out.scrollHeight);
		}
		error(string){
			let p = document.createElement('p');
			p.style.color = 'red';
			p.append(document.createTextNode(string));
			const out = document.querySelector('#zr-console .output');
			out.append(p);	
			out.scrollTo(0, out.scrollHeight);
		}
	}

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE

	// This is CodeMirror (https://codemirror.net), a code editor
	// implemented in JavaScript on top of the browser's DOM.
	//
	// You can find some technical background for some of the code below
	// at http://marijnhaverbeke.nl/blog/#cm-internals .

	(function (global, factory) {
	  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	  typeof define === 'function' && define.amd ? define(factory) :
	  (window.CodeMirror = factory());
	}(undefined, (function () {
	  // Kludges for bugs and behavior differences that can't be feature
	  // detected are enabled based on userAgent etc sniffing.
	  var userAgent = navigator.userAgent;
	  var platform = navigator.platform;

	  var gecko = /gecko\/\d/i.test(userAgent);
	  var ie_upto10 = /MSIE \d/.test(userAgent);
	  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
	  var edge = /Edge\/(\d+)/.exec(userAgent);
	  var ie = ie_upto10 || ie_11up || edge;
	  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
	  var webkit = !edge && /WebKit\//.test(userAgent);
	  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
	  var chrome = !edge && /Chrome\//.test(userAgent);
	  var presto = /Opera\//.test(userAgent);
	  var safari = /Apple Computer/.test(navigator.vendor);
	  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
	  var phantom = /PhantomJS/.test(userAgent);

	  var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
	  var android = /Android/.test(userAgent);
	  // This is woefully incomplete. Suggestions for alternative methods welcome.
	  var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
	  var mac = ios || /Mac/.test(platform);
	  var chromeOS = /\bCrOS\b/.test(userAgent);
	  var windows = /win/i.test(platform);

	  var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
	  if (presto_version) { presto_version = Number(presto_version[1]); }
	  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
	  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
	  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
	  var captureRightClick = gecko || (ie && ie_version >= 9);

	  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

	  var rmClass = function(node, cls) {
	    var current = node.className;
	    var match = classTest(cls).exec(current);
	    if (match) {
	      var after = current.slice(match.index + match[0].length);
	      node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
	    }
	  };

	  function removeChildren(e) {
	    for (var count = e.childNodes.length; count > 0; --count)
	      { e.removeChild(e.firstChild); }
	    return e
	  }

	  function removeChildrenAndAdd(parent, e) {
	    return removeChildren(parent).appendChild(e)
	  }

	  function elt(tag, content, className, style) {
	    var e = document.createElement(tag);
	    if (className) { e.className = className; }
	    if (style) { e.style.cssText = style; }
	    if (typeof content == "string") { e.appendChild(document.createTextNode(content)); }
	    else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]); } }
	    return e
	  }
	  // wrapper for elt, which removes the elt from the accessibility tree
	  function eltP(tag, content, className, style) {
	    var e = elt(tag, content, className, style);
	    e.setAttribute("role", "presentation");
	    return e
	  }

	  var range;
	  if (document.createRange) { range = function(node, start, end, endNode) {
	    var r = document.createRange();
	    r.setEnd(endNode || node, end);
	    r.setStart(node, start);
	    return r
	  }; }
	  else { range = function(node, start, end) {
	    var r = document.body.createTextRange();
	    try { r.moveToElementText(node.parentNode); }
	    catch(e) { return r }
	    r.collapse(true);
	    r.moveEnd("character", end);
	    r.moveStart("character", start);
	    return r
	  }; }

	  function contains(parent, child) {
	    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
	      { child = child.parentNode; }
	    if (parent.contains)
	      { return parent.contains(child) }
	    do {
	      if (child.nodeType == 11) { child = child.host; }
	      if (child == parent) { return true }
	    } while (child = child.parentNode)
	  }

	  function activeElt() {
	    // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
	    // IE < 10 will throw when accessed while the page is loading or in an iframe.
	    // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
	    var activeElement;
	    try {
	      activeElement = document.activeElement;
	    } catch(e) {
	      activeElement = document.body || null;
	    }
	    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
	      { activeElement = activeElement.shadowRoot.activeElement; }
	    return activeElement
	  }

	  function addClass(node, cls) {
	    var current = node.className;
	    if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls; }
	  }
	  function joinClasses(a, b) {
	    var as = a.split(" ");
	    for (var i = 0; i < as.length; i++)
	      { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i]; } }
	    return b
	  }

	  var selectInput = function(node) { node.select(); };
	  if (ios) // Mobile Safari apparently has a bug where select() is broken.
	    { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; }; }
	  else if (ie) // Suppress mysterious IE10 errors
	    { selectInput = function(node) { try { node.select(); } catch(_e) {} }; }

	  function bind(f) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    return function(){return f.apply(null, args)}
	  }

	  function copyObj(obj, target, overwrite) {
	    if (!target) { target = {}; }
	    for (var prop in obj)
	      { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
	        { target[prop] = obj[prop]; } }
	    return target
	  }

	  // Counts the column offset in a string, taking tabs into account.
	  // Used mostly to find indentation.
	  function countColumn(string, end, tabSize, startIndex, startValue) {
	    if (end == null) {
	      end = string.search(/[^\s\u00a0]/);
	      if (end == -1) { end = string.length; }
	    }
	    for (var i = startIndex || 0, n = startValue || 0;;) {
	      var nextTab = string.indexOf("\t", i);
	      if (nextTab < 0 || nextTab >= end)
	        { return n + (end - i) }
	      n += nextTab - i;
	      n += tabSize - (n % tabSize);
	      i = nextTab + 1;
	    }
	  }

	  var Delayed = function() {this.id = null;};
	  Delayed.prototype.set = function (ms, f) {
	    clearTimeout(this.id);
	    this.id = setTimeout(f, ms);
	  };

	  function indexOf(array, elt) {
	    for (var i = 0; i < array.length; ++i)
	      { if (array[i] == elt) { return i } }
	    return -1
	  }

	  // Number of pixels added to scroller and sizer to hide scrollbar
	  var scrollerGap = 30;

	  // Returned or thrown by various protocols to signal 'I'm not
	  // handling this'.
	  var Pass = {toString: function(){return "CodeMirror.Pass"}};

	  // Reused option objects for setSelection & friends
	  var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

	  // The inverse of countColumn -- find the offset that corresponds to
	  // a particular column.
	  function findColumn(string, goal, tabSize) {
	    for (var pos = 0, col = 0;;) {
	      var nextTab = string.indexOf("\t", pos);
	      if (nextTab == -1) { nextTab = string.length; }
	      var skipped = nextTab - pos;
	      if (nextTab == string.length || col + skipped >= goal)
	        { return pos + Math.min(skipped, goal - col) }
	      col += nextTab - pos;
	      col += tabSize - (col % tabSize);
	      pos = nextTab + 1;
	      if (col >= goal) { return pos }
	    }
	  }

	  var spaceStrs = [""];
	  function spaceStr(n) {
	    while (spaceStrs.length <= n)
	      { spaceStrs.push(lst(spaceStrs) + " "); }
	    return spaceStrs[n]
	  }

	  function lst(arr) { return arr[arr.length-1] }

	  function map(array, f) {
	    var out = [];
	    for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i); }
	    return out
	  }

	  function insertSorted(array, value, score) {
	    var pos = 0, priority = score(value);
	    while (pos < array.length && score(array[pos]) <= priority) { pos++; }
	    array.splice(pos, 0, value);
	  }

	  function nothing() {}

	  function createObj(base, props) {
	    var inst;
	    if (Object.create) {
	      inst = Object.create(base);
	    } else {
	      nothing.prototype = base;
	      inst = new nothing();
	    }
	    if (props) { copyObj(props, inst); }
	    return inst
	  }

	  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
	  function isWordCharBasic(ch) {
	    return /\w/.test(ch) || ch > "\x80" &&
	      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
	  }
	  function isWordChar(ch, helper) {
	    if (!helper) { return isWordCharBasic(ch) }
	    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
	    return helper.test(ch)
	  }

	  function isEmpty(obj) {
	    for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
	    return true
	  }

	  // Extending unicode characters. A series of a non-extending char +
	  // any number of extending chars is treated as a single unit as far
	  // as editing and measuring is concerned. This is not fully correct,
	  // since some scripts/fonts/browsers also treat other configurations
	  // of code points as a group.
	  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
	  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

	  // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
	  function skipExtendingChars(str, pos, dir) {
	    while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir; }
	    return pos
	  }

	  // Returns the value from the range [`from`; `to`] that satisfies
	  // `pred` and is closest to `from`. Assumes that at least `to`
	  // satisfies `pred`. Supports `from` being greater than `to`.
	  function findFirst(pred, from, to) {
	    // At any point we are certain `to` satisfies `pred`, don't know
	    // whether `from` does.
	    var dir = from > to ? -1 : 1;
	    for (;;) {
	      if (from == to) { return from }
	      var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
	      if (mid == from) { return pred(mid) ? from : to }
	      if (pred(mid)) { to = mid; }
	      else { from = mid + dir; }
	    }
	  }

	  // The display handles the DOM integration, both for input reading
	  // and content drawing. It holds references to DOM nodes and
	  // display-related state.

	  function Display(place, doc, input) {
	    var d = this;
	    this.input = input;

	    // Covers bottom-right square when both scrollbars are present.
	    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
	    d.scrollbarFiller.setAttribute("cm-not-content", "true");
	    // Covers bottom of gutter when coverGutterNextToScrollbar is on
	    // and h scrollbar is present.
	    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
	    d.gutterFiller.setAttribute("cm-not-content", "true");
	    // Will contain the actual code, positioned to cover the viewport.
	    d.lineDiv = eltP("div", null, "CodeMirror-code");
	    // Elements are added to these to represent selection and cursors.
	    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
	    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
	    // A visibility: hidden element used to find the size of things.
	    d.measure = elt("div", null, "CodeMirror-measure");
	    // When lines outside of the viewport are measured, they are drawn in this.
	    d.lineMeasure = elt("div", null, "CodeMirror-measure");
	    // Wraps everything that needs to exist inside the vertically-padded coordinate system
	    d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
	                      null, "position: relative; outline: none");
	    var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
	    // Moved around its parent to cover visible view.
	    d.mover = elt("div", [lines], null, "position: relative");
	    // Set to the height of the document, allowing scrolling.
	    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
	    d.sizerWidth = null;
	    // Behavior of elts with overflow: auto and padding is
	    // inconsistent across browsers. This is used to ensure the
	    // scrollable area is big enough.
	    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
	    // Will contain the gutters, if any.
	    d.gutters = elt("div", null, "CodeMirror-gutters");
	    d.lineGutter = null;
	    // Actual scrollable element.
	    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
	    d.scroller.setAttribute("tabIndex", "-1");
	    // The element in which the editor lives.
	    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

	    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
	    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
	    if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true; }

	    if (place) {
	      if (place.appendChild) { place.appendChild(d.wrapper); }
	      else { place(d.wrapper); }
	    }

	    // Current rendered range (may be bigger than the view window).
	    d.viewFrom = d.viewTo = doc.first;
	    d.reportedViewFrom = d.reportedViewTo = doc.first;
	    // Information about the rendered lines.
	    d.view = [];
	    d.renderedView = null;
	    // Holds info about a single rendered line when it was rendered
	    // for measurement, while not in view.
	    d.externalMeasured = null;
	    // Empty space (in pixels) above the view
	    d.viewOffset = 0;
	    d.lastWrapHeight = d.lastWrapWidth = 0;
	    d.updateLineNumbers = null;

	    d.nativeBarWidth = d.barHeight = d.barWidth = 0;
	    d.scrollbarsClipped = false;

	    // Used to only resize the line number gutter when necessary (when
	    // the amount of lines crosses a boundary that makes its width change)
	    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
	    // Set to true when a non-horizontal-scrolling line widget is
	    // added. As an optimization, line widget aligning is skipped when
	    // this is false.
	    d.alignWidgets = false;

	    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

	    // Tracks the maximum line length so that the horizontal scrollbar
	    // can be kept static when scrolling.
	    d.maxLine = null;
	    d.maxLineLength = 0;
	    d.maxLineChanged = false;

	    // Used for measuring wheel scrolling granularity
	    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

	    // True when shift is held down.
	    d.shift = false;

	    // Used to track whether anything happened since the context menu
	    // was opened.
	    d.selForContextMenu = null;

	    d.activeTouch = null;

	    input.init(d);
	  }

	  // Find the line object corresponding to the given line number.
	  function getLine(doc, n) {
	    n -= doc.first;
	    if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
	    var chunk = doc;
	    while (!chunk.lines) {
	      for (var i = 0;; ++i) {
	        var child = chunk.children[i], sz = child.chunkSize();
	        if (n < sz) { chunk = child; break }
	        n -= sz;
	      }
	    }
	    return chunk.lines[n]
	  }

	  // Get the part of a document between two positions, as an array of
	  // strings.
	  function getBetween(doc, start, end) {
	    var out = [], n = start.line;
	    doc.iter(start.line, end.line + 1, function (line) {
	      var text = line.text;
	      if (n == end.line) { text = text.slice(0, end.ch); }
	      if (n == start.line) { text = text.slice(start.ch); }
	      out.push(text);
	      ++n;
	    });
	    return out
	  }
	  // Get the lines between from and to, as array of strings.
	  function getLines(doc, from, to) {
	    var out = [];
	    doc.iter(from, to, function (line) { out.push(line.text); }); // iter aborts when callback returns truthy value
	    return out
	  }

	  // Update the height of a line, propagating the height change
	  // upwards to parent nodes.
	  function updateLineHeight(line, height) {
	    var diff = height - line.height;
	    if (diff) { for (var n = line; n; n = n.parent) { n.height += diff; } }
	  }

	  // Given a line object, find its line number by walking up through
	  // its parent links.
	  function lineNo(line) {
	    if (line.parent == null) { return null }
	    var cur = line.parent, no = indexOf(cur.lines, line);
	    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
	      for (var i = 0;; ++i) {
	        if (chunk.children[i] == cur) { break }
	        no += chunk.children[i].chunkSize();
	      }
	    }
	    return no + cur.first
	  }

	  // Find the line at the given vertical position, using the height
	  // information in the document tree.
	  function lineAtHeight(chunk, h) {
	    var n = chunk.first;
	    outer: do {
	      for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
	        var child = chunk.children[i$1], ch = child.height;
	        if (h < ch) { chunk = child; continue outer }
	        h -= ch;
	        n += child.chunkSize();
	      }
	      return n
	    } while (!chunk.lines)
	    var i = 0;
	    for (; i < chunk.lines.length; ++i) {
	      var line = chunk.lines[i], lh = line.height;
	      if (h < lh) { break }
	      h -= lh;
	    }
	    return n + i
	  }

	  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

	  function lineNumberFor(options, i) {
	    return String(options.lineNumberFormatter(i + options.firstLineNumber))
	  }

	  // A Pos instance represents a position within the text.
	  function Pos(line, ch, sticky) {
	    if ( sticky === void 0 ) sticky = null;

	    if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
	    this.line = line;
	    this.ch = ch;
	    this.sticky = sticky;
	  }

	  // Compare two positions, return 0 if they are the same, a negative
	  // number when a is less, and a positive number otherwise.
	  function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

	  function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

	  function copyPos(x) {return Pos(x.line, x.ch)}
	  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
	  function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

	  // Most of the external API clips given positions to make sure they
	  // actually exist within the document.
	  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
	  function clipPos(doc, pos) {
	    if (pos.line < doc.first) { return Pos(doc.first, 0) }
	    var last = doc.first + doc.size - 1;
	    if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
	    return clipToLen(pos, getLine(doc, pos.line).text.length)
	  }
	  function clipToLen(pos, linelen) {
	    var ch = pos.ch;
	    if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
	    else if (ch < 0) { return Pos(pos.line, 0) }
	    else { return pos }
	  }
	  function clipPosArray(doc, array) {
	    var out = [];
	    for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]); }
	    return out
	  }

	  // Optimize some code when these features are not used.
	  var sawReadOnlySpans = false, sawCollapsedSpans = false;

	  function seeReadOnlySpans() {
	    sawReadOnlySpans = true;
	  }

	  function seeCollapsedSpans() {
	    sawCollapsedSpans = true;
	  }

	  // TEXTMARKER SPANS

	  function MarkedSpan(marker, from, to) {
	    this.marker = marker;
	    this.from = from; this.to = to;
	  }

	  // Search an array of spans for a span matching the given marker.
	  function getMarkedSpanFor(spans, marker) {
	    if (spans) { for (var i = 0; i < spans.length; ++i) {
	      var span = spans[i];
	      if (span.marker == marker) { return span }
	    } }
	  }
	  // Remove a span from an array, returning undefined if no spans are
	  // left (we don't store arrays for lines without spans).
	  function removeMarkedSpan(spans, span) {
	    var r;
	    for (var i = 0; i < spans.length; ++i)
	      { if (spans[i] != span) { (r || (r = [])).push(spans[i]); } }
	    return r
	  }
	  // Add a span to a line.
	  function addMarkedSpan(line, span) {
	    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
	    span.marker.attachLine(line);
	  }

	  // Used for the algorithm that adjusts markers for a change in the
	  // document. These functions cut an array of spans at a given
	  // character position, returning an array of remaining chunks (or
	  // undefined if nothing remains).
	  function markedSpansBefore(old, startCh, isInsert) {
	    var nw;
	    if (old) { for (var i = 0; i < old.length; ++i) {
	      var span = old[i], marker = span.marker;
	      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
	      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
	        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
	        ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
	      }
	    } }
	    return nw
	  }
	  function markedSpansAfter(old, endCh, isInsert) {
	    var nw;
	    if (old) { for (var i = 0; i < old.length; ++i) {
	      var span = old[i], marker = span.marker;
	      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
	      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
	        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
	        ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
	                                              span.to == null ? null : span.to - endCh));
	      }
	    } }
	    return nw
	  }

	  // Given a change object, compute the new set of marker spans that
	  // cover the line in which the change took place. Removes spans
	  // entirely within the change, reconnects spans belonging to the
	  // same marker that appear on both sides of the change, and cuts off
	  // spans partially within the change. Returns an array of span
	  // arrays with one element for each line in (after) the change.
	  function stretchSpansOverChange(doc, change) {
	    if (change.full) { return null }
	    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
	    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
	    if (!oldFirst && !oldLast) { return null }

	    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
	    // Get the spans that 'stick out' on both sides
	    var first = markedSpansBefore(oldFirst, startCh, isInsert);
	    var last = markedSpansAfter(oldLast, endCh, isInsert);

	    // Next, merge those two ends
	    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
	    if (first) {
	      // Fix up .to properties of first
	      for (var i = 0; i < first.length; ++i) {
	        var span = first[i];
	        if (span.to == null) {
	          var found = getMarkedSpanFor(last, span.marker);
	          if (!found) { span.to = startCh; }
	          else if (sameLine) { span.to = found.to == null ? null : found.to + offset; }
	        }
	      }
	    }
	    if (last) {
	      // Fix up .from in last (or move them into first in case of sameLine)
	      for (var i$1 = 0; i$1 < last.length; ++i$1) {
	        var span$1 = last[i$1];
	        if (span$1.to != null) { span$1.to += offset; }
	        if (span$1.from == null) {
	          var found$1 = getMarkedSpanFor(first, span$1.marker);
	          if (!found$1) {
	            span$1.from = offset;
	            if (sameLine) { (first || (first = [])).push(span$1); }
	          }
	        } else {
	          span$1.from += offset;
	          if (sameLine) { (first || (first = [])).push(span$1); }
	        }
	      }
	    }
	    // Make sure we didn't create any zero-length spans
	    if (first) { first = clearEmptySpans(first); }
	    if (last && last != first) { last = clearEmptySpans(last); }

	    var newMarkers = [first];
	    if (!sameLine) {
	      // Fill gap with whole-line-spans
	      var gap = change.text.length - 2, gapMarkers;
	      if (gap > 0 && first)
	        { for (var i$2 = 0; i$2 < first.length; ++i$2)
	          { if (first[i$2].to == null)
	            { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)); } } }
	      for (var i$3 = 0; i$3 < gap; ++i$3)
	        { newMarkers.push(gapMarkers); }
	      newMarkers.push(last);
	    }
	    return newMarkers
	  }

	  // Remove spans that are empty and don't have a clearWhenEmpty
	  // option of false.
	  function clearEmptySpans(spans) {
	    for (var i = 0; i < spans.length; ++i) {
	      var span = spans[i];
	      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
	        { spans.splice(i--, 1); }
	    }
	    if (!spans.length) { return null }
	    return spans
	  }

	  // Used to 'clip' out readOnly ranges when making a change.
	  function removeReadOnlyRanges(doc, from, to) {
	    var markers = null;
	    doc.iter(from.line, to.line + 1, function (line) {
	      if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
	        var mark = line.markedSpans[i].marker;
	        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
	          { (markers || (markers = [])).push(mark); }
	      } }
	    });
	    if (!markers) { return null }
	    var parts = [{from: from, to: to}];
	    for (var i = 0; i < markers.length; ++i) {
	      var mk = markers[i], m = mk.find(0);
	      for (var j = 0; j < parts.length; ++j) {
	        var p = parts[j];
	        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
	        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
	        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
	          { newParts.push({from: p.from, to: m.from}); }
	        if (dto > 0 || !mk.inclusiveRight && !dto)
	          { newParts.push({from: m.to, to: p.to}); }
	        parts.splice.apply(parts, newParts);
	        j += newParts.length - 3;
	      }
	    }
	    return parts
	  }

	  // Connect or disconnect spans from a line.
	  function detachMarkedSpans(line) {
	    var spans = line.markedSpans;
	    if (!spans) { return }
	    for (var i = 0; i < spans.length; ++i)
	      { spans[i].marker.detachLine(line); }
	    line.markedSpans = null;
	  }
	  function attachMarkedSpans(line, spans) {
	    if (!spans) { return }
	    for (var i = 0; i < spans.length; ++i)
	      { spans[i].marker.attachLine(line); }
	    line.markedSpans = spans;
	  }

	  // Helpers used when computing which overlapping collapsed span
	  // counts as the larger one.
	  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
	  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

	  // Returns a number indicating which of two overlapping collapsed
	  // spans is larger (and thus includes the other). Falls back to
	  // comparing ids when the spans cover exactly the same range.
	  function compareCollapsedMarkers(a, b) {
	    var lenDiff = a.lines.length - b.lines.length;
	    if (lenDiff != 0) { return lenDiff }
	    var aPos = a.find(), bPos = b.find();
	    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
	    if (fromCmp) { return -fromCmp }
	    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
	    if (toCmp) { return toCmp }
	    return b.id - a.id
	  }

	  // Find out whether a line ends or starts in a collapsed span. If
	  // so, return the marker for that span.
	  function collapsedSpanAtSide(line, start) {
	    var sps = sawCollapsedSpans && line.markedSpans, found;
	    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
	      sp = sps[i];
	      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
	          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
	        { found = sp.marker; }
	    } }
	    return found
	  }
	  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
	  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

	  function collapsedSpanAround(line, ch) {
	    var sps = sawCollapsedSpans && line.markedSpans, found;
	    if (sps) { for (var i = 0; i < sps.length; ++i) {
	      var sp = sps[i];
	      if (sp.marker.collapsed && (sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) &&
	          (!found || compareCollapsedMarkers(found, sp.marker) < 0)) { found = sp.marker; }
	    } }
	    return found
	  }

	  // Test whether there exists a collapsed span that partially
	  // overlaps (covers the start or end, but not both) of a new span.
	  // Such overlap is not allowed.
	  function conflictingCollapsedRange(doc, lineNo$$1, from, to, marker) {
	    var line = getLine(doc, lineNo$$1);
	    var sps = sawCollapsedSpans && line.markedSpans;
	    if (sps) { for (var i = 0; i < sps.length; ++i) {
	      var sp = sps[i];
	      if (!sp.marker.collapsed) { continue }
	      var found = sp.marker.find(0);
	      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
	      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
	      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
	      if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
	          fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
	        { return true }
	    } }
	  }

	  // A visual line is a line as drawn on the screen. Folding, for
	  // example, can cause multiple logical lines to appear on the same
	  // visual line. This finds the start of the visual line that the
	  // given line is part of (usually that is the line itself).
	  function visualLine(line) {
	    var merged;
	    while (merged = collapsedSpanAtStart(line))
	      { line = merged.find(-1, true).line; }
	    return line
	  }

	  function visualLineEnd(line) {
	    var merged;
	    while (merged = collapsedSpanAtEnd(line))
	      { line = merged.find(1, true).line; }
	    return line
	  }

	  // Returns an array of logical lines that continue the visual line
	  // started by the argument, or undefined if there are no such lines.
	  function visualLineContinued(line) {
	    var merged, lines;
	    while (merged = collapsedSpanAtEnd(line)) {
	      line = merged.find(1, true).line
	      ;(lines || (lines = [])).push(line);
	    }
	    return lines
	  }

	  // Get the line number of the start of the visual line that the
	  // given line number is part of.
	  function visualLineNo(doc, lineN) {
	    var line = getLine(doc, lineN), vis = visualLine(line);
	    if (line == vis) { return lineN }
	    return lineNo(vis)
	  }

	  // Get the line number of the start of the next visual line after
	  // the given line.
	  function visualLineEndNo(doc, lineN) {
	    if (lineN > doc.lastLine()) { return lineN }
	    var line = getLine(doc, lineN), merged;
	    if (!lineIsHidden(doc, line)) { return lineN }
	    while (merged = collapsedSpanAtEnd(line))
	      { line = merged.find(1, true).line; }
	    return lineNo(line) + 1
	  }

	  // Compute whether a line is hidden. Lines count as hidden when they
	  // are part of a visual line that starts with another line, or when
	  // they are entirely covered by collapsed, non-widget span.
	  function lineIsHidden(doc, line) {
	    var sps = sawCollapsedSpans && line.markedSpans;
	    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
	      sp = sps[i];
	      if (!sp.marker.collapsed) { continue }
	      if (sp.from == null) { return true }
	      if (sp.marker.widgetNode) { continue }
	      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
	        { return true }
	    } }
	  }
	  function lineIsHiddenInner(doc, line, span) {
	    if (span.to == null) {
	      var end = span.marker.find(1, true);
	      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
	    }
	    if (span.marker.inclusiveRight && span.to == line.text.length)
	      { return true }
	    for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
	      sp = line.markedSpans[i];
	      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
	          (sp.to == null || sp.to != span.from) &&
	          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
	          lineIsHiddenInner(doc, line, sp)) { return true }
	    }
	  }

	  // Find the height above the given line.
	  function heightAtLine(lineObj) {
	    lineObj = visualLine(lineObj);

	    var h = 0, chunk = lineObj.parent;
	    for (var i = 0; i < chunk.lines.length; ++i) {
	      var line = chunk.lines[i];
	      if (line == lineObj) { break }
	      else { h += line.height; }
	    }
	    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
	      for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
	        var cur = p.children[i$1];
	        if (cur == chunk) { break }
	        else { h += cur.height; }
	      }
	    }
	    return h
	  }

	  // Compute the character length of a line, taking into account
	  // collapsed ranges (see markText) that might hide parts, and join
	  // other lines onto it.
	  function lineLength(line) {
	    if (line.height == 0) { return 0 }
	    var len = line.text.length, merged, cur = line;
	    while (merged = collapsedSpanAtStart(cur)) {
	      var found = merged.find(0, true);
	      cur = found.from.line;
	      len += found.from.ch - found.to.ch;
	    }
	    cur = line;
	    while (merged = collapsedSpanAtEnd(cur)) {
	      var found$1 = merged.find(0, true);
	      len -= cur.text.length - found$1.from.ch;
	      cur = found$1.to.line;
	      len += cur.text.length - found$1.to.ch;
	    }
	    return len
	  }

	  // Find the longest line in the document.
	  function findMaxLine(cm) {
	    var d = cm.display, doc = cm.doc;
	    d.maxLine = getLine(doc, doc.first);
	    d.maxLineLength = lineLength(d.maxLine);
	    d.maxLineChanged = true;
	    doc.iter(function (line) {
	      var len = lineLength(line);
	      if (len > d.maxLineLength) {
	        d.maxLineLength = len;
	        d.maxLine = line;
	      }
	    });
	  }

	  // BIDI HELPERS

	  function iterateBidiSections(order, from, to, f) {
	    if (!order) { return f(from, to, "ltr", 0) }
	    var found = false;
	    for (var i = 0; i < order.length; ++i) {
	      var part = order[i];
	      if (part.from < to && part.to > from || from == to && part.to == from) {
	        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
	        found = true;
	      }
	    }
	    if (!found) { f(from, to, "ltr"); }
	  }

	  var bidiOther = null;
	  function getBidiPartAt(order, ch, sticky) {
	    var found;
	    bidiOther = null;
	    for (var i = 0; i < order.length; ++i) {
	      var cur = order[i];
	      if (cur.from < ch && cur.to > ch) { return i }
	      if (cur.to == ch) {
	        if (cur.from != cur.to && sticky == "before") { found = i; }
	        else { bidiOther = i; }
	      }
	      if (cur.from == ch) {
	        if (cur.from != cur.to && sticky != "before") { found = i; }
	        else { bidiOther = i; }
	      }
	    }
	    return found != null ? found : bidiOther
	  }

	  // Bidirectional ordering algorithm
	  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
	  // that this (partially) implements.

	  // One-char codes used for character types:
	  // L (L):   Left-to-Right
	  // R (R):   Right-to-Left
	  // r (AL):  Right-to-Left Arabic
	  // 1 (EN):  European Number
	  // + (ES):  European Number Separator
	  // % (ET):  European Number Terminator
	  // n (AN):  Arabic Number
	  // , (CS):  Common Number Separator
	  // m (NSM): Non-Spacing Mark
	  // b (BN):  Boundary Neutral
	  // s (B):   Paragraph Separator
	  // t (S):   Segment Separator
	  // w (WS):  Whitespace
	  // N (ON):  Other Neutrals

	  // Returns null if characters are ordered as they appear
	  // (left-to-right), or an array of sections ({from, to, level}
	  // objects) in the order in which they occur visually.
	  var bidiOrdering = (function() {
	    // Character types for codepoints 0 to 0xff
	    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
	    // Character types for codepoints 0x600 to 0x6f9
	    var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
	    function charType(code) {
	      if (code <= 0xf7) { return lowTypes.charAt(code) }
	      else if (0x590 <= code && code <= 0x5f4) { return "R" }
	      else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
	      else if (0x6ee <= code && code <= 0x8ac) { return "r" }
	      else if (0x2000 <= code && code <= 0x200b) { return "w" }
	      else if (code == 0x200c) { return "b" }
	      else { return "L" }
	    }

	    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
	    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;

	    function BidiSpan(level, from, to) {
	      this.level = level;
	      this.from = from; this.to = to;
	    }

	    return function(str, direction) {
	      var outerType = direction == "ltr" ? "L" : "R";

	      if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
	      var len = str.length, types = [];
	      for (var i = 0; i < len; ++i)
	        { types.push(charType(str.charCodeAt(i))); }

	      // W1. Examine each non-spacing mark (NSM) in the level run, and
	      // change the type of the NSM to the type of the previous
	      // character. If the NSM is at the start of the level run, it will
	      // get the type of sor.
	      for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
	        var type = types[i$1];
	        if (type == "m") { types[i$1] = prev; }
	        else { prev = type; }
	      }

	      // W2. Search backwards from each instance of a European number
	      // until the first strong type (R, L, AL, or sor) is found. If an
	      // AL is found, change the type of the European number to Arabic
	      // number.
	      // W3. Change all ALs to R.
	      for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
	        var type$1 = types[i$2];
	        if (type$1 == "1" && cur == "r") { types[i$2] = "n"; }
	        else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R"; } }
	      }

	      // W4. A single European separator between two European numbers
	      // changes to a European number. A single common separator between
	      // two numbers of the same type changes to that type.
	      for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
	        var type$2 = types[i$3];
	        if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1"; }
	        else if (type$2 == "," && prev$1 == types[i$3+1] &&
	                 (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1; }
	        prev$1 = type$2;
	      }

	      // W5. A sequence of European terminators adjacent to European
	      // numbers changes to all European numbers.
	      // W6. Otherwise, separators and terminators change to Other
	      // Neutral.
	      for (var i$4 = 0; i$4 < len; ++i$4) {
	        var type$3 = types[i$4];
	        if (type$3 == ",") { types[i$4] = "N"; }
	        else if (type$3 == "%") {
	          var end = (void 0);
	          for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
	          var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
	          for (var j = i$4; j < end; ++j) { types[j] = replace; }
	          i$4 = end - 1;
	        }
	      }

	      // W7. Search backwards from each instance of a European number
	      // until the first strong type (R, L, or sor) is found. If an L is
	      // found, then change the type of the European number to L.
	      for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
	        var type$4 = types[i$5];
	        if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L"; }
	        else if (isStrong.test(type$4)) { cur$1 = type$4; }
	      }

	      // N1. A sequence of neutrals takes the direction of the
	      // surrounding strong text if the text on both sides has the same
	      // direction. European and Arabic numbers act as if they were R in
	      // terms of their influence on neutrals. Start-of-level-run (sor)
	      // and end-of-level-run (eor) are used at level run boundaries.
	      // N2. Any remaining neutrals take the embedding direction.
	      for (var i$6 = 0; i$6 < len; ++i$6) {
	        if (isNeutral.test(types[i$6])) {
	          var end$1 = (void 0);
	          for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
	          var before = (i$6 ? types[i$6-1] : outerType) == "L";
	          var after = (end$1 < len ? types[end$1] : outerType) == "L";
	          var replace$1 = before == after ? (before ? "L" : "R") : outerType;
	          for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1; }
	          i$6 = end$1 - 1;
	        }
	      }

	      // Here we depart from the documented algorithm, in order to avoid
	      // building up an actual levels array. Since there are only three
	      // levels (0, 1, 2) in an implementation that doesn't take
	      // explicit embedding into account, we can build up the order on
	      // the fly, without following the level-based algorithm.
	      var order = [], m;
	      for (var i$7 = 0; i$7 < len;) {
	        if (countsAsLeft.test(types[i$7])) {
	          var start = i$7;
	          for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
	          order.push(new BidiSpan(0, start, i$7));
	        } else {
	          var pos = i$7, at = order.length;
	          for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
	          for (var j$2 = pos; j$2 < i$7;) {
	            if (countsAsNum.test(types[j$2])) {
	              if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)); }
	              var nstart = j$2;
	              for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
	              order.splice(at, 0, new BidiSpan(2, nstart, j$2));
	              pos = j$2;
	            } else { ++j$2; }
	          }
	          if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)); }
	        }
	      }
	      if (direction == "ltr") {
	        if (order[0].level == 1 && (m = str.match(/^\s+/))) {
	          order[0].from = m[0].length;
	          order.unshift(new BidiSpan(0, 0, m[0].length));
	        }
	        if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
	          lst(order).to -= m[0].length;
	          order.push(new BidiSpan(0, len - m[0].length, len));
	        }
	      }

	      return direction == "rtl" ? order.reverse() : order
	    }
	  })();

	  // Get the bidi ordering for the given line (and cache it). Returns
	  // false for lines that are fully left-to-right, and an array of
	  // BidiSpan objects otherwise.
	  function getOrder(line, direction) {
	    var order = line.order;
	    if (order == null) { order = line.order = bidiOrdering(line.text, direction); }
	    return order
	  }

	  // EVENT HANDLING

	  // Lightweight event framework. on/off also work on DOM nodes,
	  // registering native DOM handlers.

	  var noHandlers = [];

	  var on = function(emitter, type, f) {
	    if (emitter.addEventListener) {
	      emitter.addEventListener(type, f, false);
	    } else if (emitter.attachEvent) {
	      emitter.attachEvent("on" + type, f);
	    } else {
	      var map$$1 = emitter._handlers || (emitter._handlers = {});
	      map$$1[type] = (map$$1[type] || noHandlers).concat(f);
	    }
	  };

	  function getHandlers(emitter, type) {
	    return emitter._handlers && emitter._handlers[type] || noHandlers
	  }

	  function off(emitter, type, f) {
	    if (emitter.removeEventListener) {
	      emitter.removeEventListener(type, f, false);
	    } else if (emitter.detachEvent) {
	      emitter.detachEvent("on" + type, f);
	    } else {
	      var map$$1 = emitter._handlers, arr = map$$1 && map$$1[type];
	      if (arr) {
	        var index = indexOf(arr, f);
	        if (index > -1)
	          { map$$1[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
	      }
	    }
	  }

	  function signal(emitter, type /*, values...*/) {
	    var handlers = getHandlers(emitter, type);
	    if (!handlers.length) { return }
	    var args = Array.prototype.slice.call(arguments, 2);
	    for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
	  }

	  // The DOM events that CodeMirror handles can be overridden by
	  // registering a (non-DOM) handler on the editor for the event name,
	  // and preventDefault-ing the event in that handler.
	  function signalDOMEvent(cm, e, override) {
	    if (typeof e == "string")
	      { e = {type: e, preventDefault: function() { this.defaultPrevented = true; }}; }
	    signal(cm, override || e.type, cm, e);
	    return e_defaultPrevented(e) || e.codemirrorIgnore
	  }

	  function signalCursorActivity(cm) {
	    var arr = cm._handlers && cm._handlers.cursorActivity;
	    if (!arr) { return }
	    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
	    for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
	      { set.push(arr[i]); } }
	  }

	  function hasHandler(emitter, type) {
	    return getHandlers(emitter, type).length > 0
	  }

	  // Add on and off methods to a constructor's prototype, to make
	  // registering events on such objects more convenient.
	  function eventMixin(ctor) {
	    ctor.prototype.on = function(type, f) {on(this, type, f);};
	    ctor.prototype.off = function(type, f) {off(this, type, f);};
	  }

	  // Due to the fact that we still support jurassic IE versions, some
	  // compatibility wrappers are needed.

	  function e_preventDefault(e) {
	    if (e.preventDefault) { e.preventDefault(); }
	    else { e.returnValue = false; }
	  }
	  function e_stopPropagation(e) {
	    if (e.stopPropagation) { e.stopPropagation(); }
	    else { e.cancelBubble = true; }
	  }
	  function e_defaultPrevented(e) {
	    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
	  }
	  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}

	  function e_target(e) {return e.target || e.srcElement}
	  function e_button(e) {
	    var b = e.which;
	    if (b == null) {
	      if (e.button & 1) { b = 1; }
	      else if (e.button & 2) { b = 3; }
	      else if (e.button & 4) { b = 2; }
	    }
	    if (mac && e.ctrlKey && b == 1) { b = 3; }
	    return b
	  }

	  // Detect drag-and-drop
	  var dragAndDrop = function() {
	    // There is *some* kind of drag-and-drop support in IE6-8, but I
	    // couldn't get it to work yet.
	    if (ie && ie_version < 9) { return false }
	    var div = elt('div');
	    return "draggable" in div || "dragDrop" in div
	  }();

	  var zwspSupported;
	  function zeroWidthElement(measure) {
	    if (zwspSupported == null) {
	      var test = elt("span", "\u200b");
	      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
	      if (measure.firstChild.offsetHeight != 0)
	        { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8); }
	    }
	    var node = zwspSupported ? elt("span", "\u200b") :
	      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
	    node.setAttribute("cm-text", "");
	    return node
	  }

	  // Feature-detect IE's crummy client rect reporting for bidi text
	  var badBidiRects;
	  function hasBadBidiRects(measure) {
	    if (badBidiRects != null) { return badBidiRects }
	    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
	    var r0 = range(txt, 0, 1).getBoundingClientRect();
	    var r1 = range(txt, 1, 2).getBoundingClientRect();
	    removeChildren(measure);
	    if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
	    return badBidiRects = (r1.right - r0.right < 3)
	  }

	  // See if "".split is the broken IE version, if so, provide an
	  // alternative way to split lines.
	  var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
	    var pos = 0, result = [], l = string.length;
	    while (pos <= l) {
	      var nl = string.indexOf("\n", pos);
	      if (nl == -1) { nl = string.length; }
	      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
	      var rt = line.indexOf("\r");
	      if (rt != -1) {
	        result.push(line.slice(0, rt));
	        pos += rt + 1;
	      } else {
	        result.push(line);
	        pos = nl + 1;
	      }
	    }
	    return result
	  } : function (string) { return string.split(/\r\n?|\n/); };

	  var hasSelection = window.getSelection ? function (te) {
	    try { return te.selectionStart != te.selectionEnd }
	    catch(e) { return false }
	  } : function (te) {
	    var range$$1;
	    try {range$$1 = te.ownerDocument.selection.createRange();}
	    catch(e) {}
	    if (!range$$1 || range$$1.parentElement() != te) { return false }
	    return range$$1.compareEndPoints("StartToEnd", range$$1) != 0
	  };

	  var hasCopyEvent = (function () {
	    var e = elt("div");
	    if ("oncopy" in e) { return true }
	    e.setAttribute("oncopy", "return;");
	    return typeof e.oncopy == "function"
	  })();

	  var badZoomedRects = null;
	  function hasBadZoomedRects(measure) {
	    if (badZoomedRects != null) { return badZoomedRects }
	    var node = removeChildrenAndAdd(measure, elt("span", "x"));
	    var normal = node.getBoundingClientRect();
	    var fromRange = range(node, 0, 1).getBoundingClientRect();
	    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
	  }

	  // Known modes, by name and by MIME
	  var modes = {}, mimeModes = {};

	  // Extra arguments are stored as the mode's dependencies, which is
	  // used by (legacy) mechanisms like loadmode.js to automatically
	  // load a mode. (Preferred mechanism is the require/define calls.)
	  function defineMode(name, mode) {
	    if (arguments.length > 2)
	      { mode.dependencies = Array.prototype.slice.call(arguments, 2); }
	    modes[name] = mode;
	  }

	  function defineMIME(mime, spec) {
	    mimeModes[mime] = spec;
	  }

	  // Given a MIME type, a {name, ...options} config object, or a name
	  // string, return a mode config object.
	  function resolveMode(spec) {
	    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
	      spec = mimeModes[spec];
	    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
	      var found = mimeModes[spec.name];
	      if (typeof found == "string") { found = {name: found}; }
	      spec = createObj(found, spec);
	      spec.name = found.name;
	    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
	      return resolveMode("application/xml")
	    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
	      return resolveMode("application/json")
	    }
	    if (typeof spec == "string") { return {name: spec} }
	    else { return spec || {name: "null"} }
	  }

	  // Given a mode spec (anything that resolveMode accepts), find and
	  // initialize an actual mode object.
	  function getMode(options, spec) {
	    spec = resolveMode(spec);
	    var mfactory = modes[spec.name];
	    if (!mfactory) { return getMode(options, "text/plain") }
	    var modeObj = mfactory(options, spec);
	    if (modeExtensions.hasOwnProperty(spec.name)) {
	      var exts = modeExtensions[spec.name];
	      for (var prop in exts) {
	        if (!exts.hasOwnProperty(prop)) { continue }
	        if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop]; }
	        modeObj[prop] = exts[prop];
	      }
	    }
	    modeObj.name = spec.name;
	    if (spec.helperType) { modeObj.helperType = spec.helperType; }
	    if (spec.modeProps) { for (var prop$1 in spec.modeProps)
	      { modeObj[prop$1] = spec.modeProps[prop$1]; } }

	    return modeObj
	  }

	  // This can be used to attach properties to mode objects from
	  // outside the actual mode definition.
	  var modeExtensions = {};
	  function extendMode(mode, properties) {
	    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
	    copyObj(properties, exts);
	  }

	  function copyState(mode, state) {
	    if (state === true) { return state }
	    if (mode.copyState) { return mode.copyState(state) }
	    var nstate = {};
	    for (var n in state) {
	      var val = state[n];
	      if (val instanceof Array) { val = val.concat([]); }
	      nstate[n] = val;
	    }
	    return nstate
	  }

	  // Given a mode and a state (for that mode), find the inner mode and
	  // state at the position that the state refers to.
	  function innerMode(mode, state) {
	    var info;
	    while (mode.innerMode) {
	      info = mode.innerMode(state);
	      if (!info || info.mode == mode) { break }
	      state = info.state;
	      mode = info.mode;
	    }
	    return info || {mode: mode, state: state}
	  }

	  function startState(mode, a1, a2) {
	    return mode.startState ? mode.startState(a1, a2) : true
	  }

	  // STRING STREAM

	  // Fed to the mode parsers, provides helper functions to make
	  // parsers more succinct.

	  var StringStream = function(string, tabSize, lineOracle) {
	    this.pos = this.start = 0;
	    this.string = string;
	    this.tabSize = tabSize || 8;
	    this.lastColumnPos = this.lastColumnValue = 0;
	    this.lineStart = 0;
	    this.lineOracle = lineOracle;
	  };

	  StringStream.prototype.eol = function () {return this.pos >= this.string.length};
	  StringStream.prototype.sol = function () {return this.pos == this.lineStart};
	  StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
	  StringStream.prototype.next = function () {
	    if (this.pos < this.string.length)
	      { return this.string.charAt(this.pos++) }
	  };
	  StringStream.prototype.eat = function (match) {
	    var ch = this.string.charAt(this.pos);
	    var ok;
	    if (typeof match == "string") { ok = ch == match; }
	    else { ok = ch && (match.test ? match.test(ch) : match(ch)); }
	    if (ok) {++this.pos; return ch}
	  };
	  StringStream.prototype.eatWhile = function (match) {
	    var start = this.pos;
	    while (this.eat(match)){}
	    return this.pos > start
	  };
	  StringStream.prototype.eatSpace = function () {
	      var this$1 = this;

	    var start = this.pos;
	    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos; }
	    return this.pos > start
	  };
	  StringStream.prototype.skipToEnd = function () {this.pos = this.string.length;};
	  StringStream.prototype.skipTo = function (ch) {
	    var found = this.string.indexOf(ch, this.pos);
	    if (found > -1) {this.pos = found; return true}
	  };
	  StringStream.prototype.backUp = function (n) {this.pos -= n;};
	  StringStream.prototype.column = function () {
	    if (this.lastColumnPos < this.start) {
	      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
	      this.lastColumnPos = this.start;
	    }
	    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
	  };
	  StringStream.prototype.indentation = function () {
	    return countColumn(this.string, null, this.tabSize) -
	      (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
	  };
	  StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
	    if (typeof pattern == "string") {
	      var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
	      var substr = this.string.substr(this.pos, pattern.length);
	      if (cased(substr) == cased(pattern)) {
	        if (consume !== false) { this.pos += pattern.length; }
	        return true
	      }
	    } else {
	      var match = this.string.slice(this.pos).match(pattern);
	      if (match && match.index > 0) { return null }
	      if (match && consume !== false) { this.pos += match[0].length; }
	      return match
	    }
	  };
	  StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
	  StringStream.prototype.hideFirstChars = function (n, inner) {
	    this.lineStart += n;
	    try { return inner() }
	    finally { this.lineStart -= n; }
	  };
	  StringStream.prototype.lookAhead = function (n) {
	    var oracle = this.lineOracle;
	    return oracle && oracle.lookAhead(n)
	  };
	  StringStream.prototype.baseToken = function () {
	    var oracle = this.lineOracle;
	    return oracle && oracle.baseToken(this.pos)
	  };

	  var SavedContext = function(state, lookAhead) {
	    this.state = state;
	    this.lookAhead = lookAhead;
	  };

	  var Context = function(doc, state, line, lookAhead) {
	    this.state = state;
	    this.doc = doc;
	    this.line = line;
	    this.maxLookAhead = lookAhead || 0;
	    this.baseTokens = null;
	    this.baseTokenPos = 1;
	  };

	  Context.prototype.lookAhead = function (n) {
	    var line = this.doc.getLine(this.line + n);
	    if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n; }
	    return line
	  };

	  Context.prototype.baseToken = function (n) {
	      var this$1 = this;

	    if (!this.baseTokens) { return null }
	    while (this.baseTokens[this.baseTokenPos] <= n)
	      { this$1.baseTokenPos += 2; }
	    var type = this.baseTokens[this.baseTokenPos + 1];
	    return {type: type && type.replace(/( |^)overlay .*/, ""),
	            size: this.baseTokens[this.baseTokenPos] - n}
	  };

	  Context.prototype.nextLine = function () {
	    this.line++;
	    if (this.maxLookAhead > 0) { this.maxLookAhead--; }
	  };

	  Context.fromSaved = function (doc, saved, line) {
	    if (saved instanceof SavedContext)
	      { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
	    else
	      { return new Context(doc, copyState(doc.mode, saved), line) }
	  };

	  Context.prototype.save = function (copy) {
	    var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
	    return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
	  };


	  // Compute a style array (an array starting with a mode generation
	  // -- for invalidation -- followed by pairs of end positions and
	  // style strings), which is used to highlight the tokens on the
	  // line.
	  function highlightLine(cm, line, context, forceToEnd) {
	    // A styles array always starts with a number identifying the
	    // mode/overlays that it is based on (for easy invalidation).
	    var st = [cm.state.modeGen], lineClasses = {};
	    // Compute the base array of styles
	    runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
	            lineClasses, forceToEnd);
	    var state = context.state;

	    // Run overlays, adjust style array.
	    var loop = function ( o ) {
	      context.baseTokens = st;
	      var overlay = cm.state.overlays[o], i = 1, at = 0;
	      context.state = true;
	      runMode(cm, line.text, overlay.mode, context, function (end, style) {
	        var start = i;
	        // Ensure there's a token end at the current position, and that i points at it
	        while (at < end) {
	          var i_end = st[i];
	          if (i_end > end)
	            { st.splice(i, 1, end, st[i+1], i_end); }
	          i += 2;
	          at = Math.min(end, i_end);
	        }
	        if (!style) { return }
	        if (overlay.opaque) {
	          st.splice(start, i - start, end, "overlay " + style);
	          i = start + 2;
	        } else {
	          for (; start < i; start += 2) {
	            var cur = st[start+1];
	            st[start+1] = (cur ? cur + " " : "") + "overlay " + style;
	          }
	        }
	      }, lineClasses);
	      context.state = state;
	      context.baseTokens = null;
	      context.baseTokenPos = 1;
	    };

	    for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

	    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
	  }

	  function getLineStyles(cm, line, updateFrontier) {
	    if (!line.styles || line.styles[0] != cm.state.modeGen) {
	      var context = getContextBefore(cm, lineNo(line));
	      var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
	      var result = highlightLine(cm, line, context);
	      if (resetState) { context.state = resetState; }
	      line.stateAfter = context.save(!resetState);
	      line.styles = result.styles;
	      if (result.classes) { line.styleClasses = result.classes; }
	      else if (line.styleClasses) { line.styleClasses = null; }
	      if (updateFrontier === cm.doc.highlightFrontier)
	        { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier); }
	    }
	    return line.styles
	  }

	  function getContextBefore(cm, n, precise) {
	    var doc = cm.doc, display = cm.display;
	    if (!doc.mode.startState) { return new Context(doc, true, n) }
	    var start = findStartLine(cm, n, precise);
	    var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
	    var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

	    doc.iter(start, n, function (line) {
	      processLine(cm, line.text, context);
	      var pos = context.line;
	      line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
	      context.nextLine();
	    });
	    if (precise) { doc.modeFrontier = context.line; }
	    return context
	  }

	  // Lightweight form of highlight -- proceed over this line and
	  // update state, but don't save a style array. Used for lines that
	  // aren't currently visible.
	  function processLine(cm, text, context, startAt) {
	    var mode = cm.doc.mode;
	    var stream = new StringStream(text, cm.options.tabSize, context);
	    stream.start = stream.pos = startAt || 0;
	    if (text == "") { callBlankLine(mode, context.state); }
	    while (!stream.eol()) {
	      readToken(mode, stream, context.state);
	      stream.start = stream.pos;
	    }
	  }

	  function callBlankLine(mode, state) {
	    if (mode.blankLine) { return mode.blankLine(state) }
	    if (!mode.innerMode) { return }
	    var inner = innerMode(mode, state);
	    if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
	  }

	  function readToken(mode, stream, state, inner) {
	    for (var i = 0; i < 10; i++) {
	      if (inner) { inner[0] = innerMode(mode, state).mode; }
	      var style = mode.token(stream, state);
	      if (stream.pos > stream.start) { return style }
	    }
	    throw new Error("Mode " + mode.name + " failed to advance stream.")
	  }

	  var Token = function(stream, type, state) {
	    this.start = stream.start; this.end = stream.pos;
	    this.string = stream.current();
	    this.type = type || null;
	    this.state = state;
	  };

	  // Utility for getTokenAt and getLineTokens
	  function takeToken(cm, pos, precise, asArray) {
	    var doc = cm.doc, mode = doc.mode, style;
	    pos = clipPos(doc, pos);
	    var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise);
	    var stream = new StringStream(line.text, cm.options.tabSize, context), tokens;
	    if (asArray) { tokens = []; }
	    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
	      stream.start = stream.pos;
	      style = readToken(mode, stream, context.state);
	      if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))); }
	    }
	    return asArray ? tokens : new Token(stream, style, context.state)
	  }

	  function extractLineClasses(type, output) {
	    if (type) { for (;;) {
	      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
	      if (!lineClass) { break }
	      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
	      var prop = lineClass[1] ? "bgClass" : "textClass";
	      if (output[prop] == null)
	        { output[prop] = lineClass[2]; }
	      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
	        { output[prop] += " " + lineClass[2]; }
	    } }
	    return type
	  }

	  // Run the given mode's parser over a line, calling f for each token.
	  function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
	    var flattenSpans = mode.flattenSpans;
	    if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans; }
	    var curStart = 0, curStyle = null;
	    var stream = new StringStream(text, cm.options.tabSize, context), style;
	    var inner = cm.options.addModeClass && [null];
	    if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses); }
	    while (!stream.eol()) {
	      if (stream.pos > cm.options.maxHighlightLength) {
	        flattenSpans = false;
	        if (forceToEnd) { processLine(cm, text, context, stream.pos); }
	        stream.pos = text.length;
	        style = null;
	      } else {
	        style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
	      }
	      if (inner) {
	        var mName = inner[0].name;
	        if (mName) { style = "m-" + (style ? mName + " " + style : mName); }
	      }
	      if (!flattenSpans || curStyle != style) {
	        while (curStart < stream.start) {
	          curStart = Math.min(stream.start, curStart + 5000);
	          f(curStart, curStyle);
	        }
	        curStyle = style;
	      }
	      stream.start = stream.pos;
	    }
	    while (curStart < stream.pos) {
	      // Webkit seems to refuse to render text nodes longer than 57444
	      // characters, and returns inaccurate measurements in nodes
	      // starting around 5000 chars.
	      var pos = Math.min(stream.pos, curStart + 5000);
	      f(pos, curStyle);
	      curStart = pos;
	    }
	  }

	  // Finds the line to start with when starting a parse. Tries to
	  // find a line with a stateAfter, so that it can start with a
	  // valid state. If that fails, it returns the line with the
	  // smallest indentation, which tends to need the least context to
	  // parse correctly.
	  function findStartLine(cm, n, precise) {
	    var minindent, minline, doc = cm.doc;
	    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
	    for (var search = n; search > lim; --search) {
	      if (search <= doc.first) { return doc.first }
	      var line = getLine(doc, search - 1), after = line.stateAfter;
	      if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
	        { return search }
	      var indented = countColumn(line.text, null, cm.options.tabSize);
	      if (minline == null || minindent > indented) {
	        minline = search - 1;
	        minindent = indented;
	      }
	    }
	    return minline
	  }

	  function retreatFrontier(doc, n) {
	    doc.modeFrontier = Math.min(doc.modeFrontier, n);
	    if (doc.highlightFrontier < n - 10) { return }
	    var start = doc.first;
	    for (var line = n - 1; line > start; line--) {
	      var saved = getLine(doc, line).stateAfter;
	      // change is on 3
	      // state on line 1 looked ahead 2 -- so saw 3
	      // test 1 + 2 < 3 should cover this
	      if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
	        start = line + 1;
	        break
	      }
	    }
	    doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
	  }

	  // LINE DATA STRUCTURE

	  // Line objects. These hold state related to a line, including
	  // highlighting info (the styles array).
	  var Line = function(text, markedSpans, estimateHeight) {
	    this.text = text;
	    attachMarkedSpans(this, markedSpans);
	    this.height = estimateHeight ? estimateHeight(this) : 1;
	  };

	  Line.prototype.lineNo = function () { return lineNo(this) };
	  eventMixin(Line);

	  // Change the content (text, markers) of a line. Automatically
	  // invalidates cached information and tries to re-estimate the
	  // line's height.
	  function updateLine(line, text, markedSpans, estimateHeight) {
	    line.text = text;
	    if (line.stateAfter) { line.stateAfter = null; }
	    if (line.styles) { line.styles = null; }
	    if (line.order != null) { line.order = null; }
	    detachMarkedSpans(line);
	    attachMarkedSpans(line, markedSpans);
	    var estHeight = estimateHeight ? estimateHeight(line) : 1;
	    if (estHeight != line.height) { updateLineHeight(line, estHeight); }
	  }

	  // Detach a line from the document tree and its markers.
	  function cleanUpLine(line) {
	    line.parent = null;
	    detachMarkedSpans(line);
	  }

	  // Convert a style as returned by a mode (either null, or a string
	  // containing one or more styles) to a CSS style. This is cached,
	  // and also looks for line-wide styles.
	  var styleToClassCache = {}, styleToClassCacheWithMode = {};
	  function interpretTokenStyle(style, options) {
	    if (!style || /^\s*$/.test(style)) { return null }
	    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
	    return cache[style] ||
	      (cache[style] = style.replace(/\S+/g, "cm-$&"))
	  }

	  // Render the DOM representation of the text of a line. Also builds
	  // up a 'line map', which points at the DOM nodes that represent
	  // specific stretches of text, and is used by the measuring code.
	  // The returned object contains the DOM node, this map, and
	  // information about line-wide styles that were set by the mode.
	  function buildLineContent(cm, lineView) {
	    // The padding-right forces the element to have a 'border', which
	    // is needed on Webkit to be able to get line-level bounding
	    // rectangles for it (in measureChar).
	    var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
	    var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
	                   col: 0, pos: 0, cm: cm,
	                   trailingSpace: false,
	                   splitSpaces: cm.getOption("lineWrapping")};
	    lineView.measure = {};

	    // Iterate over the logical lines that make up this visual line.
	    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
	      var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0);
	      builder.pos = 0;
	      builder.addToken = buildToken;
	      // Optionally wire in some hacks into the token-rendering
	      // algorithm, to deal with browser quirks.
	      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
	        { builder.addToken = buildTokenBadBidi(builder.addToken, order); }
	      builder.map = [];
	      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
	      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
	      if (line.styleClasses) {
	        if (line.styleClasses.bgClass)
	          { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || ""); }
	        if (line.styleClasses.textClass)
	          { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || ""); }
	      }

	      // Ensure at least a single node is present, for measuring.
	      if (builder.map.length == 0)
	        { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))); }

	      // Store the map and a cache object for the current logical line
	      if (i == 0) {
	        lineView.measure.map = builder.map;
	        lineView.measure.cache = {};
	      } else {
	  (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
	        ;(lineView.measure.caches || (lineView.measure.caches = [])).push({});
	      }
	    }

	    // See issue #2901
	    if (webkit) {
	      var last = builder.content.lastChild;
	      if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
	        { builder.content.className = "cm-tab-wrap-hack"; }
	    }

	    signal(cm, "renderLine", cm, lineView.line, builder.pre);
	    if (builder.pre.className)
	      { builder.textClass = joinClasses(builder.pre.className, builder.textClass || ""); }

	    return builder
	  }

	  function defaultSpecialCharPlaceholder(ch) {
	    var token = elt("span", "\u2022", "cm-invalidchar");
	    token.title = "\\u" + ch.charCodeAt(0).toString(16);
	    token.setAttribute("aria-label", token.title);
	    return token
	  }

	  // Build up the DOM representation for a single token, and add it to
	  // the line map. Takes care to render special characters separately.
	  function buildToken(builder, text, style, startStyle, endStyle, css, attributes) {
	    if (!text) { return }
	    var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
	    var special = builder.cm.state.specialChars, mustWrap = false;
	    var content;
	    if (!special.test(text)) {
	      builder.col += text.length;
	      content = document.createTextNode(displayText);
	      builder.map.push(builder.pos, builder.pos + text.length, content);
	      if (ie && ie_version < 9) { mustWrap = true; }
	      builder.pos += text.length;
	    } else {
	      content = document.createDocumentFragment();
	      var pos = 0;
	      while (true) {
	        special.lastIndex = pos;
	        var m = special.exec(text);
	        var skipped = m ? m.index - pos : text.length - pos;
	        if (skipped) {
	          var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
	          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])); }
	          else { content.appendChild(txt); }
	          builder.map.push(builder.pos, builder.pos + skipped, txt);
	          builder.col += skipped;
	          builder.pos += skipped;
	        }
	        if (!m) { break }
	        pos += skipped + 1;
	        var txt$1 = (void 0);
	        if (m[0] == "\t") {
	          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
	          txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
	          txt$1.setAttribute("role", "presentation");
	          txt$1.setAttribute("cm-text", "\t");
	          builder.col += tabWidth;
	        } else if (m[0] == "\r" || m[0] == "\n") {
	          txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"));
	          txt$1.setAttribute("cm-text", m[0]);
	          builder.col += 1;
	        } else {
	          txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
	          txt$1.setAttribute("cm-text", m[0]);
	          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])); }
	          else { content.appendChild(txt$1); }
	          builder.col += 1;
	        }
	        builder.map.push(builder.pos, builder.pos + 1, txt$1);
	        builder.pos++;
	      }
	    }
	    builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
	    if (style || startStyle || endStyle || mustWrap || css) {
	      var fullStyle = style || "";
	      if (startStyle) { fullStyle += startStyle; }
	      if (endStyle) { fullStyle += endStyle; }
	      var token = elt("span", [content], fullStyle, css);
	      if (attributes) {
	        for (var attr in attributes) { if (attributes.hasOwnProperty(attr) && attr != "style" && attr != "class")
	          { token.setAttribute(attr, attributes[attr]); } }
	      }
	      return builder.content.appendChild(token)
	    }
	    builder.content.appendChild(content);
	  }

	  // Change some spaces to NBSP to prevent the browser from collapsing
	  // trailing spaces at the end of a line when rendering text (issue #1362).
	  function splitSpaces(text, trailingBefore) {
	    if (text.length > 1 && !/  /.test(text)) { return text }
	    var spaceBefore = trailingBefore, result = "";
	    for (var i = 0; i < text.length; i++) {
	      var ch = text.charAt(i);
	      if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
	        { ch = "\u00a0"; }
	      result += ch;
	      spaceBefore = ch == " ";
	    }
	    return result
	  }

	  // Work around nonsense dimensions being reported for stretches of
	  // right-to-left text.
	  function buildTokenBadBidi(inner, order) {
	    return function (builder, text, style, startStyle, endStyle, css, attributes) {
	      style = style ? style + " cm-force-border" : "cm-force-border";
	      var start = builder.pos, end = start + text.length;
	      for (;;) {
	        // Find the part that overlaps with the start of this text
	        var part = (void 0);
	        for (var i = 0; i < order.length; i++) {
	          part = order[i];
	          if (part.to > start && part.from <= start) { break }
	        }
	        if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, css, attributes) }
	        inner(builder, text.slice(0, part.to - start), style, startStyle, null, css, attributes);
	        startStyle = null;
	        text = text.slice(part.to - start);
	        start = part.to;
	      }
	    }
	  }

	  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
	    var widget = !ignoreWidget && marker.widgetNode;
	    if (widget) { builder.map.push(builder.pos, builder.pos + size, widget); }
	    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
	      if (!widget)
	        { widget = builder.content.appendChild(document.createElement("span")); }
	      widget.setAttribute("cm-marker", marker.id);
	    }
	    if (widget) {
	      builder.cm.display.input.setUneditable(widget);
	      builder.content.appendChild(widget);
	    }
	    builder.pos += size;
	    builder.trailingSpace = false;
	  }

	  // Outputs a number of spans to make up a line, taking highlighting
	  // and marked text into account.
	  function insertLineContent(line, builder, styles) {
	    var spans = line.markedSpans, allText = line.text, at = 0;
	    if (!spans) {
	      for (var i$1 = 1; i$1 < styles.length; i$1+=2)
	        { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)); }
	      return
	    }

	    var len = allText.length, pos = 0, i = 1, text = "", style, css;
	    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, collapsed, attributes;
	    for (;;) {
	      if (nextChange == pos) { // Update current marker set
	        spanStyle = spanEndStyle = spanStartStyle = css = "";
	        attributes = null;
	        collapsed = null; nextChange = Infinity;
	        var foundBookmarks = [], endStyles = (void 0);
	        for (var j = 0; j < spans.length; ++j) {
	          var sp = spans[j], m = sp.marker;
	          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
	            foundBookmarks.push(m);
	          } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
	            if (sp.to != null && sp.to != pos && nextChange > sp.to) {
	              nextChange = sp.to;
	              spanEndStyle = "";
	            }
	            if (m.className) { spanStyle += " " + m.className; }
	            if (m.css) { css = (css ? css + ";" : "") + m.css; }
	            if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle; }
	            if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to); }
	            // support for the old title property
	            // https://github.com/codemirror/CodeMirror/pull/5673
	            if (m.title) { (attributes || (attributes = {})).title = m.title; }
	            if (m.attributes) {
	              for (var attr in m.attributes)
	                { (attributes || (attributes = {}))[attr] = m.attributes[attr]; }
	            }
	            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
	              { collapsed = sp; }
	          } else if (sp.from > pos && nextChange > sp.from) {
	            nextChange = sp.from;
	          }
	        }
	        if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
	          { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1]; } } }

	        if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
	          { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]); } }
	        if (collapsed && (collapsed.from || 0) == pos) {
	          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
	                             collapsed.marker, collapsed.from == null);
	          if (collapsed.to == null) { return }
	          if (collapsed.to == pos) { collapsed = false; }
	        }
	      }
	      if (pos >= len) { break }

	      var upto = Math.min(len, nextChange);
	      while (true) {
	        if (text) {
	          var end = pos + text.length;
	          if (!collapsed) {
	            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
	            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
	                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", css, attributes);
	          }
	          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
	          pos = end;
	          spanStartStyle = "";
	        }
	        text = allText.slice(at, at = styles[i++]);
	        style = interpretTokenStyle(styles[i++], builder.cm.options);
	      }
	    }
	  }


	  // These objects are used to represent the visible (currently drawn)
	  // part of the document. A LineView may correspond to multiple
	  // logical lines, if those are connected by collapsed ranges.
	  function LineView(doc, line, lineN) {
	    // The starting line
	    this.line = line;
	    // Continuing lines, if any
	    this.rest = visualLineContinued(line);
	    // Number of logical lines in this visual line
	    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
	    this.node = this.text = null;
	    this.hidden = lineIsHidden(doc, line);
	  }

	  // Create a range of LineView objects for the given lines.
	  function buildViewArray(cm, from, to) {
	    var array = [], nextPos;
	    for (var pos = from; pos < to; pos = nextPos) {
	      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
	      nextPos = pos + view.size;
	      array.push(view);
	    }
	    return array
	  }

	  var operationGroup = null;

	  function pushOperation(op) {
	    if (operationGroup) {
	      operationGroup.ops.push(op);
	    } else {
	      op.ownsGroup = operationGroup = {
	        ops: [op],
	        delayedCallbacks: []
	      };
	    }
	  }

	  function fireCallbacksForOps(group) {
	    // Calls delayed callbacks and cursorActivity handlers until no
	    // new ones appear
	    var callbacks = group.delayedCallbacks, i = 0;
	    do {
	      for (; i < callbacks.length; i++)
	        { callbacks[i].call(null); }
	      for (var j = 0; j < group.ops.length; j++) {
	        var op = group.ops[j];
	        if (op.cursorActivityHandlers)
	          { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
	            { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm); } }
	      }
	    } while (i < callbacks.length)
	  }

	  function finishOperation(op, endCb) {
	    var group = op.ownsGroup;
	    if (!group) { return }

	    try { fireCallbacksForOps(group); }
	    finally {
	      operationGroup = null;
	      endCb(group);
	    }
	  }

	  var orphanDelayedCallbacks = null;

	  // Often, we want to signal events at a point where we are in the
	  // middle of some work, but don't want the handler to start calling
	  // other methods on the editor, which might be in an inconsistent
	  // state or simply not expect any other events to happen.
	  // signalLater looks whether there are any handlers, and schedules
	  // them to be executed when the last operation ends, or, if no
	  // operation is active, when a timeout fires.
	  function signalLater(emitter, type /*, values...*/) {
	    var arr = getHandlers(emitter, type);
	    if (!arr.length) { return }
	    var args = Array.prototype.slice.call(arguments, 2), list;
	    if (operationGroup) {
	      list = operationGroup.delayedCallbacks;
	    } else if (orphanDelayedCallbacks) {
	      list = orphanDelayedCallbacks;
	    } else {
	      list = orphanDelayedCallbacks = [];
	      setTimeout(fireOrphanDelayed, 0);
	    }
	    var loop = function ( i ) {
	      list.push(function () { return arr[i].apply(null, args); });
	    };

	    for (var i = 0; i < arr.length; ++i)
	      loop( i );
	  }

	  function fireOrphanDelayed() {
	    var delayed = orphanDelayedCallbacks;
	    orphanDelayedCallbacks = null;
	    for (var i = 0; i < delayed.length; ++i) { delayed[i](); }
	  }

	  // When an aspect of a line changes, a string is added to
	  // lineView.changes. This updates the relevant part of the line's
	  // DOM structure.
	  function updateLineForChanges(cm, lineView, lineN, dims) {
	    for (var j = 0; j < lineView.changes.length; j++) {
	      var type = lineView.changes[j];
	      if (type == "text") { updateLineText(cm, lineView); }
	      else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims); }
	      else if (type == "class") { updateLineClasses(cm, lineView); }
	      else if (type == "widget") { updateLineWidgets(cm, lineView, dims); }
	    }
	    lineView.changes = null;
	  }

	  // Lines with gutter elements, widgets or a background class need to
	  // be wrapped, and have the extra elements added to the wrapper div
	  function ensureLineWrapped(lineView) {
	    if (lineView.node == lineView.text) {
	      lineView.node = elt("div", null, null, "position: relative");
	      if (lineView.text.parentNode)
	        { lineView.text.parentNode.replaceChild(lineView.node, lineView.text); }
	      lineView.node.appendChild(lineView.text);
	      if (ie && ie_version < 8) { lineView.node.style.zIndex = 2; }
	    }
	    return lineView.node
	  }

	  function updateLineBackground(cm, lineView) {
	    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
	    if (cls) { cls += " CodeMirror-linebackground"; }
	    if (lineView.background) {
	      if (cls) { lineView.background.className = cls; }
	      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
	    } else if (cls) {
	      var wrap = ensureLineWrapped(lineView);
	      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
	      cm.display.input.setUneditable(lineView.background);
	    }
	  }

	  // Wrapper around buildLineContent which will reuse the structure
	  // in display.externalMeasured when possible.
	  function getLineContent(cm, lineView) {
	    var ext = cm.display.externalMeasured;
	    if (ext && ext.line == lineView.line) {
	      cm.display.externalMeasured = null;
	      lineView.measure = ext.measure;
	      return ext.built
	    }
	    return buildLineContent(cm, lineView)
	  }

	  // Redraw the line's text. Interacts with the background and text
	  // classes because the mode may output tokens that influence these
	  // classes.
	  function updateLineText(cm, lineView) {
	    var cls = lineView.text.className;
	    var built = getLineContent(cm, lineView);
	    if (lineView.text == lineView.node) { lineView.node = built.pre; }
	    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
	    lineView.text = built.pre;
	    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
	      lineView.bgClass = built.bgClass;
	      lineView.textClass = built.textClass;
	      updateLineClasses(cm, lineView);
	    } else if (cls) {
	      lineView.text.className = cls;
	    }
	  }

	  function updateLineClasses(cm, lineView) {
	    updateLineBackground(cm, lineView);
	    if (lineView.line.wrapClass)
	      { ensureLineWrapped(lineView).className = lineView.line.wrapClass; }
	    else if (lineView.node != lineView.text)
	      { lineView.node.className = ""; }
	    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
	    lineView.text.className = textClass || "";
	  }

	  function updateLineGutter(cm, lineView, lineN, dims) {
	    if (lineView.gutter) {
	      lineView.node.removeChild(lineView.gutter);
	      lineView.gutter = null;
	    }
	    if (lineView.gutterBackground) {
	      lineView.node.removeChild(lineView.gutterBackground);
	      lineView.gutterBackground = null;
	    }
	    if (lineView.line.gutterClass) {
	      var wrap = ensureLineWrapped(lineView);
	      lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
	                                      ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"));
	      cm.display.input.setUneditable(lineView.gutterBackground);
	      wrap.insertBefore(lineView.gutterBackground, lineView.text);
	    }
	    var markers = lineView.line.gutterMarkers;
	    if (cm.options.lineNumbers || markers) {
	      var wrap$1 = ensureLineWrapped(lineView);
	      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"));
	      cm.display.input.setUneditable(gutterWrap);
	      wrap$1.insertBefore(gutterWrap, lineView.text);
	      if (lineView.line.gutterClass)
	        { gutterWrap.className += " " + lineView.line.gutterClass; }
	      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
	        { lineView.lineNumber = gutterWrap.appendChild(
	          elt("div", lineNumberFor(cm.options, lineN),
	              "CodeMirror-linenumber CodeMirror-gutter-elt",
	              ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))); }
	      if (markers) { for (var k = 0; k < cm.options.gutters.length; ++k) {
	        var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
	        if (found)
	          { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
	                                     ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))); }
	      } }
	    }
	  }

	  function updateLineWidgets(cm, lineView, dims) {
	    if (lineView.alignable) { lineView.alignable = null; }
	    for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
	      next = node.nextSibling;
	      if (node.className == "CodeMirror-linewidget")
	        { lineView.node.removeChild(node); }
	    }
	    insertLineWidgets(cm, lineView, dims);
	  }

	  // Build a line's DOM representation from scratch
	  function buildLineElement(cm, lineView, lineN, dims) {
	    var built = getLineContent(cm, lineView);
	    lineView.text = lineView.node = built.pre;
	    if (built.bgClass) { lineView.bgClass = built.bgClass; }
	    if (built.textClass) { lineView.textClass = built.textClass; }

	    updateLineClasses(cm, lineView);
	    updateLineGutter(cm, lineView, lineN, dims);
	    insertLineWidgets(cm, lineView, dims);
	    return lineView.node
	  }

	  // A lineView may contain multiple logical lines (when merged by
	  // collapsed spans). The widgets for all of them need to be drawn.
	  function insertLineWidgets(cm, lineView, dims) {
	    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
	    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
	      { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false); } }
	  }

	  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
	    if (!line.widgets) { return }
	    var wrap = ensureLineWrapped(lineView);
	    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
	      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
	      if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true"); }
	      positionLineWidget(widget, node, lineView, dims);
	      cm.display.input.setUneditable(node);
	      if (allowAbove && widget.above)
	        { wrap.insertBefore(node, lineView.gutter || lineView.text); }
	      else
	        { wrap.appendChild(node); }
	      signalLater(widget, "redraw");
	    }
	  }

	  function positionLineWidget(widget, node, lineView, dims) {
	    if (widget.noHScroll) {
	  (lineView.alignable || (lineView.alignable = [])).push(node);
	      var width = dims.wrapperWidth;
	      node.style.left = dims.fixedPos + "px";
	      if (!widget.coverGutter) {
	        width -= dims.gutterTotalWidth;
	        node.style.paddingLeft = dims.gutterTotalWidth + "px";
	      }
	      node.style.width = width + "px";
	    }
	    if (widget.coverGutter) {
	      node.style.zIndex = 5;
	      node.style.position = "relative";
	      if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px"; }
	    }
	  }

	  function widgetHeight(widget) {
	    if (widget.height != null) { return widget.height }
	    var cm = widget.doc.cm;
	    if (!cm) { return 0 }
	    if (!contains(document.body, widget.node)) {
	      var parentStyle = "position: relative;";
	      if (widget.coverGutter)
	        { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;"; }
	      if (widget.noHScroll)
	        { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;"; }
	      removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
	    }
	    return widget.height = widget.node.parentNode.offsetHeight
	  }

	  // Return true when the given mouse event happened in a widget
	  function eventInWidget(display, e) {
	    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
	      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
	          (n.parentNode == display.sizer && n != display.mover))
	        { return true }
	    }
	  }

	  // POSITION MEASUREMENT

	  function paddingTop(display) {return display.lineSpace.offsetTop}
	  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
	  function paddingH(display) {
	    if (display.cachedPaddingH) { return display.cachedPaddingH }
	    var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
	    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
	    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
	    if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data; }
	    return data
	  }

	  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
	  function displayWidth(cm) {
	    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
	  }
	  function displayHeight(cm) {
	    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
	  }

	  // Ensure the lineView.wrapping.heights array is populated. This is
	  // an array of bottom offsets for the lines that make up a drawn
	  // line. When lineWrapping is on, there might be more than one
	  // height.
	  function ensureLineHeights(cm, lineView, rect) {
	    var wrapping = cm.options.lineWrapping;
	    var curWidth = wrapping && displayWidth(cm);
	    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
	      var heights = lineView.measure.heights = [];
	      if (wrapping) {
	        lineView.measure.width = curWidth;
	        var rects = lineView.text.firstChild.getClientRects();
	        for (var i = 0; i < rects.length - 1; i++) {
	          var cur = rects[i], next = rects[i + 1];
	          if (Math.abs(cur.bottom - next.bottom) > 2)
	            { heights.push((cur.bottom + next.top) / 2 - rect.top); }
	        }
	      }
	      heights.push(rect.bottom - rect.top);
	    }
	  }

	  // Find a line map (mapping character offsets to text nodes) and a
	  // measurement cache for the given line number. (A line view might
	  // contain multiple lines when collapsed ranges are present.)
	  function mapFromLineView(lineView, line, lineN) {
	    if (lineView.line == line)
	      { return {map: lineView.measure.map, cache: lineView.measure.cache} }
	    for (var i = 0; i < lineView.rest.length; i++)
	      { if (lineView.rest[i] == line)
	        { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
	    for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
	      { if (lineNo(lineView.rest[i$1]) > lineN)
	        { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
	  }

	  // Render a line into the hidden node display.externalMeasured. Used
	  // when measurement is needed for a line that's not in the viewport.
	  function updateExternalMeasurement(cm, line) {
	    line = visualLine(line);
	    var lineN = lineNo(line);
	    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
	    view.lineN = lineN;
	    var built = view.built = buildLineContent(cm, view);
	    view.text = built.pre;
	    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
	    return view
	  }

	  // Get a {top, bottom, left, right} box (in line-local coordinates)
	  // for a given character.
	  function measureChar(cm, line, ch, bias) {
	    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
	  }

	  // Find a line view that corresponds to the given line number.
	  function findViewForLine(cm, lineN) {
	    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
	      { return cm.display.view[findViewIndex(cm, lineN)] }
	    var ext = cm.display.externalMeasured;
	    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
	      { return ext }
	  }

	  // Measurement can be split in two steps, the set-up work that
	  // applies to the whole line, and the measurement of the actual
	  // character. Functions like coordsChar, that need to do a lot of
	  // measurements in a row, can thus ensure that the set-up work is
	  // only done once.
	  function prepareMeasureForLine(cm, line) {
	    var lineN = lineNo(line);
	    var view = findViewForLine(cm, lineN);
	    if (view && !view.text) {
	      view = null;
	    } else if (view && view.changes) {
	      updateLineForChanges(cm, view, lineN, getDimensions(cm));
	      cm.curOp.forceUpdate = true;
	    }
	    if (!view)
	      { view = updateExternalMeasurement(cm, line); }

	    var info = mapFromLineView(view, line, lineN);
	    return {
	      line: line, view: view, rect: null,
	      map: info.map, cache: info.cache, before: info.before,
	      hasHeights: false
	    }
	  }

	  // Given a prepared measurement object, measures the position of an
	  // actual character (or fetches it from the cache).
	  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
	    if (prepared.before) { ch = -1; }
	    var key = ch + (bias || ""), found;
	    if (prepared.cache.hasOwnProperty(key)) {
	      found = prepared.cache[key];
	    } else {
	      if (!prepared.rect)
	        { prepared.rect = prepared.view.text.getBoundingClientRect(); }
	      if (!prepared.hasHeights) {
	        ensureLineHeights(cm, prepared.view, prepared.rect);
	        prepared.hasHeights = true;
	      }
	      found = measureCharInner(cm, prepared, ch, bias);
	      if (!found.bogus) { prepared.cache[key] = found; }
	    }
	    return {left: found.left, right: found.right,
	            top: varHeight ? found.rtop : found.top,
	            bottom: varHeight ? found.rbottom : found.bottom}
	  }

	  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

	  function nodeAndOffsetInLineMap(map$$1, ch, bias) {
	    var node, start, end, collapse, mStart, mEnd;
	    // First, search the line map for the text node corresponding to,
	    // or closest to, the target character.
	    for (var i = 0; i < map$$1.length; i += 3) {
	      mStart = map$$1[i];
	      mEnd = map$$1[i + 1];
	      if (ch < mStart) {
	        start = 0; end = 1;
	        collapse = "left";
	      } else if (ch < mEnd) {
	        start = ch - mStart;
	        end = start + 1;
	      } else if (i == map$$1.length - 3 || ch == mEnd && map$$1[i + 3] > ch) {
	        end = mEnd - mStart;
	        start = end - 1;
	        if (ch >= mEnd) { collapse = "right"; }
	      }
	      if (start != null) {
	        node = map$$1[i + 2];
	        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
	          { collapse = bias; }
	        if (bias == "left" && start == 0)
	          { while (i && map$$1[i - 2] == map$$1[i - 3] && map$$1[i - 1].insertLeft) {
	            node = map$$1[(i -= 3) + 2];
	            collapse = "left";
	          } }
	        if (bias == "right" && start == mEnd - mStart)
	          { while (i < map$$1.length - 3 && map$$1[i + 3] == map$$1[i + 4] && !map$$1[i + 5].insertLeft) {
	            node = map$$1[(i += 3) + 2];
	            collapse = "right";
	          } }
	        break
	      }
	    }
	    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
	  }

	  function getUsefulRect(rects, bias) {
	    var rect = nullRect;
	    if (bias == "left") { for (var i = 0; i < rects.length; i++) {
	      if ((rect = rects[i]).left != rect.right) { break }
	    } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
	      if ((rect = rects[i$1]).left != rect.right) { break }
	    } }
	    return rect
	  }

	  function measureCharInner(cm, prepared, ch, bias) {
	    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
	    var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

	    var rect;
	    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
	      for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
	        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start; }
	        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end; }
	        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
	          { rect = node.parentNode.getBoundingClientRect(); }
	        else
	          { rect = getUsefulRect(range(node, start, end).getClientRects(), bias); }
	        if (rect.left || rect.right || start == 0) { break }
	        end = start;
	        start = start - 1;
	        collapse = "right";
	      }
	      if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect); }
	    } else { // If it is a widget, simply get the box for the whole widget.
	      if (start > 0) { collapse = bias = "right"; }
	      var rects;
	      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
	        { rect = rects[bias == "right" ? rects.length - 1 : 0]; }
	      else
	        { rect = node.getBoundingClientRect(); }
	    }
	    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
	      var rSpan = node.parentNode.getClientRects()[0];
	      if (rSpan)
	        { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom}; }
	      else
	        { rect = nullRect; }
	    }

	    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
	    var mid = (rtop + rbot) / 2;
	    var heights = prepared.view.measure.heights;
	    var i = 0;
	    for (; i < heights.length - 1; i++)
	      { if (mid < heights[i]) { break } }
	    var top = i ? heights[i - 1] : 0, bot = heights[i];
	    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
	                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
	                  top: top, bottom: bot};
	    if (!rect.left && !rect.right) { result.bogus = true; }
	    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

	    return result
	  }

	  // Work around problem with bounding client rects on ranges being
	  // returned incorrectly when zoomed on IE10 and below.
	  function maybeUpdateRectForZooming(measure, rect) {
	    if (!window.screen || screen.logicalXDPI == null ||
	        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
	      { return rect }
	    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
	    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
	    return {left: rect.left * scaleX, right: rect.right * scaleX,
	            top: rect.top * scaleY, bottom: rect.bottom * scaleY}
	  }

	  function clearLineMeasurementCacheFor(lineView) {
	    if (lineView.measure) {
	      lineView.measure.cache = {};
	      lineView.measure.heights = null;
	      if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
	        { lineView.measure.caches[i] = {}; } }
	    }
	  }

	  function clearLineMeasurementCache(cm) {
	    cm.display.externalMeasure = null;
	    removeChildren(cm.display.lineMeasure);
	    for (var i = 0; i < cm.display.view.length; i++)
	      { clearLineMeasurementCacheFor(cm.display.view[i]); }
	  }

	  function clearCaches(cm) {
	    clearLineMeasurementCache(cm);
	    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
	    if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true; }
	    cm.display.lineNumChars = null;
	  }

	  function pageScrollX() {
	    // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
	    // which causes page_Offset and bounding client rects to use
	    // different reference viewports and invalidate our calculations.
	    if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
	    return window.pageXOffset || (document.documentElement || document.body).scrollLeft
	  }
	  function pageScrollY() {
	    if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
	    return window.pageYOffset || (document.documentElement || document.body).scrollTop
	  }

	  function widgetTopHeight(lineObj) {
	    var height = 0;
	    if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
	      { height += widgetHeight(lineObj.widgets[i]); } } }
	    return height
	  }

	  // Converts a {top, bottom, left, right} box from line-local
	  // coordinates into another coordinate system. Context may be one of
	  // "line", "div" (display.lineDiv), "local"./null (editor), "window",
	  // or "page".
	  function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
	    if (!includeWidgets) {
	      var height = widgetTopHeight(lineObj);
	      rect.top += height; rect.bottom += height;
	    }
	    if (context == "line") { return rect }
	    if (!context) { context = "local"; }
	    var yOff = heightAtLine(lineObj);
	    if (context == "local") { yOff += paddingTop(cm.display); }
	    else { yOff -= cm.display.viewOffset; }
	    if (context == "page" || context == "window") {
	      var lOff = cm.display.lineSpace.getBoundingClientRect();
	      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
	      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
	      rect.left += xOff; rect.right += xOff;
	    }
	    rect.top += yOff; rect.bottom += yOff;
	    return rect
	  }

	  // Coverts a box from "div" coords to another coordinate system.
	  // Context may be "window", "page", "div", or "local"./null.
	  function fromCoordSystem(cm, coords, context) {
	    if (context == "div") { return coords }
	    var left = coords.left, top = coords.top;
	    // First move into "page" coordinate system
	    if (context == "page") {
	      left -= pageScrollX();
	      top -= pageScrollY();
	    } else if (context == "local" || !context) {
	      var localBox = cm.display.sizer.getBoundingClientRect();
	      left += localBox.left;
	      top += localBox.top;
	    }

	    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
	    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
	  }

	  function charCoords(cm, pos, context, lineObj, bias) {
	    if (!lineObj) { lineObj = getLine(cm.doc, pos.line); }
	    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
	  }

	  // Returns a box for a given cursor position, which may have an
	  // 'other' property containing the position of the secondary cursor
	  // on a bidi boundary.
	  // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
	  // and after `char - 1` in writing order of `char - 1`
	  // A cursor Pos(line, char, "after") is on the same visual line as `char`
	  // and before `char` in writing order of `char`
	  // Examples (upper-case letters are RTL, lower-case are LTR):
	  //     Pos(0, 1, ...)
	  //     before   after
	  // ab     a|b     a|b
	  // aB     a|B     aB|
	  // Ab     |Ab     A|b
	  // AB     B|A     B|A
	  // Every position after the last character on a line is considered to stick
	  // to the last character on the line.
	  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
	    lineObj = lineObj || getLine(cm.doc, pos.line);
	    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
	    function get(ch, right) {
	      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
	      if (right) { m.left = m.right; } else { m.right = m.left; }
	      return intoCoordSystem(cm, lineObj, m, context)
	    }
	    var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky;
	    if (ch >= lineObj.text.length) {
	      ch = lineObj.text.length;
	      sticky = "before";
	    } else if (ch <= 0) {
	      ch = 0;
	      sticky = "after";
	    }
	    if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

	    function getBidi(ch, partPos, invert) {
	      var part = order[partPos], right = part.level == 1;
	      return get(invert ? ch - 1 : ch, right != invert)
	    }
	    var partPos = getBidiPartAt(order, ch, sticky);
	    var other = bidiOther;
	    var val = getBidi(ch, partPos, sticky == "before");
	    if (other != null) { val.other = getBidi(ch, other, sticky != "before"); }
	    return val
	  }

	  // Used to cheaply estimate the coordinates for a position. Used for
	  // intermediate scroll updates.
	  function estimateCoords(cm, pos) {
	    var left = 0;
	    pos = clipPos(cm.doc, pos);
	    if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch; }
	    var lineObj = getLine(cm.doc, pos.line);
	    var top = heightAtLine(lineObj) + paddingTop(cm.display);
	    return {left: left, right: left, top: top, bottom: top + lineObj.height}
	  }

	  // Positions returned by coordsChar contain some extra information.
	  // xRel is the relative x position of the input coordinates compared
	  // to the found position (so xRel > 0 means the coordinates are to
	  // the right of the character position, for example). When outside
	  // is true, that means the coordinates lie outside the line's
	  // vertical range.
	  function PosWithInfo(line, ch, sticky, outside, xRel) {
	    var pos = Pos(line, ch, sticky);
	    pos.xRel = xRel;
	    if (outside) { pos.outside = true; }
	    return pos
	  }

	  // Compute the character position closest to the given coordinates.
	  // Input must be lineSpace-local ("div" coordinate system).
	  function coordsChar(cm, x, y) {
	    var doc = cm.doc;
	    y += cm.display.viewOffset;
	    if (y < 0) { return PosWithInfo(doc.first, 0, null, true, -1) }
	    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
	    if (lineN > last)
	      { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, true, 1) }
	    if (x < 0) { x = 0; }

	    var lineObj = getLine(doc, lineN);
	    for (;;) {
	      var found = coordsCharInner(cm, lineObj, lineN, x, y);
	      var collapsed = collapsedSpanAround(lineObj, found.ch + (found.xRel > 0 ? 1 : 0));
	      if (!collapsed) { return found }
	      var rangeEnd = collapsed.find(1);
	      if (rangeEnd.line == lineN) { return rangeEnd }
	      lineObj = getLine(doc, lineN = rangeEnd.line);
	    }
	  }

	  function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
	    y -= widgetTopHeight(lineObj);
	    var end = lineObj.text.length;
	    var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0);
	    end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end);
	    return {begin: begin, end: end}
	  }

	  function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
	    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
	    var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
	    return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
	  }

	  // Returns true if the given side of a box is after the given
	  // coordinates, in top-to-bottom, left-to-right order.
	  function boxIsAfter(box, x, y, left) {
	    return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
	  }

	  function coordsCharInner(cm, lineObj, lineNo$$1, x, y) {
	    // Move y into line-local coordinate space
	    y -= heightAtLine(lineObj);
	    var preparedMeasure = prepareMeasureForLine(cm, lineObj);
	    // When directly calling `measureCharPrepared`, we have to adjust
	    // for the widgets at this line.
	    var widgetHeight$$1 = widgetTopHeight(lineObj);
	    var begin = 0, end = lineObj.text.length, ltr = true;

	    var order = getOrder(lineObj, cm.doc.direction);
	    // If the line isn't plain left-to-right text, first figure out
	    // which bidi section the coordinates fall into.
	    if (order) {
	      var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
	                   (cm, lineObj, lineNo$$1, preparedMeasure, order, x, y);
	      ltr = part.level != 1;
	      // The awkward -1 offsets are needed because findFirst (called
	      // on these below) will treat its first bound as inclusive,
	      // second as exclusive, but we want to actually address the
	      // characters in the part's range
	      begin = ltr ? part.from : part.to - 1;
	      end = ltr ? part.to : part.from - 1;
	    }

	    // A binary search to find the first character whose bounding box
	    // starts after the coordinates. If we run across any whose box wrap
	    // the coordinates, store that.
	    var chAround = null, boxAround = null;
	    var ch = findFirst(function (ch) {
	      var box = measureCharPrepared(cm, preparedMeasure, ch);
	      box.top += widgetHeight$$1; box.bottom += widgetHeight$$1;
	      if (!boxIsAfter(box, x, y, false)) { return false }
	      if (box.top <= y && box.left <= x) {
	        chAround = ch;
	        boxAround = box;
	      }
	      return true
	    }, begin, end);

	    var baseX, sticky, outside = false;
	    // If a box around the coordinates was found, use that
	    if (boxAround) {
	      // Distinguish coordinates nearer to the left or right side of the box
	      var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr;
	      ch = chAround + (atStart ? 0 : 1);
	      sticky = atStart ? "after" : "before";
	      baseX = atLeft ? boxAround.left : boxAround.right;
	    } else {
	      // (Adjust for extended bound, if necessary.)
	      if (!ltr && (ch == end || ch == begin)) { ch++; }
	      // To determine which side to associate with, get the box to the
	      // left of the character and compare it's vertical position to the
	      // coordinates
	      sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
	        (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight$$1 <= y) == ltr ?
	        "after" : "before";
	      // Now get accurate coordinates for this place, in order to get a
	      // base X position
	      var coords = cursorCoords(cm, Pos(lineNo$$1, ch, sticky), "line", lineObj, preparedMeasure);
	      baseX = coords.left;
	      outside = y < coords.top || y >= coords.bottom;
	    }

	    ch = skipExtendingChars(lineObj.text, ch, 1);
	    return PosWithInfo(lineNo$$1, ch, sticky, outside, x - baseX)
	  }

	  function coordsBidiPart(cm, lineObj, lineNo$$1, preparedMeasure, order, x, y) {
	    // Bidi parts are sorted left-to-right, and in a non-line-wrapping
	    // situation, we can take this ordering to correspond to the visual
	    // ordering. This finds the first part whose end is after the given
	    // coordinates.
	    var index = findFirst(function (i) {
	      var part = order[i], ltr = part.level != 1;
	      return boxIsAfter(cursorCoords(cm, Pos(lineNo$$1, ltr ? part.to : part.from, ltr ? "before" : "after"),
	                                     "line", lineObj, preparedMeasure), x, y, true)
	    }, 0, order.length - 1);
	    var part = order[index];
	    // If this isn't the first part, the part's start is also after
	    // the coordinates, and the coordinates aren't on the same line as
	    // that start, move one part back.
	    if (index > 0) {
	      var ltr = part.level != 1;
	      var start = cursorCoords(cm, Pos(lineNo$$1, ltr ? part.from : part.to, ltr ? "after" : "before"),
	                               "line", lineObj, preparedMeasure);
	      if (boxIsAfter(start, x, y, true) && start.top > y)
	        { part = order[index - 1]; }
	    }
	    return part
	  }

	  function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
	    // In a wrapped line, rtl text on wrapping boundaries can do things
	    // that don't correspond to the ordering in our `order` array at
	    // all, so a binary search doesn't work, and we want to return a
	    // part that only spans one line so that the binary search in
	    // coordsCharInner is safe. As such, we first find the extent of the
	    // wrapped line, and then do a flat search in which we discard any
	    // spans that aren't on the line.
	    var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
	    var begin = ref.begin;
	    var end = ref.end;
	    if (/\s/.test(lineObj.text.charAt(end - 1))) { end--; }
	    var part = null, closestDist = null;
	    for (var i = 0; i < order.length; i++) {
	      var p = order[i];
	      if (p.from >= end || p.to <= begin) { continue }
	      var ltr = p.level != 1;
	      var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
	      // Weigh against spans ending before this, so that they are only
	      // picked if nothing ends after
	      var dist = endX < x ? x - endX + 1e9 : endX - x;
	      if (!part || closestDist > dist) {
	        part = p;
	        closestDist = dist;
	      }
	    }
	    if (!part) { part = order[order.length - 1]; }
	    // Clip the part to the wrapped line.
	    if (part.from < begin) { part = {from: begin, to: part.to, level: part.level}; }
	    if (part.to > end) { part = {from: part.from, to: end, level: part.level}; }
	    return part
	  }

	  var measureText;
	  // Compute the default text height.
	  function textHeight(display) {
	    if (display.cachedTextHeight != null) { return display.cachedTextHeight }
	    if (measureText == null) {
	      measureText = elt("pre");
	      // Measure a bunch of lines, for browsers that compute
	      // fractional heights.
	      for (var i = 0; i < 49; ++i) {
	        measureText.appendChild(document.createTextNode("x"));
	        measureText.appendChild(elt("br"));
	      }
	      measureText.appendChild(document.createTextNode("x"));
	    }
	    removeChildrenAndAdd(display.measure, measureText);
	    var height = measureText.offsetHeight / 50;
	    if (height > 3) { display.cachedTextHeight = height; }
	    removeChildren(display.measure);
	    return height || 1
	  }

	  // Compute the default character width.
	  function charWidth(display) {
	    if (display.cachedCharWidth != null) { return display.cachedCharWidth }
	    var anchor = elt("span", "xxxxxxxxxx");
	    var pre = elt("pre", [anchor]);
	    removeChildrenAndAdd(display.measure, pre);
	    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
	    if (width > 2) { display.cachedCharWidth = width; }
	    return width || 10
	  }

	  // Do a bulk-read of the DOM positions and sizes needed to draw the
	  // view, so that we don't interleave reading and writing to the DOM.
	  function getDimensions(cm) {
	    var d = cm.display, left = {}, width = {};
	    var gutterLeft = d.gutters.clientLeft;
	    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
	      left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
	      width[cm.options.gutters[i]] = n.clientWidth;
	    }
	    return {fixedPos: compensateForHScroll(d),
	            gutterTotalWidth: d.gutters.offsetWidth,
	            gutterLeft: left,
	            gutterWidth: width,
	            wrapperWidth: d.wrapper.clientWidth}
	  }

	  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
	  // but using getBoundingClientRect to get a sub-pixel-accurate
	  // result.
	  function compensateForHScroll(display) {
	    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
	  }

	  // Returns a function that estimates the height of a line, to use as
	  // first approximation until the line becomes visible (and is thus
	  // properly measurable).
	  function estimateHeight(cm) {
	    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
	    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
	    return function (line) {
	      if (lineIsHidden(cm.doc, line)) { return 0 }

	      var widgetsHeight = 0;
	      if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
	        if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height; }
	      } }

	      if (wrapping)
	        { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
	      else
	        { return widgetsHeight + th }
	    }
	  }

	  function estimateLineHeights(cm) {
	    var doc = cm.doc, est = estimateHeight(cm);
	    doc.iter(function (line) {
	      var estHeight = est(line);
	      if (estHeight != line.height) { updateLineHeight(line, estHeight); }
	    });
	  }

	  // Given a mouse event, find the corresponding position. If liberal
	  // is false, it checks whether a gutter or scrollbar was clicked,
	  // and returns null if it was. forRect is used by rectangular
	  // selections, and tries to estimate a character position even for
	  // coordinates beyond the right of the text.
	  function posFromMouse(cm, e, liberal, forRect) {
	    var display = cm.display;
	    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

	    var x, y, space = display.lineSpace.getBoundingClientRect();
	    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
	    try { x = e.clientX - space.left; y = e.clientY - space.top; }
	    catch (e) { return null }
	    var coords = coordsChar(cm, x, y), line;
	    if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
	      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
	      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
	    }
	    return coords
	  }

	  // Find the view element corresponding to a given line. Return null
	  // when the line isn't visible.
	  function findViewIndex(cm, n) {
	    if (n >= cm.display.viewTo) { return null }
	    n -= cm.display.viewFrom;
	    if (n < 0) { return null }
	    var view = cm.display.view;
	    for (var i = 0; i < view.length; i++) {
	      n -= view[i].size;
	      if (n < 0) { return i }
	    }
	  }

	  function updateSelection(cm) {
	    cm.display.input.showSelection(cm.display.input.prepareSelection());
	  }

	  function prepareSelection(cm, primary) {
	    if ( primary === void 0 ) primary = true;

	    var doc = cm.doc, result = {};
	    var curFragment = result.cursors = document.createDocumentFragment();
	    var selFragment = result.selection = document.createDocumentFragment();

	    for (var i = 0; i < doc.sel.ranges.length; i++) {
	      if (!primary && i == doc.sel.primIndex) { continue }
	      var range$$1 = doc.sel.ranges[i];
	      if (range$$1.from().line >= cm.display.viewTo || range$$1.to().line < cm.display.viewFrom) { continue }
	      var collapsed = range$$1.empty();
	      if (collapsed || cm.options.showCursorWhenSelecting)
	        { drawSelectionCursor(cm, range$$1.head, curFragment); }
	      if (!collapsed)
	        { drawSelectionRange(cm, range$$1, selFragment); }
	    }
	    return result
	  }

	  // Draws a cursor for the given range
	  function drawSelectionCursor(cm, head, output) {
	    var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

	    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
	    cursor.style.left = pos.left + "px";
	    cursor.style.top = pos.top + "px";
	    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

	    if (pos.other) {
	      // Secondary cursor, shown when on a 'jump' in bi-directional text
	      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
	      otherCursor.style.display = "";
	      otherCursor.style.left = pos.other.left + "px";
	      otherCursor.style.top = pos.other.top + "px";
	      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
	    }
	  }

	  function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

	  // Draws the given range as a highlighted selection
	  function drawSelectionRange(cm, range$$1, output) {
	    var display = cm.display, doc = cm.doc;
	    var fragment = document.createDocumentFragment();
	    var padding = paddingH(cm.display), leftSide = padding.left;
	    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
	    var docLTR = doc.direction == "ltr";

	    function add(left, top, width, bottom) {
	      if (top < 0) { top = 0; }
	      top = Math.round(top);
	      bottom = Math.round(bottom);
	      fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")));
	    }

	    function drawForLine(line, fromArg, toArg) {
	      var lineObj = getLine(doc, line);
	      var lineLen = lineObj.text.length;
	      var start, end;
	      function coords(ch, bias) {
	        return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
	      }

	      function wrapX(pos, dir, side) {
	        var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
	        var prop = (dir == "ltr") == (side == "after") ? "left" : "right";
	        var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
	        return coords(ch, prop)[prop]
	      }

	      var order = getOrder(lineObj, doc.direction);
	      iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
	        var ltr = dir == "ltr";
	        var fromPos = coords(from, ltr ? "left" : "right");
	        var toPos = coords(to - 1, ltr ? "right" : "left");

	        var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen;
	        var first = i == 0, last = !order || i == order.length - 1;
	        if (toPos.top - fromPos.top <= 3) { // Single line
	          var openLeft = (docLTR ? openStart : openEnd) && first;
	          var openRight = (docLTR ? openEnd : openStart) && last;
	          var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
	          var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
	          add(left, fromPos.top, right - left, fromPos.bottom);
	        } else { // Multiple lines
	          var topLeft, topRight, botLeft, botRight;
	          if (ltr) {
	            topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
	            topRight = docLTR ? rightSide : wrapX(from, dir, "before");
	            botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
	            botRight = docLTR && openEnd && last ? rightSide : toPos.right;
	          } else {
	            topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
	            topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
	            botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
	            botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
	          }
	          add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
	          if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top); }
	          add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
	        }

	        if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos; }
	        if (cmpCoords(toPos, start) < 0) { start = toPos; }
	        if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos; }
	        if (cmpCoords(toPos, end) < 0) { end = toPos; }
	      });
	      return {start: start, end: end}
	    }

	    var sFrom = range$$1.from(), sTo = range$$1.to();
	    if (sFrom.line == sTo.line) {
	      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
	    } else {
	      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
	      var singleVLine = visualLine(fromLine) == visualLine(toLine);
	      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
	      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
	      if (singleVLine) {
	        if (leftEnd.top < rightStart.top - 2) {
	          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
	          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
	        } else {
	          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
	        }
	      }
	      if (leftEnd.bottom < rightStart.top)
	        { add(leftSide, leftEnd.bottom, null, rightStart.top); }
	    }

	    output.appendChild(fragment);
	  }

	  // Cursor-blinking
	  function restartBlink(cm) {
	    if (!cm.state.focused) { return }
	    var display = cm.display;
	    clearInterval(display.blinker);
	    var on = true;
	    display.cursorDiv.style.visibility = "";
	    if (cm.options.cursorBlinkRate > 0)
	      { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
	        cm.options.cursorBlinkRate); }
	    else if (cm.options.cursorBlinkRate < 0)
	      { display.cursorDiv.style.visibility = "hidden"; }
	  }

	  function ensureFocus(cm) {
	    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
	  }

	  function delayBlurEvent(cm) {
	    cm.state.delayingBlurEvent = true;
	    setTimeout(function () { if (cm.state.delayingBlurEvent) {
	      cm.state.delayingBlurEvent = false;
	      onBlur(cm);
	    } }, 100);
	  }

	  function onFocus(cm, e) {
	    if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false; }

	    if (cm.options.readOnly == "nocursor") { return }
	    if (!cm.state.focused) {
	      signal(cm, "focus", cm, e);
	      cm.state.focused = true;
	      addClass(cm.display.wrapper, "CodeMirror-focused");
	      // This test prevents this from firing when a context
	      // menu is closed (since the input reset would kill the
	      // select-all detection hack)
	      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
	        cm.display.input.reset();
	        if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20); } // Issue #1730
	      }
	      cm.display.input.receivedFocus();
	    }
	    restartBlink(cm);
	  }
	  function onBlur(cm, e) {
	    if (cm.state.delayingBlurEvent) { return }

	    if (cm.state.focused) {
	      signal(cm, "blur", cm, e);
	      cm.state.focused = false;
	      rmClass(cm.display.wrapper, "CodeMirror-focused");
	    }
	    clearInterval(cm.display.blinker);
	    setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false; } }, 150);
	  }

	  // Read the actual heights of the rendered lines, and update their
	  // stored heights to match.
	  function updateHeightsInViewport(cm) {
	    var display = cm.display;
	    var prevBottom = display.lineDiv.offsetTop;
	    for (var i = 0; i < display.view.length; i++) {
	      var cur = display.view[i], wrapping = cm.options.lineWrapping;
	      var height = (void 0), width = 0;
	      if (cur.hidden) { continue }
	      if (ie && ie_version < 8) {
	        var bot = cur.node.offsetTop + cur.node.offsetHeight;
	        height = bot - prevBottom;
	        prevBottom = bot;
	      } else {
	        var box = cur.node.getBoundingClientRect();
	        height = box.bottom - box.top;
	        // Check that lines don't extend past the right of the current
	        // editor width
	        if (!wrapping && cur.text.firstChild)
	          { width = cur.text.firstChild.getBoundingClientRect().right - box.left - 1; }
	      }
	      var diff = cur.line.height - height;
	      if (height < 2) { height = textHeight(display); }
	      if (diff > .005 || diff < -.005) {
	        updateLineHeight(cur.line, height);
	        updateWidgetHeight(cur.line);
	        if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
	          { updateWidgetHeight(cur.rest[j]); } }
	      }
	      if (width > cm.display.sizerWidth) {
	        var chWidth = Math.ceil(width / charWidth(cm.display));
	        if (chWidth > cm.display.maxLineLength) {
	          cm.display.maxLineLength = chWidth;
	          cm.display.maxLine = cur.line;
	          cm.display.maxLineChanged = true;
	        }
	      }
	    }
	  }

	  // Read and store the height of line widgets associated with the
	  // given line.
	  function updateWidgetHeight(line) {
	    if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
	      var w = line.widgets[i], parent = w.node.parentNode;
	      if (parent) { w.height = parent.offsetHeight; }
	    } }
	  }

	  // Compute the lines that are visible in a given viewport (defaults
	  // the the current scroll position). viewport may contain top,
	  // height, and ensure (see op.scrollToPos) properties.
	  function visibleLines(display, doc, viewport) {
	    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
	    top = Math.floor(top - paddingTop(display));
	    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

	    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
	    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
	    // forces those lines into the viewport (if possible).
	    if (viewport && viewport.ensure) {
	      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
	      if (ensureFrom < from) {
	        from = ensureFrom;
	        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
	      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
	        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
	        to = ensureTo;
	      }
	    }
	    return {from: from, to: Math.max(to, from + 1)}
	  }

	  // Re-align line numbers and gutter marks to compensate for
	  // horizontal scrolling.
	  function alignHorizontally(cm) {
	    var display = cm.display, view = display.view;
	    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
	    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
	    var gutterW = display.gutters.offsetWidth, left = comp + "px";
	    for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
	      if (cm.options.fixedGutter) {
	        if (view[i].gutter)
	          { view[i].gutter.style.left = left; }
	        if (view[i].gutterBackground)
	          { view[i].gutterBackground.style.left = left; }
	      }
	      var align = view[i].alignable;
	      if (align) { for (var j = 0; j < align.length; j++)
	        { align[j].style.left = left; } }
	    } }
	    if (cm.options.fixedGutter)
	      { display.gutters.style.left = (comp + gutterW) + "px"; }
	  }

	  // Used to ensure that the line number gutter is still the right
	  // size for the current document size. Returns true when an update
	  // is needed.
	  function maybeUpdateLineNumberWidth(cm) {
	    if (!cm.options.lineNumbers) { return false }
	    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
	    if (last.length != display.lineNumChars) {
	      var test = display.measure.appendChild(elt("div", [elt("div", last)],
	                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
	      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
	      display.lineGutter.style.width = "";
	      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
	      display.lineNumWidth = display.lineNumInnerWidth + padding;
	      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
	      display.lineGutter.style.width = display.lineNumWidth + "px";
	      updateGutterSpace(cm);
	      return true
	    }
	    return false
	  }

	  // SCROLLING THINGS INTO VIEW

	  // If an editor sits on the top or bottom of the window, partially
	  // scrolled out of view, this ensures that the cursor is visible.
	  function maybeScrollWindow(cm, rect) {
	    if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

	    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
	    if (rect.top + box.top < 0) { doScroll = true; }
	    else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false; }
	    if (doScroll != null && !phantom) {
	      var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"));
	      cm.display.lineSpace.appendChild(scrollNode);
	      scrollNode.scrollIntoView(doScroll);
	      cm.display.lineSpace.removeChild(scrollNode);
	    }
	  }

	  // Scroll a given position into view (immediately), verifying that
	  // it actually became visible (as line heights are accurately
	  // measured, the position of something may 'drift' during drawing).
	  function scrollPosIntoView(cm, pos, end, margin) {
	    if (margin == null) { margin = 0; }
	    var rect;
	    if (!cm.options.lineWrapping && pos == end) {
	      // Set pos and end to the cursor positions around the character pos sticks to
	      // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
	      // If pos == Pos(_, 0, "before"), pos and end are unchanged
	      pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
	      end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
	    }
	    for (var limit = 0; limit < 5; limit++) {
	      var changed = false;
	      var coords = cursorCoords(cm, pos);
	      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
	      rect = {left: Math.min(coords.left, endCoords.left),
	              top: Math.min(coords.top, endCoords.top) - margin,
	              right: Math.max(coords.left, endCoords.left),
	              bottom: Math.max(coords.bottom, endCoords.bottom) + margin};
	      var scrollPos = calculateScrollPos(cm, rect);
	      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
	      if (scrollPos.scrollTop != null) {
	        updateScrollTop(cm, scrollPos.scrollTop);
	        if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true; }
	      }
	      if (scrollPos.scrollLeft != null) {
	        setScrollLeft(cm, scrollPos.scrollLeft);
	        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true; }
	      }
	      if (!changed) { break }
	    }
	    return rect
	  }

	  // Scroll a given set of coordinates into view (immediately).
	  function scrollIntoView(cm, rect) {
	    var scrollPos = calculateScrollPos(cm, rect);
	    if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop); }
	    if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft); }
	  }

	  // Calculate a new scroll position needed to scroll the given
	  // rectangle into view. Returns an object with scrollTop and
	  // scrollLeft properties. When these are undefined, the
	  // vertical/horizontal position does not need to be adjusted.
	  function calculateScrollPos(cm, rect) {
	    var display = cm.display, snapMargin = textHeight(cm.display);
	    if (rect.top < 0) { rect.top = 0; }
	    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
	    var screen = displayHeight(cm), result = {};
	    if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen; }
	    var docBottom = cm.doc.height + paddingVert(display);
	    var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin;
	    if (rect.top < screentop) {
	      result.scrollTop = atTop ? 0 : rect.top;
	    } else if (rect.bottom > screentop + screen) {
	      var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
	      if (newTop != screentop) { result.scrollTop = newTop; }
	    }

	    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
	    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
	    var tooWide = rect.right - rect.left > screenw;
	    if (tooWide) { rect.right = rect.left + screenw; }
	    if (rect.left < 10)
	      { result.scrollLeft = 0; }
	    else if (rect.left < screenleft)
	      { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)); }
	    else if (rect.right > screenw + screenleft - 3)
	      { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw; }
	    return result
	  }

	  // Store a relative adjustment to the scroll position in the current
	  // operation (to be applied when the operation finishes).
	  function addToScrollTop(cm, top) {
	    if (top == null) { return }
	    resolveScrollToPos(cm);
	    cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
	  }

	  // Make sure that at the end of the operation the current cursor is
	  // shown.
	  function ensureCursorVisible(cm) {
	    resolveScrollToPos(cm);
	    var cur = cm.getCursor();
	    cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin};
	  }

	  function scrollToCoords(cm, x, y) {
	    if (x != null || y != null) { resolveScrollToPos(cm); }
	    if (x != null) { cm.curOp.scrollLeft = x; }
	    if (y != null) { cm.curOp.scrollTop = y; }
	  }

	  function scrollToRange(cm, range$$1) {
	    resolveScrollToPos(cm);
	    cm.curOp.scrollToPos = range$$1;
	  }

	  // When an operation has its scrollToPos property set, and another
	  // scroll action is applied before the end of the operation, this
	  // 'simulates' scrolling that position into view in a cheap way, so
	  // that the effect of intermediate scroll commands is not ignored.
	  function resolveScrollToPos(cm) {
	    var range$$1 = cm.curOp.scrollToPos;
	    if (range$$1) {
	      cm.curOp.scrollToPos = null;
	      var from = estimateCoords(cm, range$$1.from), to = estimateCoords(cm, range$$1.to);
	      scrollToCoordsRange(cm, from, to, range$$1.margin);
	    }
	  }

	  function scrollToCoordsRange(cm, from, to, margin) {
	    var sPos = calculateScrollPos(cm, {
	      left: Math.min(from.left, to.left),
	      top: Math.min(from.top, to.top) - margin,
	      right: Math.max(from.right, to.right),
	      bottom: Math.max(from.bottom, to.bottom) + margin
	    });
	    scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
	  }

	  // Sync the scrollable area and scrollbars, ensure the viewport
	  // covers the visible area.
	  function updateScrollTop(cm, val) {
	    if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
	    if (!gecko) { updateDisplaySimple(cm, {top: val}); }
	    setScrollTop(cm, val, true);
	    if (gecko) { updateDisplaySimple(cm); }
	    startWorker(cm, 100);
	  }

	  function setScrollTop(cm, val, forceScroll) {
	    val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val);
	    if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
	    cm.doc.scrollTop = val;
	    cm.display.scrollbars.setScrollTop(val);
	    if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val; }
	  }

	  // Sync scroller and scrollbar, ensure the gutter elements are
	  // aligned.
	  function setScrollLeft(cm, val, isScroller, forceScroll) {
	    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
	    if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
	    cm.doc.scrollLeft = val;
	    alignHorizontally(cm);
	    if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val; }
	    cm.display.scrollbars.setScrollLeft(val);
	  }

	  // SCROLLBARS

	  // Prepare DOM reads needed to update the scrollbars. Done in one
	  // shot to minimize update/measure roundtrips.
	  function measureForScrollbars(cm) {
	    var d = cm.display, gutterW = d.gutters.offsetWidth;
	    var docH = Math.round(cm.doc.height + paddingVert(cm.display));
	    return {
	      clientHeight: d.scroller.clientHeight,
	      viewHeight: d.wrapper.clientHeight,
	      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
	      viewWidth: d.wrapper.clientWidth,
	      barLeft: cm.options.fixedGutter ? gutterW : 0,
	      docHeight: docH,
	      scrollHeight: docH + scrollGap(cm) + d.barHeight,
	      nativeBarWidth: d.nativeBarWidth,
	      gutterWidth: gutterW
	    }
	  }

	  var NativeScrollbars = function(place, scroll, cm) {
	    this.cm = cm;
	    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
	    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
	    vert.tabIndex = horiz.tabIndex = -1;
	    place(vert); place(horiz);

	    on(vert, "scroll", function () {
	      if (vert.clientHeight) { scroll(vert.scrollTop, "vertical"); }
	    });
	    on(horiz, "scroll", function () {
	      if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal"); }
	    });

	    this.checkedZeroWidth = false;
	    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
	    if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px"; }
	  };

	  NativeScrollbars.prototype.update = function (measure) {
	    var needsH = measure.scrollWidth > measure.clientWidth + 1;
	    var needsV = measure.scrollHeight > measure.clientHeight + 1;
	    var sWidth = measure.nativeBarWidth;

	    if (needsV) {
	      this.vert.style.display = "block";
	      this.vert.style.bottom = needsH ? sWidth + "px" : "0";
	      var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
	      // A bug in IE8 can cause this value to be negative, so guard it.
	      this.vert.firstChild.style.height =
	        Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
	    } else {
	      this.vert.style.display = "";
	      this.vert.firstChild.style.height = "0";
	    }

	    if (needsH) {
	      this.horiz.style.display = "block";
	      this.horiz.style.right = needsV ? sWidth + "px" : "0";
	      this.horiz.style.left = measure.barLeft + "px";
	      var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
	      this.horiz.firstChild.style.width =
	        Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
	    } else {
	      this.horiz.style.display = "";
	      this.horiz.firstChild.style.width = "0";
	    }

	    if (!this.checkedZeroWidth && measure.clientHeight > 0) {
	      if (sWidth == 0) { this.zeroWidthHack(); }
	      this.checkedZeroWidth = true;
	    }

	    return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
	  };

	  NativeScrollbars.prototype.setScrollLeft = function (pos) {
	    if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos; }
	    if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz"); }
	  };

	  NativeScrollbars.prototype.setScrollTop = function (pos) {
	    if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos; }
	    if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert"); }
	  };

	  NativeScrollbars.prototype.zeroWidthHack = function () {
	    var w = mac && !mac_geMountainLion ? "12px" : "18px";
	    this.horiz.style.height = this.vert.style.width = w;
	    this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
	    this.disableHoriz = new Delayed;
	    this.disableVert = new Delayed;
	  };

	  NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
	    bar.style.pointerEvents = "auto";
	    function maybeDisable() {
	      // To find out whether the scrollbar is still visible, we
	      // check whether the element under the pixel in the bottom
	      // right corner of the scrollbar box is the scrollbar box
	      // itself (when the bar is still visible) or its filler child
	      // (when the bar is hidden). If it is still visible, we keep
	      // it enabled, if it's hidden, we disable pointer events.
	      var box = bar.getBoundingClientRect();
	      var elt$$1 = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
	          : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
	      if (elt$$1 != bar) { bar.style.pointerEvents = "none"; }
	      else { delay.set(1000, maybeDisable); }
	    }
	    delay.set(1000, maybeDisable);
	  };

	  NativeScrollbars.prototype.clear = function () {
	    var parent = this.horiz.parentNode;
	    parent.removeChild(this.horiz);
	    parent.removeChild(this.vert);
	  };

	  var NullScrollbars = function () {};

	  NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
	  NullScrollbars.prototype.setScrollLeft = function () {};
	  NullScrollbars.prototype.setScrollTop = function () {};
	  NullScrollbars.prototype.clear = function () {};

	  function updateScrollbars(cm, measure) {
	    if (!measure) { measure = measureForScrollbars(cm); }
	    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
	    updateScrollbarsInner(cm, measure);
	    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
	      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
	        { updateHeightsInViewport(cm); }
	      updateScrollbarsInner(cm, measureForScrollbars(cm));
	      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
	    }
	  }

	  // Re-synchronize the fake scrollbars with the actual size of the
	  // content.
	  function updateScrollbarsInner(cm, measure) {
	    var d = cm.display;
	    var sizes = d.scrollbars.update(measure);

	    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
	    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
	    d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

	    if (sizes.right && sizes.bottom) {
	      d.scrollbarFiller.style.display = "block";
	      d.scrollbarFiller.style.height = sizes.bottom + "px";
	      d.scrollbarFiller.style.width = sizes.right + "px";
	    } else { d.scrollbarFiller.style.display = ""; }
	    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
	      d.gutterFiller.style.display = "block";
	      d.gutterFiller.style.height = sizes.bottom + "px";
	      d.gutterFiller.style.width = measure.gutterWidth + "px";
	    } else { d.gutterFiller.style.display = ""; }
	  }

	  var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

	  function initScrollbars(cm) {
	    if (cm.display.scrollbars) {
	      cm.display.scrollbars.clear();
	      if (cm.display.scrollbars.addClass)
	        { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
	    }

	    cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
	      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
	      // Prevent clicks in the scrollbars from killing focus
	      on(node, "mousedown", function () {
	        if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0); }
	      });
	      node.setAttribute("cm-not-content", "true");
	    }, function (pos, axis) {
	      if (axis == "horizontal") { setScrollLeft(cm, pos); }
	      else { updateScrollTop(cm, pos); }
	    }, cm);
	    if (cm.display.scrollbars.addClass)
	      { addClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
	  }

	  // Operations are used to wrap a series of changes to the editor
	  // state in such a way that each change won't have to update the
	  // cursor and display (which would be awkward, slow, and
	  // error-prone). Instead, display updates are batched and then all
	  // combined and executed at once.

	  var nextOpId = 0;
	  // Start a new operation.
	  function startOperation(cm) {
	    cm.curOp = {
	      cm: cm,
	      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
	      startHeight: cm.doc.height, // Used to detect need to update scrollbar
	      forceUpdate: false,      // Used to force a redraw
	      updateInput: 0,       // Whether to reset the input textarea
	      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
	      changeObjs: null,        // Accumulated changes, for firing change events
	      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
	      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
	      selectionChanged: false, // Whether the selection needs to be redrawn
	      updateMaxLine: false,    // Set when the widest line needs to be determined anew
	      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
	      scrollToPos: null,       // Used to scroll to a specific position
	      focus: false,
	      id: ++nextOpId           // Unique ID
	    };
	    pushOperation(cm.curOp);
	  }

	  // Finish an operation, updating the display and signalling delayed events
	  function endOperation(cm) {
	    var op = cm.curOp;
	    if (op) { finishOperation(op, function (group) {
	      for (var i = 0; i < group.ops.length; i++)
	        { group.ops[i].cm.curOp = null; }
	      endOperations(group);
	    }); }
	  }

	  // The DOM updates done when an operation finishes are batched so
	  // that the minimum number of relayouts are required.
	  function endOperations(group) {
	    var ops = group.ops;
	    for (var i = 0; i < ops.length; i++) // Read DOM
	      { endOperation_R1(ops[i]); }
	    for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
	      { endOperation_W1(ops[i$1]); }
	    for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
	      { endOperation_R2(ops[i$2]); }
	    for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
	      { endOperation_W2(ops[i$3]); }
	    for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
	      { endOperation_finish(ops[i$4]); }
	  }

	  function endOperation_R1(op) {
	    var cm = op.cm, display = cm.display;
	    maybeClipScrollbars(cm);
	    if (op.updateMaxLine) { findMaxLine(cm); }

	    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
	      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
	                         op.scrollToPos.to.line >= display.viewTo) ||
	      display.maxLineChanged && cm.options.lineWrapping;
	    op.update = op.mustUpdate &&
	      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
	  }

	  function endOperation_W1(op) {
	    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
	  }

	  function endOperation_R2(op) {
	    var cm = op.cm, display = cm.display;
	    if (op.updatedDisplay) { updateHeightsInViewport(cm); }

	    op.barMeasure = measureForScrollbars(cm);

	    // If the max line changed since it was last measured, measure it,
	    // and ensure the document's width matches it.
	    // updateDisplay_W2 will use these properties to do the actual resizing
	    if (display.maxLineChanged && !cm.options.lineWrapping) {
	      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
	      cm.display.sizerWidth = op.adjustWidthTo;
	      op.barMeasure.scrollWidth =
	        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
	      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
	    }

	    if (op.updatedDisplay || op.selectionChanged)
	      { op.preparedSelection = display.input.prepareSelection(); }
	  }

	  function endOperation_W2(op) {
	    var cm = op.cm;

	    if (op.adjustWidthTo != null) {
	      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
	      if (op.maxScrollLeft < cm.doc.scrollLeft)
	        { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true); }
	      cm.display.maxLineChanged = false;
	    }

	    var takeFocus = op.focus && op.focus == activeElt();
	    if (op.preparedSelection)
	      { cm.display.input.showSelection(op.preparedSelection, takeFocus); }
	    if (op.updatedDisplay || op.startHeight != cm.doc.height)
	      { updateScrollbars(cm, op.barMeasure); }
	    if (op.updatedDisplay)
	      { setDocumentHeight(cm, op.barMeasure); }

	    if (op.selectionChanged) { restartBlink(cm); }

	    if (cm.state.focused && op.updateInput)
	      { cm.display.input.reset(op.typing); }
	    if (takeFocus) { ensureFocus(op.cm); }
	  }

	  function endOperation_finish(op) {
	    var cm = op.cm, display = cm.display, doc = cm.doc;

	    if (op.updatedDisplay) { postUpdateDisplay(cm, op.update); }

	    // Abort mouse wheel delta measurement, when scrolling explicitly
	    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
	      { display.wheelStartX = display.wheelStartY = null; }

	    // Propagate the scroll position to the actual DOM scroller
	    if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll); }

	    if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true); }
	    // If we need to scroll a specific position into view, do so.
	    if (op.scrollToPos) {
	      var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
	                                   clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
	      maybeScrollWindow(cm, rect);
	    }

	    // Fire events for markers that are hidden/unidden by editing or
	    // undoing
	    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
	    if (hidden) { for (var i = 0; i < hidden.length; ++i)
	      { if (!hidden[i].lines.length) { signal(hidden[i], "hide"); } } }
	    if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
	      { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide"); } } }

	    if (display.wrapper.offsetHeight)
	      { doc.scrollTop = cm.display.scroller.scrollTop; }

	    // Fire change events, and delayed event handlers
	    if (op.changeObjs)
	      { signal(cm, "changes", cm, op.changeObjs); }
	    if (op.update)
	      { op.update.finish(); }
	  }

	  // Run the given function in an operation
	  function runInOp(cm, f) {
	    if (cm.curOp) { return f() }
	    startOperation(cm);
	    try { return f() }
	    finally { endOperation(cm); }
	  }
	  // Wraps a function in an operation. Returns the wrapped function.
	  function operation(cm, f) {
	    return function() {
	      if (cm.curOp) { return f.apply(cm, arguments) }
	      startOperation(cm);
	      try { return f.apply(cm, arguments) }
	      finally { endOperation(cm); }
	    }
	  }
	  // Used to add methods to editor and doc instances, wrapping them in
	  // operations.
	  function methodOp(f) {
	    return function() {
	      if (this.curOp) { return f.apply(this, arguments) }
	      startOperation(this);
	      try { return f.apply(this, arguments) }
	      finally { endOperation(this); }
	    }
	  }
	  function docMethodOp(f) {
	    return function() {
	      var cm = this.cm;
	      if (!cm || cm.curOp) { return f.apply(this, arguments) }
	      startOperation(cm);
	      try { return f.apply(this, arguments) }
	      finally { endOperation(cm); }
	    }
	  }

	  // Updates the display.view data structure for a given change to the
	  // document. From and to are in pre-change coordinates. Lendiff is
	  // the amount of lines added or subtracted by the change. This is
	  // used for changes that span multiple lines, or change the way
	  // lines are divided into visual lines. regLineChange (below)
	  // registers single-line changes.
	  function regChange(cm, from, to, lendiff) {
	    if (from == null) { from = cm.doc.first; }
	    if (to == null) { to = cm.doc.first + cm.doc.size; }
	    if (!lendiff) { lendiff = 0; }

	    var display = cm.display;
	    if (lendiff && to < display.viewTo &&
	        (display.updateLineNumbers == null || display.updateLineNumbers > from))
	      { display.updateLineNumbers = from; }

	    cm.curOp.viewChanged = true;

	    if (from >= display.viewTo) { // Change after
	      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
	        { resetView(cm); }
	    } else if (to <= display.viewFrom) { // Change before
	      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
	        resetView(cm);
	      } else {
	        display.viewFrom += lendiff;
	        display.viewTo += lendiff;
	      }
	    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
	      resetView(cm);
	    } else if (from <= display.viewFrom) { // Top overlap
	      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
	      if (cut) {
	        display.view = display.view.slice(cut.index);
	        display.viewFrom = cut.lineN;
	        display.viewTo += lendiff;
	      } else {
	        resetView(cm);
	      }
	    } else if (to >= display.viewTo) { // Bottom overlap
	      var cut$1 = viewCuttingPoint(cm, from, from, -1);
	      if (cut$1) {
	        display.view = display.view.slice(0, cut$1.index);
	        display.viewTo = cut$1.lineN;
	      } else {
	        resetView(cm);
	      }
	    } else { // Gap in the middle
	      var cutTop = viewCuttingPoint(cm, from, from, -1);
	      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
	      if (cutTop && cutBot) {
	        display.view = display.view.slice(0, cutTop.index)
	          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
	          .concat(display.view.slice(cutBot.index));
	        display.viewTo += lendiff;
	      } else {
	        resetView(cm);
	      }
	    }

	    var ext = display.externalMeasured;
	    if (ext) {
	      if (to < ext.lineN)
	        { ext.lineN += lendiff; }
	      else if (from < ext.lineN + ext.size)
	        { display.externalMeasured = null; }
	    }
	  }

	  // Register a change to a single line. Type must be one of "text",
	  // "gutter", "class", "widget"
	  function regLineChange(cm, line, type) {
	    cm.curOp.viewChanged = true;
	    var display = cm.display, ext = cm.display.externalMeasured;
	    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
	      { display.externalMeasured = null; }

	    if (line < display.viewFrom || line >= display.viewTo) { return }
	    var lineView = display.view[findViewIndex(cm, line)];
	    if (lineView.node == null) { return }
	    var arr = lineView.changes || (lineView.changes = []);
	    if (indexOf(arr, type) == -1) { arr.push(type); }
	  }

	  // Clear the view.
	  function resetView(cm) {
	    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
	    cm.display.view = [];
	    cm.display.viewOffset = 0;
	  }

	  function viewCuttingPoint(cm, oldN, newN, dir) {
	    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
	    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
	      { return {index: index, lineN: newN} }
	    var n = cm.display.viewFrom;
	    for (var i = 0; i < index; i++)
	      { n += view[i].size; }
	    if (n != oldN) {
	      if (dir > 0) {
	        if (index == view.length - 1) { return null }
	        diff = (n + view[index].size) - oldN;
	        index++;
	      } else {
	        diff = n - oldN;
	      }
	      oldN += diff; newN += diff;
	    }
	    while (visualLineNo(cm.doc, newN) != newN) {
	      if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
	      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
	      index += dir;
	    }
	    return {index: index, lineN: newN}
	  }

	  // Force the view to cover a given range, adding empty view element
	  // or clipping off existing ones as needed.
	  function adjustView(cm, from, to) {
	    var display = cm.display, view = display.view;
	    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
	      display.view = buildViewArray(cm, from, to);
	      display.viewFrom = from;
	    } else {
	      if (display.viewFrom > from)
	        { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); }
	      else if (display.viewFrom < from)
	        { display.view = display.view.slice(findViewIndex(cm, from)); }
	      display.viewFrom = from;
	      if (display.viewTo < to)
	        { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); }
	      else if (display.viewTo > to)
	        { display.view = display.view.slice(0, findViewIndex(cm, to)); }
	    }
	    display.viewTo = to;
	  }

	  // Count the number of lines in the view whose DOM representation is
	  // out of date (or nonexistent).
	  function countDirtyView(cm) {
	    var view = cm.display.view, dirty = 0;
	    for (var i = 0; i < view.length; i++) {
	      var lineView = view[i];
	      if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty; }
	    }
	    return dirty
	  }

	  // HIGHLIGHT WORKER

	  function startWorker(cm, time) {
	    if (cm.doc.highlightFrontier < cm.display.viewTo)
	      { cm.state.highlight.set(time, bind(highlightWorker, cm)); }
	  }

	  function highlightWorker(cm) {
	    var doc = cm.doc;
	    if (doc.highlightFrontier >= cm.display.viewTo) { return }
	    var end = +new Date + cm.options.workTime;
	    var context = getContextBefore(cm, doc.highlightFrontier);
	    var changedLines = [];

	    doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
	      if (context.line >= cm.display.viewFrom) { // Visible
	        var oldStyles = line.styles;
	        var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
	        var highlighted = highlightLine(cm, line, context, true);
	        if (resetState) { context.state = resetState; }
	        line.styles = highlighted.styles;
	        var oldCls = line.styleClasses, newCls = highlighted.classes;
	        if (newCls) { line.styleClasses = newCls; }
	        else if (oldCls) { line.styleClasses = null; }
	        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
	          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
	        for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i]; }
	        if (ischange) { changedLines.push(context.line); }
	        line.stateAfter = context.save();
	        context.nextLine();
	      } else {
	        if (line.text.length <= cm.options.maxHighlightLength)
	          { processLine(cm, line.text, context); }
	        line.stateAfter = context.line % 5 == 0 ? context.save() : null;
	        context.nextLine();
	      }
	      if (+new Date > end) {
	        startWorker(cm, cm.options.workDelay);
	        return true
	      }
	    });
	    doc.highlightFrontier = context.line;
	    doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
	    if (changedLines.length) { runInOp(cm, function () {
	      for (var i = 0; i < changedLines.length; i++)
	        { regLineChange(cm, changedLines[i], "text"); }
	    }); }
	  }

	  // DISPLAY DRAWING

	  var DisplayUpdate = function(cm, viewport, force) {
	    var display = cm.display;

	    this.viewport = viewport;
	    // Store some values that we'll need later (but don't want to force a relayout for)
	    this.visible = visibleLines(display, cm.doc, viewport);
	    this.editorIsHidden = !display.wrapper.offsetWidth;
	    this.wrapperHeight = display.wrapper.clientHeight;
	    this.wrapperWidth = display.wrapper.clientWidth;
	    this.oldDisplayWidth = displayWidth(cm);
	    this.force = force;
	    this.dims = getDimensions(cm);
	    this.events = [];
	  };

	  DisplayUpdate.prototype.signal = function (emitter, type) {
	    if (hasHandler(emitter, type))
	      { this.events.push(arguments); }
	  };
	  DisplayUpdate.prototype.finish = function () {
	      var this$1 = this;

	    for (var i = 0; i < this.events.length; i++)
	      { signal.apply(null, this$1.events[i]); }
	  };

	  function maybeClipScrollbars(cm) {
	    var display = cm.display;
	    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
	      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
	      display.heightForcer.style.height = scrollGap(cm) + "px";
	      display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
	      display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
	      display.scrollbarsClipped = true;
	    }
	  }

	  function selectionSnapshot(cm) {
	    if (cm.hasFocus()) { return null }
	    var active = activeElt();
	    if (!active || !contains(cm.display.lineDiv, active)) { return null }
	    var result = {activeElt: active};
	    if (window.getSelection) {
	      var sel = window.getSelection();
	      if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
	        result.anchorNode = sel.anchorNode;
	        result.anchorOffset = sel.anchorOffset;
	        result.focusNode = sel.focusNode;
	        result.focusOffset = sel.focusOffset;
	      }
	    }
	    return result
	  }

	  function restoreSelection(snapshot) {
	    if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
	    snapshot.activeElt.focus();
	    if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
	      var sel = window.getSelection(), range$$1 = document.createRange();
	      range$$1.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
	      range$$1.collapse(false);
	      sel.removeAllRanges();
	      sel.addRange(range$$1);
	      sel.extend(snapshot.focusNode, snapshot.focusOffset);
	    }
	  }

	  // Does the actual updating of the line display. Bails out
	  // (returning false) when there is nothing to be done and forced is
	  // false.
	  function updateDisplayIfNeeded(cm, update) {
	    var display = cm.display, doc = cm.doc;

	    if (update.editorIsHidden) {
	      resetView(cm);
	      return false
	    }

	    // Bail out if the visible area is already rendered and nothing changed.
	    if (!update.force &&
	        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
	        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
	        display.renderedView == display.view && countDirtyView(cm) == 0)
	      { return false }

	    if (maybeUpdateLineNumberWidth(cm)) {
	      resetView(cm);
	      update.dims = getDimensions(cm);
	    }

	    // Compute a suitable new viewport (from & to)
	    var end = doc.first + doc.size;
	    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
	    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
	    if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom); }
	    if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo); }
	    if (sawCollapsedSpans) {
	      from = visualLineNo(cm.doc, from);
	      to = visualLineEndNo(cm.doc, to);
	    }

	    var different = from != display.viewFrom || to != display.viewTo ||
	      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
	    adjustView(cm, from, to);

	    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
	    // Position the mover div to align with the current scroll position
	    cm.display.mover.style.top = display.viewOffset + "px";

	    var toUpdate = countDirtyView(cm);
	    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
	        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
	      { return false }

	    // For big changes, we hide the enclosing element during the
	    // update, since that speeds up the operations on most browsers.
	    var selSnapshot = selectionSnapshot(cm);
	    if (toUpdate > 4) { display.lineDiv.style.display = "none"; }
	    patchDisplay(cm, display.updateLineNumbers, update.dims);
	    if (toUpdate > 4) { display.lineDiv.style.display = ""; }
	    display.renderedView = display.view;
	    // There might have been a widget with a focused element that got
	    // hidden or updated, if so re-focus it.
	    restoreSelection(selSnapshot);

	    // Prevent selection and cursors from interfering with the scroll
	    // width and height.
	    removeChildren(display.cursorDiv);
	    removeChildren(display.selectionDiv);
	    display.gutters.style.height = display.sizer.style.minHeight = 0;

	    if (different) {
	      display.lastWrapHeight = update.wrapperHeight;
	      display.lastWrapWidth = update.wrapperWidth;
	      startWorker(cm, 400);
	    }

	    display.updateLineNumbers = null;

	    return true
	  }

	  function postUpdateDisplay(cm, update) {
	    var viewport = update.viewport;

	    for (var first = true;; first = false) {
	      if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
	        // Clip forced viewport to actual scrollable area.
	        if (viewport && viewport.top != null)
	          { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)}; }
	        // Updated line heights might result in the drawn area not
	        // actually covering the viewport. Keep looping until it does.
	        update.visible = visibleLines(cm.display, cm.doc, viewport);
	        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
	          { break }
	      }
	      if (!updateDisplayIfNeeded(cm, update)) { break }
	      updateHeightsInViewport(cm);
	      var barMeasure = measureForScrollbars(cm);
	      updateSelection(cm);
	      updateScrollbars(cm, barMeasure);
	      setDocumentHeight(cm, barMeasure);
	      update.force = false;
	    }

	    update.signal(cm, "update", cm);
	    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
	      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
	      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
	    }
	  }

	  function updateDisplaySimple(cm, viewport) {
	    var update = new DisplayUpdate(cm, viewport);
	    if (updateDisplayIfNeeded(cm, update)) {
	      updateHeightsInViewport(cm);
	      postUpdateDisplay(cm, update);
	      var barMeasure = measureForScrollbars(cm);
	      updateSelection(cm);
	      updateScrollbars(cm, barMeasure);
	      setDocumentHeight(cm, barMeasure);
	      update.finish();
	    }
	  }

	  // Sync the actual display DOM structure with display.view, removing
	  // nodes for lines that are no longer in view, and creating the ones
	  // that are not there yet, and updating the ones that are out of
	  // date.
	  function patchDisplay(cm, updateNumbersFrom, dims) {
	    var display = cm.display, lineNumbers = cm.options.lineNumbers;
	    var container = display.lineDiv, cur = container.firstChild;

	    function rm(node) {
	      var next = node.nextSibling;
	      // Works around a throw-scroll bug in OS X Webkit
	      if (webkit && mac && cm.display.currentWheelTarget == node)
	        { node.style.display = "none"; }
	      else
	        { node.parentNode.removeChild(node); }
	      return next
	    }

	    var view = display.view, lineN = display.viewFrom;
	    // Loop over the elements in the view, syncing cur (the DOM nodes
	    // in display.lineDiv) with the view as we go.
	    for (var i = 0; i < view.length; i++) {
	      var lineView = view[i];
	      if (lineView.hidden) ; else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
	        var node = buildLineElement(cm, lineView, lineN, dims);
	        container.insertBefore(node, cur);
	      } else { // Already drawn
	        while (cur != lineView.node) { cur = rm(cur); }
	        var updateNumber = lineNumbers && updateNumbersFrom != null &&
	          updateNumbersFrom <= lineN && lineView.lineNumber;
	        if (lineView.changes) {
	          if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false; }
	          updateLineForChanges(cm, lineView, lineN, dims);
	        }
	        if (updateNumber) {
	          removeChildren(lineView.lineNumber);
	          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
	        }
	        cur = lineView.node.nextSibling;
	      }
	      lineN += lineView.size;
	    }
	    while (cur) { cur = rm(cur); }
	  }

	  function updateGutterSpace(cm) {
	    var width = cm.display.gutters.offsetWidth;
	    cm.display.sizer.style.marginLeft = width + "px";
	  }

	  function setDocumentHeight(cm, measure) {
	    cm.display.sizer.style.minHeight = measure.docHeight + "px";
	    cm.display.heightForcer.style.top = measure.docHeight + "px";
	    cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px";
	  }

	  // Rebuild the gutter elements, ensure the margin to the left of the
	  // code matches their width.
	  function updateGutters(cm) {
	    var gutters = cm.display.gutters, specs = cm.options.gutters;
	    removeChildren(gutters);
	    var i = 0;
	    for (; i < specs.length; ++i) {
	      var gutterClass = specs[i];
	      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
	      if (gutterClass == "CodeMirror-linenumbers") {
	        cm.display.lineGutter = gElt;
	        gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
	      }
	    }
	    gutters.style.display = i ? "" : "none";
	    updateGutterSpace(cm);
	  }

	  // Make sure the gutters options contains the element
	  // "CodeMirror-linenumbers" when the lineNumbers option is true.
	  function setGuttersForLineNumbers(options) {
	    var found = indexOf(options.gutters, "CodeMirror-linenumbers");
	    if (found == -1 && options.lineNumbers) {
	      options.gutters = options.gutters.concat(["CodeMirror-linenumbers"]);
	    } else if (found > -1 && !options.lineNumbers) {
	      options.gutters = options.gutters.slice(0);
	      options.gutters.splice(found, 1);
	    }
	  }

	  // Since the delta values reported on mouse wheel events are
	  // unstandardized between browsers and even browser versions, and
	  // generally horribly unpredictable, this code starts by measuring
	  // the scroll effect that the first few mouse wheel events have,
	  // and, from that, detects the way it can convert deltas to pixel
	  // offsets afterwards.
	  //
	  // The reason we want to know the amount a wheel event will scroll
	  // is that it gives us a chance to update the display before the
	  // actual scrolling happens, reducing flickering.

	  var wheelSamples = 0, wheelPixelsPerUnit = null;
	  // Fill in a browser-detected starting value on browsers where we
	  // know one. These don't have to be accurate -- the result of them
	  // being wrong would just be a slight flicker on the first wheel
	  // scroll (if it is large enough).
	  if (ie) { wheelPixelsPerUnit = -.53; }
	  else if (gecko) { wheelPixelsPerUnit = 15; }
	  else if (chrome) { wheelPixelsPerUnit = -.7; }
	  else if (safari) { wheelPixelsPerUnit = -1/3; }

	  function wheelEventDelta(e) {
	    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
	    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail; }
	    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail; }
	    else if (dy == null) { dy = e.wheelDelta; }
	    return {x: dx, y: dy}
	  }
	  function wheelEventPixels(e) {
	    var delta = wheelEventDelta(e);
	    delta.x *= wheelPixelsPerUnit;
	    delta.y *= wheelPixelsPerUnit;
	    return delta
	  }

	  function onScrollWheel(cm, e) {
	    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

	    var display = cm.display, scroll = display.scroller;
	    // Quit if there's nothing to scroll here
	    var canScrollX = scroll.scrollWidth > scroll.clientWidth;
	    var canScrollY = scroll.scrollHeight > scroll.clientHeight;
	    if (!(dx && canScrollX || dy && canScrollY)) { return }

	    // Webkit browsers on OS X abort momentum scrolls when the target
	    // of the scroll event is removed from the scrollable element.
	    // This hack (see related code in patchDisplay) makes sure the
	    // element is kept around.
	    if (dy && mac && webkit) {
	      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
	        for (var i = 0; i < view.length; i++) {
	          if (view[i].node == cur) {
	            cm.display.currentWheelTarget = cur;
	            break outer
	          }
	        }
	      }
	    }

	    // On some browsers, horizontal scrolling will cause redraws to
	    // happen before the gutter has been realigned, causing it to
	    // wriggle around in a most unseemly way. When we have an
	    // estimated pixels/delta value, we just handle horizontal
	    // scrolling entirely here. It'll be slightly off from native, but
	    // better than glitching out.
	    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
	      if (dy && canScrollY)
	        { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)); }
	      setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
	      // Only prevent default scrolling if vertical scrolling is
	      // actually possible. Otherwise, it causes vertical scroll
	      // jitter on OSX trackpads when deltaX is small and deltaY
	      // is large (issue #3579)
	      if (!dy || (dy && canScrollY))
	        { e_preventDefault(e); }
	      display.wheelStartX = null; // Abort measurement, if in progress
	      return
	    }

	    // 'Project' the visible viewport to cover the area that is being
	    // scrolled into view (if we know enough to estimate it).
	    if (dy && wheelPixelsPerUnit != null) {
	      var pixels = dy * wheelPixelsPerUnit;
	      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
	      if (pixels < 0) { top = Math.max(0, top + pixels - 50); }
	      else { bot = Math.min(cm.doc.height, bot + pixels + 50); }
	      updateDisplaySimple(cm, {top: top, bottom: bot});
	    }

	    if (wheelSamples < 20) {
	      if (display.wheelStartX == null) {
	        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
	        display.wheelDX = dx; display.wheelDY = dy;
	        setTimeout(function () {
	          if (display.wheelStartX == null) { return }
	          var movedX = scroll.scrollLeft - display.wheelStartX;
	          var movedY = scroll.scrollTop - display.wheelStartY;
	          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
	            (movedX && display.wheelDX && movedX / display.wheelDX);
	          display.wheelStartX = display.wheelStartY = null;
	          if (!sample) { return }
	          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
	          ++wheelSamples;
	        }, 200);
	      } else {
	        display.wheelDX += dx; display.wheelDY += dy;
	      }
	    }
	  }

	  // Selection objects are immutable. A new one is created every time
	  // the selection changes. A selection is one or more non-overlapping
	  // (and non-touching) ranges, sorted, and an integer that indicates
	  // which one is the primary selection (the one that's scrolled into
	  // view, that getCursor returns, etc).
	  var Selection = function(ranges, primIndex) {
	    this.ranges = ranges;
	    this.primIndex = primIndex;
	  };

	  Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

	  Selection.prototype.equals = function (other) {
	      var this$1 = this;

	    if (other == this) { return true }
	    if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
	    for (var i = 0; i < this.ranges.length; i++) {
	      var here = this$1.ranges[i], there = other.ranges[i];
	      if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
	    }
	    return true
	  };

	  Selection.prototype.deepCopy = function () {
	      var this$1 = this;

	    var out = [];
	    for (var i = 0; i < this.ranges.length; i++)
	      { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)); }
	    return new Selection(out, this.primIndex)
	  };

	  Selection.prototype.somethingSelected = function () {
	      var this$1 = this;

	    for (var i = 0; i < this.ranges.length; i++)
	      { if (!this$1.ranges[i].empty()) { return true } }
	    return false
	  };

	  Selection.prototype.contains = function (pos, end) {
	      var this$1 = this;

	    if (!end) { end = pos; }
	    for (var i = 0; i < this.ranges.length; i++) {
	      var range = this$1.ranges[i];
	      if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
	        { return i }
	    }
	    return -1
	  };

	  var Range = function(anchor, head) {
	    this.anchor = anchor; this.head = head;
	  };

	  Range.prototype.from = function () { return minPos(this.anchor, this.head) };
	  Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
	  Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

	  // Take an unsorted, potentially overlapping set of ranges, and
	  // build a selection out of it. 'Consumes' ranges array (modifying
	  // it).
	  function normalizeSelection(cm, ranges, primIndex) {
	    var mayTouch = cm && cm.options.selectionsMayTouch;
	    var prim = ranges[primIndex];
	    ranges.sort(function (a, b) { return cmp(a.from(), b.from()); });
	    primIndex = indexOf(ranges, prim);
	    for (var i = 1; i < ranges.length; i++) {
	      var cur = ranges[i], prev = ranges[i - 1];
	      var diff = cmp(prev.to(), cur.from());
	      if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
	        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
	        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
	        if (i <= primIndex) { --primIndex; }
	        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
	      }
	    }
	    return new Selection(ranges, primIndex)
	  }

	  function simpleSelection(anchor, head) {
	    return new Selection([new Range(anchor, head || anchor)], 0)
	  }

	  // Compute the position of the end of a change (its 'to' property
	  // refers to the pre-change end).
	  function changeEnd(change) {
	    if (!change.text) { return change.to }
	    return Pos(change.from.line + change.text.length - 1,
	               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
	  }

	  // Adjust a position to refer to the post-change position of the
	  // same text, or the end of the change if the change covers it.
	  function adjustForChange(pos, change) {
	    if (cmp(pos, change.from) < 0) { return pos }
	    if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

	    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
	    if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch; }
	    return Pos(line, ch)
	  }

	  function computeSelAfterChange(doc, change) {
	    var out = [];
	    for (var i = 0; i < doc.sel.ranges.length; i++) {
	      var range = doc.sel.ranges[i];
	      out.push(new Range(adjustForChange(range.anchor, change),
	                         adjustForChange(range.head, change)));
	    }
	    return normalizeSelection(doc.cm, out, doc.sel.primIndex)
	  }

	  function offsetPos(pos, old, nw) {
	    if (pos.line == old.line)
	      { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
	    else
	      { return Pos(nw.line + (pos.line - old.line), pos.ch) }
	  }

	  // Used by replaceSelections to allow moving the selection to the
	  // start or around the replaced test. Hint may be "start" or "around".
	  function computeReplacedSel(doc, changes, hint) {
	    var out = [];
	    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
	    for (var i = 0; i < changes.length; i++) {
	      var change = changes[i];
	      var from = offsetPos(change.from, oldPrev, newPrev);
	      var to = offsetPos(changeEnd(change), oldPrev, newPrev);
	      oldPrev = change.to;
	      newPrev = to;
	      if (hint == "around") {
	        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
	        out[i] = new Range(inv ? to : from, inv ? from : to);
	      } else {
	        out[i] = new Range(from, from);
	      }
	    }
	    return new Selection(out, doc.sel.primIndex)
	  }

	  // Used to get the editor into a consistent state again when options change.

	  function loadMode(cm) {
	    cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
	    resetModeState(cm);
	  }

	  function resetModeState(cm) {
	    cm.doc.iter(function (line) {
	      if (line.stateAfter) { line.stateAfter = null; }
	      if (line.styles) { line.styles = null; }
	    });
	    cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
	    startWorker(cm, 100);
	    cm.state.modeGen++;
	    if (cm.curOp) { regChange(cm); }
	  }

	  // DOCUMENT DATA STRUCTURE

	  // By default, updates that start and end at the beginning of a line
	  // are treated specially, in order to make the association of line
	  // widgets and marker elements with the text behave more intuitive.
	  function isWholeLineUpdate(doc, change) {
	    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
	      (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
	  }

	  // Perform a change on the document data structure.
	  function updateDoc(doc, change, markedSpans, estimateHeight$$1) {
	    function spansFor(n) {return markedSpans ? markedSpans[n] : null}
	    function update(line, text, spans) {
	      updateLine(line, text, spans, estimateHeight$$1);
	      signalLater(line, "change", line, change);
	    }
	    function linesFor(start, end) {
	      var result = [];
	      for (var i = start; i < end; ++i)
	        { result.push(new Line(text[i], spansFor(i), estimateHeight$$1)); }
	      return result
	    }

	    var from = change.from, to = change.to, text = change.text;
	    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
	    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

	    // Adjust the line structure
	    if (change.full) {
	      doc.insert(0, linesFor(0, text.length));
	      doc.remove(text.length, doc.size - text.length);
	    } else if (isWholeLineUpdate(doc, change)) {
	      // This is a whole-line replace. Treated specially to make
	      // sure line objects move the way they are supposed to.
	      var added = linesFor(0, text.length - 1);
	      update(lastLine, lastLine.text, lastSpans);
	      if (nlines) { doc.remove(from.line, nlines); }
	      if (added.length) { doc.insert(from.line, added); }
	    } else if (firstLine == lastLine) {
	      if (text.length == 1) {
	        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
	      } else {
	        var added$1 = linesFor(1, text.length - 1);
	        added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight$$1));
	        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
	        doc.insert(from.line + 1, added$1);
	      }
	    } else if (text.length == 1) {
	      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
	      doc.remove(from.line + 1, nlines);
	    } else {
	      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
	      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
	      var added$2 = linesFor(1, text.length - 1);
	      if (nlines > 1) { doc.remove(from.line + 1, nlines - 1); }
	      doc.insert(from.line + 1, added$2);
	    }

	    signalLater(doc, "change", doc, change);
	  }

	  // Call f for all linked documents.
	  function linkedDocs(doc, f, sharedHistOnly) {
	    function propagate(doc, skip, sharedHist) {
	      if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
	        var rel = doc.linked[i];
	        if (rel.doc == skip) { continue }
	        var shared = sharedHist && rel.sharedHist;
	        if (sharedHistOnly && !shared) { continue }
	        f(rel.doc, shared);
	        propagate(rel.doc, doc, shared);
	      } }
	    }
	    propagate(doc, null, true);
	  }

	  // Attach a document to an editor.
	  function attachDoc(cm, doc) {
	    if (doc.cm) { throw new Error("This document is already in use.") }
	    cm.doc = doc;
	    doc.cm = cm;
	    estimateLineHeights(cm);
	    loadMode(cm);
	    setDirectionClass(cm);
	    if (!cm.options.lineWrapping) { findMaxLine(cm); }
	    cm.options.mode = doc.modeOption;
	    regChange(cm);
	  }

	  function setDirectionClass(cm) {
	  (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
	  }

	  function directionChanged(cm) {
	    runInOp(cm, function () {
	      setDirectionClass(cm);
	      regChange(cm);
	    });
	  }

	  function History(startGen) {
	    // Arrays of change events and selections. Doing something adds an
	    // event to done and clears undo. Undoing moves events from done
	    // to undone, redoing moves them in the other direction.
	    this.done = []; this.undone = [];
	    this.undoDepth = Infinity;
	    // Used to track when changes can be merged into a single undo
	    // event
	    this.lastModTime = this.lastSelTime = 0;
	    this.lastOp = this.lastSelOp = null;
	    this.lastOrigin = this.lastSelOrigin = null;
	    // Used by the isClean() method
	    this.generation = this.maxGeneration = startGen || 1;
	  }

	  // Create a history change event from an updateDoc-style change
	  // object.
	  function historyChangeFromChange(doc, change) {
	    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
	    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
	    linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true);
	    return histChange
	  }

	  // Pop all selection events off the end of a history array. Stop at
	  // a change event.
	  function clearSelectionEvents(array) {
	    while (array.length) {
	      var last = lst(array);
	      if (last.ranges) { array.pop(); }
	      else { break }
	    }
	  }

	  // Find the top change event in the history. Pop off selection
	  // events that are in the way.
	  function lastChangeEvent(hist, force) {
	    if (force) {
	      clearSelectionEvents(hist.done);
	      return lst(hist.done)
	    } else if (hist.done.length && !lst(hist.done).ranges) {
	      return lst(hist.done)
	    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
	      hist.done.pop();
	      return lst(hist.done)
	    }
	  }

	  // Register a change in the history. Merges changes that are within
	  // a single operation, or are close together with an origin that
	  // allows merging (starting with "+") into a single event.
	  function addChangeToHistory(doc, change, selAfter, opId) {
	    var hist = doc.history;
	    hist.undone.length = 0;
	    var time = +new Date, cur;
	    var last;

	    if ((hist.lastOp == opId ||
	         hist.lastOrigin == change.origin && change.origin &&
	         ((change.origin.charAt(0) == "+" && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500)) ||
	          change.origin.charAt(0) == "*")) &&
	        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
	      // Merge this change into the last event
	      last = lst(cur.changes);
	      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
	        // Optimized case for simple insertion -- don't want to add
	        // new changesets for every character typed
	        last.to = changeEnd(change);
	      } else {
	        // Add new sub-event
	        cur.changes.push(historyChangeFromChange(doc, change));
	      }
	    } else {
	      // Can not be merged, start a new event.
	      var before = lst(hist.done);
	      if (!before || !before.ranges)
	        { pushSelectionToHistory(doc.sel, hist.done); }
	      cur = {changes: [historyChangeFromChange(doc, change)],
	             generation: hist.generation};
	      hist.done.push(cur);
	      while (hist.done.length > hist.undoDepth) {
	        hist.done.shift();
	        if (!hist.done[0].ranges) { hist.done.shift(); }
	      }
	    }
	    hist.done.push(selAfter);
	    hist.generation = ++hist.maxGeneration;
	    hist.lastModTime = hist.lastSelTime = time;
	    hist.lastOp = hist.lastSelOp = opId;
	    hist.lastOrigin = hist.lastSelOrigin = change.origin;

	    if (!last) { signal(doc, "historyAdded"); }
	  }

	  function selectionEventCanBeMerged(doc, origin, prev, sel) {
	    var ch = origin.charAt(0);
	    return ch == "*" ||
	      ch == "+" &&
	      prev.ranges.length == sel.ranges.length &&
	      prev.somethingSelected() == sel.somethingSelected() &&
	      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
	  }

	  // Called whenever the selection changes, sets the new selection as
	  // the pending selection in the history, and pushes the old pending
	  // selection into the 'done' array when it was significantly
	  // different (in number of selected ranges, emptiness, or time).
	  function addSelectionToHistory(doc, sel, opId, options) {
	    var hist = doc.history, origin = options && options.origin;

	    // A new event is started when the previous origin does not match
	    // the current, or the origins don't allow matching. Origins
	    // starting with * are always merged, those starting with + are
	    // merged when similar and close together in time.
	    if (opId == hist.lastSelOp ||
	        (origin && hist.lastSelOrigin == origin &&
	         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
	          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
	      { hist.done[hist.done.length - 1] = sel; }
	    else
	      { pushSelectionToHistory(sel, hist.done); }

	    hist.lastSelTime = +new Date;
	    hist.lastSelOrigin = origin;
	    hist.lastSelOp = opId;
	    if (options && options.clearRedo !== false)
	      { clearSelectionEvents(hist.undone); }
	  }

	  function pushSelectionToHistory(sel, dest) {
	    var top = lst(dest);
	    if (!(top && top.ranges && top.equals(sel)))
	      { dest.push(sel); }
	  }

	  // Used to store marked span information in the history.
	  function attachLocalSpans(doc, change, from, to) {
	    var existing = change["spans_" + doc.id], n = 0;
	    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
	      if (line.markedSpans)
	        { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans; }
	      ++n;
	    });
	  }

	  // When un/re-doing restores text containing marked spans, those
	  // that have been explicitly cleared should not be restored.
	  function removeClearedSpans(spans) {
	    if (!spans) { return null }
	    var out;
	    for (var i = 0; i < spans.length; ++i) {
	      if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i); } }
	      else if (out) { out.push(spans[i]); }
	    }
	    return !out ? spans : out.length ? out : null
	  }

	  // Retrieve and filter the old marked spans stored in a change event.
	  function getOldSpans(doc, change) {
	    var found = change["spans_" + doc.id];
	    if (!found) { return null }
	    var nw = [];
	    for (var i = 0; i < change.text.length; ++i)
	      { nw.push(removeClearedSpans(found[i])); }
	    return nw
	  }

	  // Used for un/re-doing changes from the history. Combines the
	  // result of computing the existing spans with the set of spans that
	  // existed in the history (so that deleting around a span and then
	  // undoing brings back the span).
	  function mergeOldSpans(doc, change) {
	    var old = getOldSpans(doc, change);
	    var stretched = stretchSpansOverChange(doc, change);
	    if (!old) { return stretched }
	    if (!stretched) { return old }

	    for (var i = 0; i < old.length; ++i) {
	      var oldCur = old[i], stretchCur = stretched[i];
	      if (oldCur && stretchCur) {
	        spans: for (var j = 0; j < stretchCur.length; ++j) {
	          var span = stretchCur[j];
	          for (var k = 0; k < oldCur.length; ++k)
	            { if (oldCur[k].marker == span.marker) { continue spans } }
	          oldCur.push(span);
	        }
	      } else if (stretchCur) {
	        old[i] = stretchCur;
	      }
	    }
	    return old
	  }

	  // Used both to provide a JSON-safe object in .getHistory, and, when
	  // detaching a document, to split the history in two
	  function copyHistoryArray(events, newGroup, instantiateSel) {
	    var copy = [];
	    for (var i = 0; i < events.length; ++i) {
	      var event = events[i];
	      if (event.ranges) {
	        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
	        continue
	      }
	      var changes = event.changes, newChanges = [];
	      copy.push({changes: newChanges});
	      for (var j = 0; j < changes.length; ++j) {
	        var change = changes[j], m = (void 0);
	        newChanges.push({from: change.from, to: change.to, text: change.text});
	        if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
	          if (indexOf(newGroup, Number(m[1])) > -1) {
	            lst(newChanges)[prop] = change[prop];
	            delete change[prop];
	          }
	        } } }
	      }
	    }
	    return copy
	  }

	  // The 'scroll' parameter given to many of these indicated whether
	  // the new cursor position should be scrolled into view after
	  // modifying the selection.

	  // If shift is held or the extend flag is set, extends a range to
	  // include a given position (and optionally a second position).
	  // Otherwise, simply returns the range between the given positions.
	  // Used for cursor motion and such.
	  function extendRange(range, head, other, extend) {
	    if (extend) {
	      var anchor = range.anchor;
	      if (other) {
	        var posBefore = cmp(head, anchor) < 0;
	        if (posBefore != (cmp(other, anchor) < 0)) {
	          anchor = head;
	          head = other;
	        } else if (posBefore != (cmp(head, other) < 0)) {
	          head = other;
	        }
	      }
	      return new Range(anchor, head)
	    } else {
	      return new Range(other || head, head)
	    }
	  }

	  // Extend the primary selection range, discard the rest.
	  function extendSelection(doc, head, other, options, extend) {
	    if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend); }
	    setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
	  }

	  // Extend all selections (pos is an array of selections with length
	  // equal the number of selections)
	  function extendSelections(doc, heads, options) {
	    var out = [];
	    var extend = doc.cm && (doc.cm.display.shift || doc.extend);
	    for (var i = 0; i < doc.sel.ranges.length; i++)
	      { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend); }
	    var newSel = normalizeSelection(doc.cm, out, doc.sel.primIndex);
	    setSelection(doc, newSel, options);
	  }

	  // Updates a single range in the selection.
	  function replaceOneSelection(doc, i, range, options) {
	    var ranges = doc.sel.ranges.slice(0);
	    ranges[i] = range;
	    setSelection(doc, normalizeSelection(doc.cm, ranges, doc.sel.primIndex), options);
	  }

	  // Reset the selection to a single range.
	  function setSimpleSelection(doc, anchor, head, options) {
	    setSelection(doc, simpleSelection(anchor, head), options);
	  }

	  // Give beforeSelectionChange handlers a change to influence a
	  // selection update.
	  function filterSelectionChange(doc, sel, options) {
	    var obj = {
	      ranges: sel.ranges,
	      update: function(ranges) {
	        var this$1 = this;

	        this.ranges = [];
	        for (var i = 0; i < ranges.length; i++)
	          { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
	                                     clipPos(doc, ranges[i].head)); }
	      },
	      origin: options && options.origin
	    };
	    signal(doc, "beforeSelectionChange", doc, obj);
	    if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj); }
	    if (obj.ranges != sel.ranges) { return normalizeSelection(doc.cm, obj.ranges, obj.ranges.length - 1) }
	    else { return sel }
	  }

	  function setSelectionReplaceHistory(doc, sel, options) {
	    var done = doc.history.done, last = lst(done);
	    if (last && last.ranges) {
	      done[done.length - 1] = sel;
	      setSelectionNoUndo(doc, sel, options);
	    } else {
	      setSelection(doc, sel, options);
	    }
	  }

	  // Set a new selection.
	  function setSelection(doc, sel, options) {
	    setSelectionNoUndo(doc, sel, options);
	    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
	  }

	  function setSelectionNoUndo(doc, sel, options) {
	    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
	      { sel = filterSelectionChange(doc, sel, options); }

	    var bias = options && options.bias ||
	      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
	    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

	    if (!(options && options.scroll === false) && doc.cm)
	      { ensureCursorVisible(doc.cm); }
	  }

	  function setSelectionInner(doc, sel) {
	    if (sel.equals(doc.sel)) { return }

	    doc.sel = sel;

	    if (doc.cm) {
	      doc.cm.curOp.updateInput = 1;
	      doc.cm.curOp.selectionChanged = true;
	      signalCursorActivity(doc.cm);
	    }
	    signalLater(doc, "cursorActivity", doc);
	  }

	  // Verify that the selection does not partially select any atomic
	  // marked ranges.
	  function reCheckSelection(doc) {
	    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
	  }

	  // Return a selection that does not partially select any atomic
	  // ranges.
	  function skipAtomicInSelection(doc, sel, bias, mayClear) {
	    var out;
	    for (var i = 0; i < sel.ranges.length; i++) {
	      var range = sel.ranges[i];
	      var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
	      var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
	      var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
	      if (out || newAnchor != range.anchor || newHead != range.head) {
	        if (!out) { out = sel.ranges.slice(0, i); }
	        out[i] = new Range(newAnchor, newHead);
	      }
	    }
	    return out ? normalizeSelection(doc.cm, out, sel.primIndex) : sel
	  }

	  function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
	    var line = getLine(doc, pos.line);
	    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
	      var sp = line.markedSpans[i], m = sp.marker;
	      if ((sp.from == null || (m.inclusiveLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
	          (sp.to == null || (m.inclusiveRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
	        if (mayClear) {
	          signal(m, "beforeCursorEnter");
	          if (m.explicitlyCleared) {
	            if (!line.markedSpans) { break }
	            else {--i; continue}
	          }
	        }
	        if (!m.atomic) { continue }

	        if (oldPos) {
	          var near = m.find(dir < 0 ? 1 : -1), diff = (void 0);
	          if (dir < 0 ? m.inclusiveRight : m.inclusiveLeft)
	            { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null); }
	          if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
	            { return skipAtomicInner(doc, near, pos, dir, mayClear) }
	        }

	        var far = m.find(dir < 0 ? -1 : 1);
	        if (dir < 0 ? m.inclusiveLeft : m.inclusiveRight)
	          { far = movePos(doc, far, dir, far.line == pos.line ? line : null); }
	        return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
	      }
	    } }
	    return pos
	  }

	  // Ensure a given position is not inside an atomic range.
	  function skipAtomic(doc, pos, oldPos, bias, mayClear) {
	    var dir = bias || 1;
	    var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
	        (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
	        skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
	        (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true));
	    if (!found) {
	      doc.cantEdit = true;
	      return Pos(doc.first, 0)
	    }
	    return found
	  }

	  function movePos(doc, pos, dir, line) {
	    if (dir < 0 && pos.ch == 0) {
	      if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
	      else { return null }
	    } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
	      if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
	      else { return null }
	    } else {
	      return new Pos(pos.line, pos.ch + dir)
	    }
	  }

	  function selectAll(cm) {
	    cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
	  }

	  // UPDATING

	  // Allow "beforeChange" event handlers to influence a change
	  function filterChange(doc, change, update) {
	    var obj = {
	      canceled: false,
	      from: change.from,
	      to: change.to,
	      text: change.text,
	      origin: change.origin,
	      cancel: function () { return obj.canceled = true; }
	    };
	    if (update) { obj.update = function (from, to, text, origin) {
	      if (from) { obj.from = clipPos(doc, from); }
	      if (to) { obj.to = clipPos(doc, to); }
	      if (text) { obj.text = text; }
	      if (origin !== undefined) { obj.origin = origin; }
	    }; }
	    signal(doc, "beforeChange", doc, obj);
	    if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj); }

	    if (obj.canceled) {
	      if (doc.cm) { doc.cm.curOp.updateInput = 2; }
	      return null
	    }
	    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
	  }

	  // Apply a change to a document, and add it to the document's
	  // history, and propagating it to all linked documents.
	  function makeChange(doc, change, ignoreReadOnly) {
	    if (doc.cm) {
	      if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
	      if (doc.cm.state.suppressEdits) { return }
	    }

	    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
	      change = filterChange(doc, change, true);
	      if (!change) { return }
	    }

	    // Possibly split or suppress the update based on the presence
	    // of read-only spans in its range.
	    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
	    if (split) {
	      for (var i = split.length - 1; i >= 0; --i)
	        { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}); }
	    } else {
	      makeChangeInner(doc, change);
	    }
	  }

	  function makeChangeInner(doc, change) {
	    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
	    var selAfter = computeSelAfterChange(doc, change);
	    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

	    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
	    var rebased = [];

	    linkedDocs(doc, function (doc, sharedHist) {
	      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
	        rebaseHist(doc.history, change);
	        rebased.push(doc.history);
	      }
	      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
	    });
	  }

	  // Revert a change stored in a document's history.
	  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
	    var suppress = doc.cm && doc.cm.state.suppressEdits;
	    if (suppress && !allowSelectionOnly) { return }

	    var hist = doc.history, event, selAfter = doc.sel;
	    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

	    // Verify that there is a useable event (so that ctrl-z won't
	    // needlessly clear selection events)
	    var i = 0;
	    for (; i < source.length; i++) {
	      event = source[i];
	      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
	        { break }
	    }
	    if (i == source.length) { return }
	    hist.lastOrigin = hist.lastSelOrigin = null;

	    for (;;) {
	      event = source.pop();
	      if (event.ranges) {
	        pushSelectionToHistory(event, dest);
	        if (allowSelectionOnly && !event.equals(doc.sel)) {
	          setSelection(doc, event, {clearRedo: false});
	          return
	        }
	        selAfter = event;
	      } else if (suppress) {
	        source.push(event);
	        return
	      } else { break }
	    }

	    // Build up a reverse change object to add to the opposite history
	    // stack (redo when undoing, and vice versa).
	    var antiChanges = [];
	    pushSelectionToHistory(selAfter, dest);
	    dest.push({changes: antiChanges, generation: hist.generation});
	    hist.generation = event.generation || ++hist.maxGeneration;

	    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

	    var loop = function ( i ) {
	      var change = event.changes[i];
	      change.origin = type;
	      if (filter && !filterChange(doc, change, false)) {
	        source.length = 0;
	        return {}
	      }

	      antiChanges.push(historyChangeFromChange(doc, change));

	      var after = i ? computeSelAfterChange(doc, change) : lst(source);
	      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
	      if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}); }
	      var rebased = [];

	      // Propagate to the linked documents
	      linkedDocs(doc, function (doc, sharedHist) {
	        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
	          rebaseHist(doc.history, change);
	          rebased.push(doc.history);
	        }
	        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
	      });
	    };

	    for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
	      var returned = loop( i$1 );

	      if ( returned ) return returned.v;
	    }
	  }

	  // Sub-views need their line numbers shifted when text is added
	  // above or below them in the parent document.
	  function shiftDoc(doc, distance) {
	    if (distance == 0) { return }
	    doc.first += distance;
	    doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
	      Pos(range.anchor.line + distance, range.anchor.ch),
	      Pos(range.head.line + distance, range.head.ch)
	    ); }), doc.sel.primIndex);
	    if (doc.cm) {
	      regChange(doc.cm, doc.first, doc.first - distance, distance);
	      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
	        { regLineChange(doc.cm, l, "gutter"); }
	    }
	  }

	  // More lower-level change function, handling only a single document
	  // (not linked ones).
	  function makeChangeSingleDoc(doc, change, selAfter, spans) {
	    if (doc.cm && !doc.cm.curOp)
	      { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

	    if (change.to.line < doc.first) {
	      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
	      return
	    }
	    if (change.from.line > doc.lastLine()) { return }

	    // Clip the change to the size of this doc
	    if (change.from.line < doc.first) {
	      var shift = change.text.length - 1 - (doc.first - change.from.line);
	      shiftDoc(doc, shift);
	      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
	                text: [lst(change.text)], origin: change.origin};
	    }
	    var last = doc.lastLine();
	    if (change.to.line > last) {
	      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
	                text: [change.text[0]], origin: change.origin};
	    }

	    change.removed = getBetween(doc, change.from, change.to);

	    if (!selAfter) { selAfter = computeSelAfterChange(doc, change); }
	    if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans); }
	    else { updateDoc(doc, change, spans); }
	    setSelectionNoUndo(doc, selAfter, sel_dontScroll);
	  }

	  // Handle the interaction of a change to a document with the editor
	  // that this document is part of.
	  function makeChangeSingleDocInEditor(cm, change, spans) {
	    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

	    var recomputeMaxLength = false, checkWidthStart = from.line;
	    if (!cm.options.lineWrapping) {
	      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
	      doc.iter(checkWidthStart, to.line + 1, function (line) {
	        if (line == display.maxLine) {
	          recomputeMaxLength = true;
	          return true
	        }
	      });
	    }

	    if (doc.sel.contains(change.from, change.to) > -1)
	      { signalCursorActivity(cm); }

	    updateDoc(doc, change, spans, estimateHeight(cm));

	    if (!cm.options.lineWrapping) {
	      doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
	        var len = lineLength(line);
	        if (len > display.maxLineLength) {
	          display.maxLine = line;
	          display.maxLineLength = len;
	          display.maxLineChanged = true;
	          recomputeMaxLength = false;
	        }
	      });
	      if (recomputeMaxLength) { cm.curOp.updateMaxLine = true; }
	    }

	    retreatFrontier(doc, from.line);
	    startWorker(cm, 400);

	    var lendiff = change.text.length - (to.line - from.line) - 1;
	    // Remember that these lines changed, for updating the display
	    if (change.full)
	      { regChange(cm); }
	    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
	      { regLineChange(cm, from.line, "text"); }
	    else
	      { regChange(cm, from.line, to.line + 1, lendiff); }

	    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
	    if (changeHandler || changesHandler) {
	      var obj = {
	        from: from, to: to,
	        text: change.text,
	        removed: change.removed,
	        origin: change.origin
	      };
	      if (changeHandler) { signalLater(cm, "change", cm, obj); }
	      if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj); }
	    }
	    cm.display.selForContextMenu = null;
	  }

	  function replaceRange(doc, code, from, to, origin) {
	    var assign;

	    if (!to) { to = from; }
	    if (cmp(to, from) < 0) { (assign = [to, from], from = assign[0], to = assign[1]); }
	    if (typeof code == "string") { code = doc.splitLines(code); }
	    makeChange(doc, {from: from, to: to, text: code, origin: origin});
	  }

	  // Rebasing/resetting history to deal with externally-sourced changes

	  function rebaseHistSelSingle(pos, from, to, diff) {
	    if (to < pos.line) {
	      pos.line += diff;
	    } else if (from < pos.line) {
	      pos.line = from;
	      pos.ch = 0;
	    }
	  }

	  // Tries to rebase an array of history events given a change in the
	  // document. If the change touches the same lines as the event, the
	  // event, and everything 'behind' it, is discarded. If the change is
	  // before the event, the event's positions are updated. Uses a
	  // copy-on-write scheme for the positions, to avoid having to
	  // reallocate them all on every rebase, but also avoid problems with
	  // shared position objects being unsafely updated.
	  function rebaseHistArray(array, from, to, diff) {
	    for (var i = 0; i < array.length; ++i) {
	      var sub = array[i], ok = true;
	      if (sub.ranges) {
	        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
	        for (var j = 0; j < sub.ranges.length; j++) {
	          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
	          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
	        }
	        continue
	      }
	      for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
	        var cur = sub.changes[j$1];
	        if (to < cur.from.line) {
	          cur.from = Pos(cur.from.line + diff, cur.from.ch);
	          cur.to = Pos(cur.to.line + diff, cur.to.ch);
	        } else if (from <= cur.to.line) {
	          ok = false;
	          break
	        }
	      }
	      if (!ok) {
	        array.splice(0, i + 1);
	        i = 0;
	      }
	    }
	  }

	  function rebaseHist(hist, change) {
	    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
	    rebaseHistArray(hist.done, from, to, diff);
	    rebaseHistArray(hist.undone, from, to, diff);
	  }

	  // Utility for applying a change to a line by handle or number,
	  // returning the number and optionally registering the line as
	  // changed.
	  function changeLine(doc, handle, changeType, op) {
	    var no = handle, line = handle;
	    if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)); }
	    else { no = lineNo(handle); }
	    if (no == null) { return null }
	    if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType); }
	    return line
	  }

	  // The document is represented as a BTree consisting of leaves, with
	  // chunk of lines in them, and branches, with up to ten leaves or
	  // other branch nodes below them. The top node is always a branch
	  // node, and is the document object itself (meaning it has
	  // additional methods and properties).
	  //
	  // All nodes have parent links. The tree is used both to go from
	  // line numbers to line objects, and to go from objects to numbers.
	  // It also indexes by height, and is used to convert between height
	  // and line object, and to find the total height of the document.
	  //
	  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

	  function LeafChunk(lines) {
	    var this$1 = this;

	    this.lines = lines;
	    this.parent = null;
	    var height = 0;
	    for (var i = 0; i < lines.length; ++i) {
	      lines[i].parent = this$1;
	      height += lines[i].height;
	    }
	    this.height = height;
	  }

	  LeafChunk.prototype = {
	    chunkSize: function() { return this.lines.length },

	    // Remove the n lines at offset 'at'.
	    removeInner: function(at, n) {
	      var this$1 = this;

	      for (var i = at, e = at + n; i < e; ++i) {
	        var line = this$1.lines[i];
	        this$1.height -= line.height;
	        cleanUpLine(line);
	        signalLater(line, "delete");
	      }
	      this.lines.splice(at, n);
	    },

	    // Helper used to collapse a small branch into a single leaf.
	    collapse: function(lines) {
	      lines.push.apply(lines, this.lines);
	    },

	    // Insert the given array of lines at offset 'at', count them as
	    // having the given height.
	    insertInner: function(at, lines, height) {
	      var this$1 = this;

	      this.height += height;
	      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
	      for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1; }
	    },

	    // Used to iterate over a part of the tree.
	    iterN: function(at, n, op) {
	      var this$1 = this;

	      for (var e = at + n; at < e; ++at)
	        { if (op(this$1.lines[at])) { return true } }
	    }
	  };

	  function BranchChunk(children) {
	    var this$1 = this;

	    this.children = children;
	    var size = 0, height = 0;
	    for (var i = 0; i < children.length; ++i) {
	      var ch = children[i];
	      size += ch.chunkSize(); height += ch.height;
	      ch.parent = this$1;
	    }
	    this.size = size;
	    this.height = height;
	    this.parent = null;
	  }

	  BranchChunk.prototype = {
	    chunkSize: function() { return this.size },

	    removeInner: function(at, n) {
	      var this$1 = this;

	      this.size -= n;
	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at < sz) {
	          var rm = Math.min(n, sz - at), oldHeight = child.height;
	          child.removeInner(at, rm);
	          this$1.height -= oldHeight - child.height;
	          if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null; }
	          if ((n -= rm) == 0) { break }
	          at = 0;
	        } else { at -= sz; }
	      }
	      // If the result is smaller than 25 lines, ensure that it is a
	      // single leaf node.
	      if (this.size - n < 25 &&
	          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
	        var lines = [];
	        this.collapse(lines);
	        this.children = [new LeafChunk(lines)];
	        this.children[0].parent = this;
	      }
	    },

	    collapse: function(lines) {
	      var this$1 = this;

	      for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines); }
	    },

	    insertInner: function(at, lines, height) {
	      var this$1 = this;

	      this.size += lines.length;
	      this.height += height;
	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at <= sz) {
	          child.insertInner(at, lines, height);
	          if (child.lines && child.lines.length > 50) {
	            // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
	            // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
	            var remaining = child.lines.length % 25 + 25;
	            for (var pos = remaining; pos < child.lines.length;) {
	              var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
	              child.height -= leaf.height;
	              this$1.children.splice(++i, 0, leaf);
	              leaf.parent = this$1;
	            }
	            child.lines = child.lines.slice(0, remaining);
	            this$1.maybeSpill();
	          }
	          break
	        }
	        at -= sz;
	      }
	    },

	    // When a node has grown, check whether it should be split.
	    maybeSpill: function() {
	      if (this.children.length <= 10) { return }
	      var me = this;
	      do {
	        var spilled = me.children.splice(me.children.length - 5, 5);
	        var sibling = new BranchChunk(spilled);
	        if (!me.parent) { // Become the parent node
	          var copy = new BranchChunk(me.children);
	          copy.parent = me;
	          me.children = [copy, sibling];
	          me = copy;
	       } else {
	          me.size -= sibling.size;
	          me.height -= sibling.height;
	          var myIndex = indexOf(me.parent.children, me);
	          me.parent.children.splice(myIndex + 1, 0, sibling);
	        }
	        sibling.parent = me.parent;
	      } while (me.children.length > 10)
	      me.parent.maybeSpill();
	    },

	    iterN: function(at, n, op) {
	      var this$1 = this;

	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at < sz) {
	          var used = Math.min(n, sz - at);
	          if (child.iterN(at, used, op)) { return true }
	          if ((n -= used) == 0) { break }
	          at = 0;
	        } else { at -= sz; }
	      }
	    }
	  };

	  // Line widgets are block elements displayed above or below a line.

	  var LineWidget = function(doc, node, options) {
	    var this$1 = this;

	    if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
	      { this$1[opt] = options[opt]; } } }
	    this.doc = doc;
	    this.node = node;
	  };

	  LineWidget.prototype.clear = function () {
	      var this$1 = this;

	    var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
	    if (no == null || !ws) { return }
	    for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1); } }
	    if (!ws.length) { line.widgets = null; }
	    var height = widgetHeight(this);
	    updateLineHeight(line, Math.max(0, line.height - height));
	    if (cm) {
	      runInOp(cm, function () {
	        adjustScrollWhenAboveVisible(cm, line, -height);
	        regLineChange(cm, no, "widget");
	      });
	      signalLater(cm, "lineWidgetCleared", cm, this, no);
	    }
	  };

	  LineWidget.prototype.changed = function () {
	      var this$1 = this;

	    var oldH = this.height, cm = this.doc.cm, line = this.line;
	    this.height = null;
	    var diff = widgetHeight(this) - oldH;
	    if (!diff) { return }
	    if (!lineIsHidden(this.doc, line)) { updateLineHeight(line, line.height + diff); }
	    if (cm) {
	      runInOp(cm, function () {
	        cm.curOp.forceUpdate = true;
	        adjustScrollWhenAboveVisible(cm, line, diff);
	        signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
	      });
	    }
	  };
	  eventMixin(LineWidget);

	  function adjustScrollWhenAboveVisible(cm, line, diff) {
	    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
	      { addToScrollTop(cm, diff); }
	  }

	  function addLineWidget(doc, handle, node, options) {
	    var widget = new LineWidget(doc, node, options);
	    var cm = doc.cm;
	    if (cm && widget.noHScroll) { cm.display.alignWidgets = true; }
	    changeLine(doc, handle, "widget", function (line) {
	      var widgets = line.widgets || (line.widgets = []);
	      if (widget.insertAt == null) { widgets.push(widget); }
	      else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget); }
	      widget.line = line;
	      if (cm && !lineIsHidden(doc, line)) {
	        var aboveVisible = heightAtLine(line) < doc.scrollTop;
	        updateLineHeight(line, line.height + widgetHeight(widget));
	        if (aboveVisible) { addToScrollTop(cm, widget.height); }
	        cm.curOp.forceUpdate = true;
	      }
	      return true
	    });
	    if (cm) { signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle)); }
	    return widget
	  }

	  // TEXTMARKERS

	  // Created with markText and setBookmark methods. A TextMarker is a
	  // handle that can be used to clear or find a marked position in the
	  // document. Line objects hold arrays (markedSpans) containing
	  // {from, to, marker} object pointing to such marker objects, and
	  // indicating that such a marker is present on that line. Multiple
	  // lines may point to the same marker when it spans across lines.
	  // The spans will have null for their from/to properties when the
	  // marker continues beyond the start/end of the line. Markers have
	  // links back to the lines they currently touch.

	  // Collapsed markers have unique ids, in order to be able to order
	  // them, which is needed for uniquely determining an outer marker
	  // when they overlap (they may nest, but not partially overlap).
	  var nextMarkerId = 0;

	  var TextMarker = function(doc, type) {
	    this.lines = [];
	    this.type = type;
	    this.doc = doc;
	    this.id = ++nextMarkerId;
	  };

	  // Clear the marker.
	  TextMarker.prototype.clear = function () {
	      var this$1 = this;

	    if (this.explicitlyCleared) { return }
	    var cm = this.doc.cm, withOp = cm && !cm.curOp;
	    if (withOp) { startOperation(cm); }
	    if (hasHandler(this, "clear")) {
	      var found = this.find();
	      if (found) { signalLater(this, "clear", found.from, found.to); }
	    }
	    var min = null, max = null;
	    for (var i = 0; i < this.lines.length; ++i) {
	      var line = this$1.lines[i];
	      var span = getMarkedSpanFor(line.markedSpans, this$1);
	      if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text"); }
	      else if (cm) {
	        if (span.to != null) { max = lineNo(line); }
	        if (span.from != null) { min = lineNo(line); }
	      }
	      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
	      if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
	        { updateLineHeight(line, textHeight(cm.display)); }
	    }
	    if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
	      var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual);
	      if (len > cm.display.maxLineLength) {
	        cm.display.maxLine = visual;
	        cm.display.maxLineLength = len;
	        cm.display.maxLineChanged = true;
	      }
	    } }

	    if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1); }
	    this.lines.length = 0;
	    this.explicitlyCleared = true;
	    if (this.atomic && this.doc.cantEdit) {
	      this.doc.cantEdit = false;
	      if (cm) { reCheckSelection(cm.doc); }
	    }
	    if (cm) { signalLater(cm, "markerCleared", cm, this, min, max); }
	    if (withOp) { endOperation(cm); }
	    if (this.parent) { this.parent.clear(); }
	  };

	  // Find the position of the marker in the document. Returns a {from,
	  // to} object by default. Side can be passed to get a specific side
	  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
	  // Pos objects returned contain a line object, rather than a line
	  // number (used to prevent looking up the same line twice).
	  TextMarker.prototype.find = function (side, lineObj) {
	      var this$1 = this;

	    if (side == null && this.type == "bookmark") { side = 1; }
	    var from, to;
	    for (var i = 0; i < this.lines.length; ++i) {
	      var line = this$1.lines[i];
	      var span = getMarkedSpanFor(line.markedSpans, this$1);
	      if (span.from != null) {
	        from = Pos(lineObj ? line : lineNo(line), span.from);
	        if (side == -1) { return from }
	      }
	      if (span.to != null) {
	        to = Pos(lineObj ? line : lineNo(line), span.to);
	        if (side == 1) { return to }
	      }
	    }
	    return from && {from: from, to: to}
	  };

	  // Signals that the marker's widget changed, and surrounding layout
	  // should be recomputed.
	  TextMarker.prototype.changed = function () {
	      var this$1 = this;

	    var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
	    if (!pos || !cm) { return }
	    runInOp(cm, function () {
	      var line = pos.line, lineN = lineNo(pos.line);
	      var view = findViewForLine(cm, lineN);
	      if (view) {
	        clearLineMeasurementCacheFor(view);
	        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
	      }
	      cm.curOp.updateMaxLine = true;
	      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
	        var oldHeight = widget.height;
	        widget.height = null;
	        var dHeight = widgetHeight(widget) - oldHeight;
	        if (dHeight)
	          { updateLineHeight(line, line.height + dHeight); }
	      }
	      signalLater(cm, "markerChanged", cm, this$1);
	    });
	  };

	  TextMarker.prototype.attachLine = function (line) {
	    if (!this.lines.length && this.doc.cm) {
	      var op = this.doc.cm.curOp;
	      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
	        { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this); }
	    }
	    this.lines.push(line);
	  };

	  TextMarker.prototype.detachLine = function (line) {
	    this.lines.splice(indexOf(this.lines, line), 1);
	    if (!this.lines.length && this.doc.cm) {
	      var op = this.doc.cm.curOp
	      ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
	    }
	  };
	  eventMixin(TextMarker);

	  // Create a marker, wire it up to the right lines, and
	  function markText(doc, from, to, options, type) {
	    // Shared markers (across linked documents) are handled separately
	    // (markTextShared will call out to this again, once per
	    // document).
	    if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
	    // Ensure we are in an operation.
	    if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

	    var marker = new TextMarker(doc, type), diff = cmp(from, to);
	    if (options) { copyObj(options, marker, false); }
	    // Don't connect empty markers unless clearWhenEmpty is false
	    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
	      { return marker }
	    if (marker.replacedWith) {
	      // Showing up as a widget implies collapsed (widget replaces text)
	      marker.collapsed = true;
	      marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
	      if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true"); }
	      if (options.insertLeft) { marker.widgetNode.insertLeft = true; }
	    }
	    if (marker.collapsed) {
	      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
	          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
	        { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
	      seeCollapsedSpans();
	    }

	    if (marker.addToHistory)
	      { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN); }

	    var curLine = from.line, cm = doc.cm, updateMaxLine;
	    doc.iter(curLine, to.line + 1, function (line) {
	      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
	        { updateMaxLine = true; }
	      if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0); }
	      addMarkedSpan(line, new MarkedSpan(marker,
	                                         curLine == from.line ? from.ch : null,
	                                         curLine == to.line ? to.ch : null));
	      ++curLine;
	    });
	    // lineIsHidden depends on the presence of the spans, so needs a second pass
	    if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
	      if (lineIsHidden(doc, line)) { updateLineHeight(line, 0); }
	    }); }

	    if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }); }

	    if (marker.readOnly) {
	      seeReadOnlySpans();
	      if (doc.history.done.length || doc.history.undone.length)
	        { doc.clearHistory(); }
	    }
	    if (marker.collapsed) {
	      marker.id = ++nextMarkerId;
	      marker.atomic = true;
	    }
	    if (cm) {
	      // Sync editor state
	      if (updateMaxLine) { cm.curOp.updateMaxLine = true; }
	      if (marker.collapsed)
	        { regChange(cm, from.line, to.line + 1); }
	      else if (marker.className || marker.startStyle || marker.endStyle || marker.css ||
	               marker.attributes || marker.title)
	        { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text"); } }
	      if (marker.atomic) { reCheckSelection(cm.doc); }
	      signalLater(cm, "markerAdded", cm, marker);
	    }
	    return marker
	  }

	  // SHARED TEXTMARKERS

	  // A shared marker spans multiple linked documents. It is
	  // implemented as a meta-marker-object controlling multiple normal
	  // markers.
	  var SharedTextMarker = function(markers, primary) {
	    var this$1 = this;

	    this.markers = markers;
	    this.primary = primary;
	    for (var i = 0; i < markers.length; ++i)
	      { markers[i].parent = this$1; }
	  };

	  SharedTextMarker.prototype.clear = function () {
	      var this$1 = this;

	    if (this.explicitlyCleared) { return }
	    this.explicitlyCleared = true;
	    for (var i = 0; i < this.markers.length; ++i)
	      { this$1.markers[i].clear(); }
	    signalLater(this, "clear");
	  };

	  SharedTextMarker.prototype.find = function (side, lineObj) {
	    return this.primary.find(side, lineObj)
	  };
	  eventMixin(SharedTextMarker);

	  function markTextShared(doc, from, to, options, type) {
	    options = copyObj(options);
	    options.shared = false;
	    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
	    var widget = options.widgetNode;
	    linkedDocs(doc, function (doc) {
	      if (widget) { options.widgetNode = widget.cloneNode(true); }
	      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
	      for (var i = 0; i < doc.linked.length; ++i)
	        { if (doc.linked[i].isParent) { return } }
	      primary = lst(markers);
	    });
	    return new SharedTextMarker(markers, primary)
	  }

	  function findSharedMarkers(doc) {
	    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
	  }

	  function copySharedMarkers(doc, markers) {
	    for (var i = 0; i < markers.length; i++) {
	      var marker = markers[i], pos = marker.find();
	      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
	      if (cmp(mFrom, mTo)) {
	        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
	        marker.markers.push(subMark);
	        subMark.parent = marker;
	      }
	    }
	  }

	  function detachSharedMarkers(markers) {
	    var loop = function ( i ) {
	      var marker = markers[i], linked = [marker.primary.doc];
	      linkedDocs(marker.primary.doc, function (d) { return linked.push(d); });
	      for (var j = 0; j < marker.markers.length; j++) {
	        var subMarker = marker.markers[j];
	        if (indexOf(linked, subMarker.doc) == -1) {
	          subMarker.parent = null;
	          marker.markers.splice(j--, 1);
	        }
	      }
	    };

	    for (var i = 0; i < markers.length; i++) loop( i );
	  }

	  var nextDocId = 0;
	  var Doc = function(text, mode, firstLine, lineSep, direction) {
	    if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
	    if (firstLine == null) { firstLine = 0; }

	    BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
	    this.first = firstLine;
	    this.scrollTop = this.scrollLeft = 0;
	    this.cantEdit = false;
	    this.cleanGeneration = 1;
	    this.modeFrontier = this.highlightFrontier = firstLine;
	    var start = Pos(firstLine, 0);
	    this.sel = simpleSelection(start);
	    this.history = new History(null);
	    this.id = ++nextDocId;
	    this.modeOption = mode;
	    this.lineSep = lineSep;
	    this.direction = (direction == "rtl") ? "rtl" : "ltr";
	    this.extend = false;

	    if (typeof text == "string") { text = this.splitLines(text); }
	    updateDoc(this, {from: start, to: start, text: text});
	    setSelection(this, simpleSelection(start), sel_dontScroll);
	  };

	  Doc.prototype = createObj(BranchChunk.prototype, {
	    constructor: Doc,
	    // Iterate over the document. Supports two forms -- with only one
	    // argument, it calls that for each line in the document. With
	    // three, it iterates over the range given by the first two (with
	    // the second being non-inclusive).
	    iter: function(from, to, op) {
	      if (op) { this.iterN(from - this.first, to - from, op); }
	      else { this.iterN(this.first, this.first + this.size, from); }
	    },

	    // Non-public interface for adding and removing lines.
	    insert: function(at, lines) {
	      var height = 0;
	      for (var i = 0; i < lines.length; ++i) { height += lines[i].height; }
	      this.insertInner(at - this.first, lines, height);
	    },
	    remove: function(at, n) { this.removeInner(at - this.first, n); },

	    // From here, the methods are part of the public interface. Most
	    // are also available from CodeMirror (editor) instances.

	    getValue: function(lineSep) {
	      var lines = getLines(this, this.first, this.first + this.size);
	      if (lineSep === false) { return lines }
	      return lines.join(lineSep || this.lineSeparator())
	    },
	    setValue: docMethodOp(function(code) {
	      var top = Pos(this.first, 0), last = this.first + this.size - 1;
	      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
	                        text: this.splitLines(code), origin: "setValue", full: true}, true);
	      if (this.cm) { scrollToCoords(this.cm, 0, 0); }
	      setSelection(this, simpleSelection(top), sel_dontScroll);
	    }),
	    replaceRange: function(code, from, to, origin) {
	      from = clipPos(this, from);
	      to = to ? clipPos(this, to) : from;
	      replaceRange(this, code, from, to, origin);
	    },
	    getRange: function(from, to, lineSep) {
	      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
	      if (lineSep === false) { return lines }
	      return lines.join(lineSep || this.lineSeparator())
	    },

	    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

	    getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
	    getLineNumber: function(line) {return lineNo(line)},

	    getLineHandleVisualStart: function(line) {
	      if (typeof line == "number") { line = getLine(this, line); }
	      return visualLine(line)
	    },

	    lineCount: function() {return this.size},
	    firstLine: function() {return this.first},
	    lastLine: function() {return this.first + this.size - 1},

	    clipPos: function(pos) {return clipPos(this, pos)},

	    getCursor: function(start) {
	      var range$$1 = this.sel.primary(), pos;
	      if (start == null || start == "head") { pos = range$$1.head; }
	      else if (start == "anchor") { pos = range$$1.anchor; }
	      else if (start == "end" || start == "to" || start === false) { pos = range$$1.to(); }
	      else { pos = range$$1.from(); }
	      return pos
	    },
	    listSelections: function() { return this.sel.ranges },
	    somethingSelected: function() {return this.sel.somethingSelected()},

	    setCursor: docMethodOp(function(line, ch, options) {
	      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
	    }),
	    setSelection: docMethodOp(function(anchor, head, options) {
	      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
	    }),
	    extendSelection: docMethodOp(function(head, other, options) {
	      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
	    }),
	    extendSelections: docMethodOp(function(heads, options) {
	      extendSelections(this, clipPosArray(this, heads), options);
	    }),
	    extendSelectionsBy: docMethodOp(function(f, options) {
	      var heads = map(this.sel.ranges, f);
	      extendSelections(this, clipPosArray(this, heads), options);
	    }),
	    setSelections: docMethodOp(function(ranges, primary, options) {
	      var this$1 = this;

	      if (!ranges.length) { return }
	      var out = [];
	      for (var i = 0; i < ranges.length; i++)
	        { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
	                           clipPos(this$1, ranges[i].head)); }
	      if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex); }
	      setSelection(this, normalizeSelection(this.cm, out, primary), options);
	    }),
	    addSelection: docMethodOp(function(anchor, head, options) {
	      var ranges = this.sel.ranges.slice(0);
	      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
	      setSelection(this, normalizeSelection(this.cm, ranges, ranges.length - 1), options);
	    }),

	    getSelection: function(lineSep) {
	      var this$1 = this;

	      var ranges = this.sel.ranges, lines;
	      for (var i = 0; i < ranges.length; i++) {
	        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
	        lines = lines ? lines.concat(sel) : sel;
	      }
	      if (lineSep === false) { return lines }
	      else { return lines.join(lineSep || this.lineSeparator()) }
	    },
	    getSelections: function(lineSep) {
	      var this$1 = this;

	      var parts = [], ranges = this.sel.ranges;
	      for (var i = 0; i < ranges.length; i++) {
	        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
	        if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()); }
	        parts[i] = sel;
	      }
	      return parts
	    },
	    replaceSelection: function(code, collapse, origin) {
	      var dup = [];
	      for (var i = 0; i < this.sel.ranges.length; i++)
	        { dup[i] = code; }
	      this.replaceSelections(dup, collapse, origin || "+input");
	    },
	    replaceSelections: docMethodOp(function(code, collapse, origin) {
	      var this$1 = this;

	      var changes = [], sel = this.sel;
	      for (var i = 0; i < sel.ranges.length; i++) {
	        var range$$1 = sel.ranges[i];
	        changes[i] = {from: range$$1.from(), to: range$$1.to(), text: this$1.splitLines(code[i]), origin: origin};
	      }
	      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
	      for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
	        { makeChange(this$1, changes[i$1]); }
	      if (newSel) { setSelectionReplaceHistory(this, newSel); }
	      else if (this.cm) { ensureCursorVisible(this.cm); }
	    }),
	    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
	    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
	    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
	    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

	    setExtending: function(val) {this.extend = val;},
	    getExtending: function() {return this.extend},

	    historySize: function() {
	      var hist = this.history, done = 0, undone = 0;
	      for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done; } }
	      for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone; } }
	      return {undo: done, redo: undone}
	    },
	    clearHistory: function() {this.history = new History(this.history.maxGeneration);},

	    markClean: function() {
	      this.cleanGeneration = this.changeGeneration(true);
	    },
	    changeGeneration: function(forceSplit) {
	      if (forceSplit)
	        { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null; }
	      return this.history.generation
	    },
	    isClean: function (gen) {
	      return this.history.generation == (gen || this.cleanGeneration)
	    },

	    getHistory: function() {
	      return {done: copyHistoryArray(this.history.done),
	              undone: copyHistoryArray(this.history.undone)}
	    },
	    setHistory: function(histData) {
	      var hist = this.history = new History(this.history.maxGeneration);
	      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
	      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
	    },

	    setGutterMarker: docMethodOp(function(line, gutterID, value) {
	      return changeLine(this, line, "gutter", function (line) {
	        var markers = line.gutterMarkers || (line.gutterMarkers = {});
	        markers[gutterID] = value;
	        if (!value && isEmpty(markers)) { line.gutterMarkers = null; }
	        return true
	      })
	    }),

	    clearGutter: docMethodOp(function(gutterID) {
	      var this$1 = this;

	      this.iter(function (line) {
	        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
	          changeLine(this$1, line, "gutter", function () {
	            line.gutterMarkers[gutterID] = null;
	            if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null; }
	            return true
	          });
	        }
	      });
	    }),

	    lineInfo: function(line) {
	      var n;
	      if (typeof line == "number") {
	        if (!isLine(this, line)) { return null }
	        n = line;
	        line = getLine(this, line);
	        if (!line) { return null }
	      } else {
	        n = lineNo(line);
	        if (n == null) { return null }
	      }
	      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
	              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
	              widgets: line.widgets}
	    },

	    addLineClass: docMethodOp(function(handle, where, cls) {
	      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
	        var prop = where == "text" ? "textClass"
	                 : where == "background" ? "bgClass"
	                 : where == "gutter" ? "gutterClass" : "wrapClass";
	        if (!line[prop]) { line[prop] = cls; }
	        else if (classTest(cls).test(line[prop])) { return false }
	        else { line[prop] += " " + cls; }
	        return true
	      })
	    }),
	    removeLineClass: docMethodOp(function(handle, where, cls) {
	      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
	        var prop = where == "text" ? "textClass"
	                 : where == "background" ? "bgClass"
	                 : where == "gutter" ? "gutterClass" : "wrapClass";
	        var cur = line[prop];
	        if (!cur) { return false }
	        else if (cls == null) { line[prop] = null; }
	        else {
	          var found = cur.match(classTest(cls));
	          if (!found) { return false }
	          var end = found.index + found[0].length;
	          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
	        }
	        return true
	      })
	    }),

	    addLineWidget: docMethodOp(function(handle, node, options) {
	      return addLineWidget(this, handle, node, options)
	    }),
	    removeLineWidget: function(widget) { widget.clear(); },

	    markText: function(from, to, options) {
	      return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
	    },
	    setBookmark: function(pos, options) {
	      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
	                      insertLeft: options && options.insertLeft,
	                      clearWhenEmpty: false, shared: options && options.shared,
	                      handleMouseEvents: options && options.handleMouseEvents};
	      pos = clipPos(this, pos);
	      return markText(this, pos, pos, realOpts, "bookmark")
	    },
	    findMarksAt: function(pos) {
	      pos = clipPos(this, pos);
	      var markers = [], spans = getLine(this, pos.line).markedSpans;
	      if (spans) { for (var i = 0; i < spans.length; ++i) {
	        var span = spans[i];
	        if ((span.from == null || span.from <= pos.ch) &&
	            (span.to == null || span.to >= pos.ch))
	          { markers.push(span.marker.parent || span.marker); }
	      } }
	      return markers
	    },
	    findMarks: function(from, to, filter) {
	      from = clipPos(this, from); to = clipPos(this, to);
	      var found = [], lineNo$$1 = from.line;
	      this.iter(from.line, to.line + 1, function (line) {
	        var spans = line.markedSpans;
	        if (spans) { for (var i = 0; i < spans.length; i++) {
	          var span = spans[i];
	          if (!(span.to != null && lineNo$$1 == from.line && from.ch >= span.to ||
	                span.from == null && lineNo$$1 != from.line ||
	                span.from != null && lineNo$$1 == to.line && span.from >= to.ch) &&
	              (!filter || filter(span.marker)))
	            { found.push(span.marker.parent || span.marker); }
	        } }
	        ++lineNo$$1;
	      });
	      return found
	    },
	    getAllMarks: function() {
	      var markers = [];
	      this.iter(function (line) {
	        var sps = line.markedSpans;
	        if (sps) { for (var i = 0; i < sps.length; ++i)
	          { if (sps[i].from != null) { markers.push(sps[i].marker); } } }
	      });
	      return markers
	    },

	    posFromIndex: function(off) {
	      var ch, lineNo$$1 = this.first, sepSize = this.lineSeparator().length;
	      this.iter(function (line) {
	        var sz = line.text.length + sepSize;
	        if (sz > off) { ch = off; return true }
	        off -= sz;
	        ++lineNo$$1;
	      });
	      return clipPos(this, Pos(lineNo$$1, ch))
	    },
	    indexFromPos: function (coords) {
	      coords = clipPos(this, coords);
	      var index = coords.ch;
	      if (coords.line < this.first || coords.ch < 0) { return 0 }
	      var sepSize = this.lineSeparator().length;
	      this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
	        index += line.text.length + sepSize;
	      });
	      return index
	    },

	    copy: function(copyHistory) {
	      var doc = new Doc(getLines(this, this.first, this.first + this.size),
	                        this.modeOption, this.first, this.lineSep, this.direction);
	      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
	      doc.sel = this.sel;
	      doc.extend = false;
	      if (copyHistory) {
	        doc.history.undoDepth = this.history.undoDepth;
	        doc.setHistory(this.getHistory());
	      }
	      return doc
	    },

	    linkedDoc: function(options) {
	      if (!options) { options = {}; }
	      var from = this.first, to = this.first + this.size;
	      if (options.from != null && options.from > from) { from = options.from; }
	      if (options.to != null && options.to < to) { to = options.to; }
	      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
	      if (options.sharedHist) { copy.history = this.history
	      ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
	      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
	      copySharedMarkers(copy, findSharedMarkers(this));
	      return copy
	    },
	    unlinkDoc: function(other) {
	      var this$1 = this;

	      if (other instanceof CodeMirror) { other = other.doc; }
	      if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
	        var link = this$1.linked[i];
	        if (link.doc != other) { continue }
	        this$1.linked.splice(i, 1);
	        other.unlinkDoc(this$1);
	        detachSharedMarkers(findSharedMarkers(this$1));
	        break
	      } }
	      // If the histories were shared, split them again
	      if (other.history == this.history) {
	        var splitIds = [other.id];
	        linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true);
	        other.history = new History(null);
	        other.history.done = copyHistoryArray(this.history.done, splitIds);
	        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
	      }
	    },
	    iterLinkedDocs: function(f) {linkedDocs(this, f);},

	    getMode: function() {return this.mode},
	    getEditor: function() {return this.cm},

	    splitLines: function(str) {
	      if (this.lineSep) { return str.split(this.lineSep) }
	      return splitLinesAuto(str)
	    },
	    lineSeparator: function() { return this.lineSep || "\n" },

	    setDirection: docMethodOp(function (dir) {
	      if (dir != "rtl") { dir = "ltr"; }
	      if (dir == this.direction) { return }
	      this.direction = dir;
	      this.iter(function (line) { return line.order = null; });
	      if (this.cm) { directionChanged(this.cm); }
	    })
	  });

	  // Public alias.
	  Doc.prototype.eachLine = Doc.prototype.iter;

	  // Kludge to work around strange IE behavior where it'll sometimes
	  // re-fire a series of drag-related events right after the drop (#1551)
	  var lastDrop = 0;

	  function onDrop(e) {
	    var cm = this;
	    clearDragCursor(cm);
	    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
	      { return }
	    e_preventDefault(e);
	    if (ie) { lastDrop = +new Date; }
	    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
	    if (!pos || cm.isReadOnly()) { return }
	    // Might be a file drop, in which case we simply extract the text
	    // and insert it.
	    if (files && files.length && window.FileReader && window.File) {
	      var n = files.length, text = Array(n), read = 0;
	      var loadFile = function (file, i) {
	        if (cm.options.allowDropFileTypes &&
	            indexOf(cm.options.allowDropFileTypes, file.type) == -1)
	          { return }

	        var reader = new FileReader;
	        reader.onload = operation(cm, function () {
	          var content = reader.result;
	          if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = ""; }
	          text[i] = content;
	          if (++read == n) {
	            pos = clipPos(cm.doc, pos);
	            var change = {from: pos, to: pos,
	                          text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
	                          origin: "paste"};
	            makeChange(cm.doc, change);
	            setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
	          }
	        });
	        reader.readAsText(file);
	      };
	      for (var i = 0; i < n; ++i) { loadFile(files[i], i); }
	    } else { // Normal drop
	      // Don't do a replace if the drop happened inside of the selected text.
	      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
	        cm.state.draggingText(e);
	        // Ensure the editor is re-focused
	        setTimeout(function () { return cm.display.input.focus(); }, 20);
	        return
	      }
	      try {
	        var text$1 = e.dataTransfer.getData("Text");
	        if (text$1) {
	          var selected;
	          if (cm.state.draggingText && !cm.state.draggingText.copy)
	            { selected = cm.listSelections(); }
	          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
	          if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
	            { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag"); } }
	          cm.replaceSelection(text$1, "around", "paste");
	          cm.display.input.focus();
	        }
	      }
	      catch(e){}
	    }
	  }

	  function onDragStart(cm, e) {
	    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
	    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

	    e.dataTransfer.setData("Text", cm.getSelection());
	    e.dataTransfer.effectAllowed = "copyMove";

	    // Use dummy image instead of default browsers image.
	    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
	    if (e.dataTransfer.setDragImage && !safari) {
	      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
	      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
	      if (presto) {
	        img.width = img.height = 1;
	        cm.display.wrapper.appendChild(img);
	        // Force a relayout, or Opera won't use our image for some obscure reason
	        img._top = img.offsetTop;
	      }
	      e.dataTransfer.setDragImage(img, 0, 0);
	      if (presto) { img.parentNode.removeChild(img); }
	    }
	  }

	  function onDragOver(cm, e) {
	    var pos = posFromMouse(cm, e);
	    if (!pos) { return }
	    var frag = document.createDocumentFragment();
	    drawSelectionCursor(cm, pos, frag);
	    if (!cm.display.dragCursor) {
	      cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
	      cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
	    }
	    removeChildrenAndAdd(cm.display.dragCursor, frag);
	  }

	  function clearDragCursor(cm) {
	    if (cm.display.dragCursor) {
	      cm.display.lineSpace.removeChild(cm.display.dragCursor);
	      cm.display.dragCursor = null;
	    }
	  }

	  // These must be handled carefully, because naively registering a
	  // handler for each editor will cause the editors to never be
	  // garbage collected.

	  function forEachCodeMirror(f) {
	    if (!document.getElementsByClassName) { return }
	    var byClass = document.getElementsByClassName("CodeMirror"), editors = [];
	    for (var i = 0; i < byClass.length; i++) {
	      var cm = byClass[i].CodeMirror;
	      if (cm) { editors.push(cm); }
	    }
	    if (editors.length) { editors[0].operation(function () {
	      for (var i = 0; i < editors.length; i++) { f(editors[i]); }
	    }); }
	  }

	  var globalsRegistered = false;
	  function ensureGlobalHandlers() {
	    if (globalsRegistered) { return }
	    registerGlobalHandlers();
	    globalsRegistered = true;
	  }
	  function registerGlobalHandlers() {
	    // When the window resizes, we need to refresh active editors.
	    var resizeTimer;
	    on(window, "resize", function () {
	      if (resizeTimer == null) { resizeTimer = setTimeout(function () {
	        resizeTimer = null;
	        forEachCodeMirror(onResize);
	      }, 100); }
	    });
	    // When the window loses focus, we want to show the editor as blurred
	    on(window, "blur", function () { return forEachCodeMirror(onBlur); });
	  }
	  // Called when the window resizes
	  function onResize(cm) {
	    var d = cm.display;
	    // Might be a text scaling operation, clear size caches.
	    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
	    d.scrollbarsClipped = false;
	    cm.setSize();
	  }

	  var keyNames = {
	    3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
	    19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
	    36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
	    46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
	    106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete", 145: "ScrollLock",
	    173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
	    221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
	    63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
	  };

	  // Number keys
	  for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i); }
	  // Alphabetic keys
	  for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1); }
	  // Function keys
	  for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2; }

	  var keyMap = {};

	  keyMap.basic = {
	    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
	    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
	    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
	    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
	    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
	    "Esc": "singleSelection"
	  };
	  // Note that the save and find-related commands aren't defined by
	  // default. User code or addons can define them. Unknown commands
	  // are simply ignored.
	  keyMap.pcDefault = {
	    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
	    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
	    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
	    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
	    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
	    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
	    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
	    "fallthrough": "basic"
	  };
	  // Very basic readline/emacs-style bindings, which are standard on Mac.
	  keyMap.emacsy = {
	    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
	    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
	    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
	    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
	    "Ctrl-O": "openLine"
	  };
	  keyMap.macDefault = {
	    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
	    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
	    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
	    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
	    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
	    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
	    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
	    "fallthrough": ["basic", "emacsy"]
	  };
	  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

	  // KEYMAP DISPATCH

	  function normalizeKeyName(name) {
	    var parts = name.split(/-(?!$)/);
	    name = parts[parts.length - 1];
	    var alt, ctrl, shift, cmd;
	    for (var i = 0; i < parts.length - 1; i++) {
	      var mod = parts[i];
	      if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; }
	      else if (/^a(lt)?$/i.test(mod)) { alt = true; }
	      else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; }
	      else if (/^s(hift)?$/i.test(mod)) { shift = true; }
	      else { throw new Error("Unrecognized modifier name: " + mod) }
	    }
	    if (alt) { name = "Alt-" + name; }
	    if (ctrl) { name = "Ctrl-" + name; }
	    if (cmd) { name = "Cmd-" + name; }
	    if (shift) { name = "Shift-" + name; }
	    return name
	  }

	  // This is a kludge to keep keymaps mostly working as raw objects
	  // (backwards compatibility) while at the same time support features
	  // like normalization and multi-stroke key bindings. It compiles a
	  // new normalized keymap, and then updates the old object to reflect
	  // this.
	  function normalizeKeyMap(keymap) {
	    var copy = {};
	    for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
	      var value = keymap[keyname];
	      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
	      if (value == "...") { delete keymap[keyname]; continue }

	      var keys = map(keyname.split(" "), normalizeKeyName);
	      for (var i = 0; i < keys.length; i++) {
	        var val = (void 0), name = (void 0);
	        if (i == keys.length - 1) {
	          name = keys.join(" ");
	          val = value;
	        } else {
	          name = keys.slice(0, i + 1).join(" ");
	          val = "...";
	        }
	        var prev = copy[name];
	        if (!prev) { copy[name] = val; }
	        else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
	      }
	      delete keymap[keyname];
	    } }
	    for (var prop in copy) { keymap[prop] = copy[prop]; }
	    return keymap
	  }

	  function lookupKey(key, map$$1, handle, context) {
	    map$$1 = getKeyMap(map$$1);
	    var found = map$$1.call ? map$$1.call(key, context) : map$$1[key];
	    if (found === false) { return "nothing" }
	    if (found === "...") { return "multi" }
	    if (found != null && handle(found)) { return "handled" }

	    if (map$$1.fallthrough) {
	      if (Object.prototype.toString.call(map$$1.fallthrough) != "[object Array]")
	        { return lookupKey(key, map$$1.fallthrough, handle, context) }
	      for (var i = 0; i < map$$1.fallthrough.length; i++) {
	        var result = lookupKey(key, map$$1.fallthrough[i], handle, context);
	        if (result) { return result }
	      }
	    }
	  }

	  // Modifier key presses don't count as 'real' key presses for the
	  // purpose of keymap fallthrough.
	  function isModifierKey(value) {
	    var name = typeof value == "string" ? value : keyNames[value.keyCode];
	    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
	  }

	  function addModifierNames(name, event, noShift) {
	    var base = name;
	    if (event.altKey && base != "Alt") { name = "Alt-" + name; }
	    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name; }
	    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name; }
	    if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name; }
	    return name
	  }

	  // Look up the name of a key as indicated by an event object.
	  function keyName(event, noShift) {
	    if (presto && event.keyCode == 34 && event["char"]) { return false }
	    var name = keyNames[event.keyCode];
	    if (name == null || event.altGraphKey) { return false }
	    // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
	    // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
	    if (event.keyCode == 3 && event.code) { name = event.code; }
	    return addModifierNames(name, event, noShift)
	  }

	  function getKeyMap(val) {
	    return typeof val == "string" ? keyMap[val] : val
	  }

	  // Helper for deleting text near the selection(s), used to implement
	  // backspace, delete, and similar functionality.
	  function deleteNearSelection(cm, compute) {
	    var ranges = cm.doc.sel.ranges, kill = [];
	    // Build up a set of ranges to kill first, merging overlapping
	    // ranges.
	    for (var i = 0; i < ranges.length; i++) {
	      var toKill = compute(ranges[i]);
	      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
	        var replaced = kill.pop();
	        if (cmp(replaced.from, toKill.from) < 0) {
	          toKill.from = replaced.from;
	          break
	        }
	      }
	      kill.push(toKill);
	    }
	    // Next, remove those actual ranges.
	    runInOp(cm, function () {
	      for (var i = kill.length - 1; i >= 0; i--)
	        { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete"); }
	      ensureCursorVisible(cm);
	    });
	  }

	  function moveCharLogically(line, ch, dir) {
	    var target = skipExtendingChars(line.text, ch + dir, dir);
	    return target < 0 || target > line.text.length ? null : target
	  }

	  function moveLogically(line, start, dir) {
	    var ch = moveCharLogically(line, start.ch, dir);
	    return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
	  }

	  function endOfLine(visually, cm, lineObj, lineNo, dir) {
	    if (visually) {
	      var order = getOrder(lineObj, cm.doc.direction);
	      if (order) {
	        var part = dir < 0 ? lst(order) : order[0];
	        var moveInStorageOrder = (dir < 0) == (part.level == 1);
	        var sticky = moveInStorageOrder ? "after" : "before";
	        var ch;
	        // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
	        // it could be that the last bidi part is not on the last visual line,
	        // since visual lines contain content order-consecutive chunks.
	        // Thus, in rtl, we are looking for the first (content-order) character
	        // in the rtl chunk that is on the last line (that is, the same line
	        // as the last (content-order) character).
	        if (part.level > 0 || cm.doc.direction == "rtl") {
	          var prep = prepareMeasureForLine(cm, lineObj);
	          ch = dir < 0 ? lineObj.text.length - 1 : 0;
	          var targetTop = measureCharPrepared(cm, prep, ch).top;
	          ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
	          if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1); }
	        } else { ch = dir < 0 ? part.to : part.from; }
	        return new Pos(lineNo, ch, sticky)
	      }
	    }
	    return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
	  }

	  function moveVisually(cm, line, start, dir) {
	    var bidi = getOrder(line, cm.doc.direction);
	    if (!bidi) { return moveLogically(line, start, dir) }
	    if (start.ch >= line.text.length) {
	      start.ch = line.text.length;
	      start.sticky = "before";
	    } else if (start.ch <= 0) {
	      start.ch = 0;
	      start.sticky = "after";
	    }
	    var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos];
	    if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
	      // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
	      // nothing interesting happens.
	      return moveLogically(line, start, dir)
	    }

	    var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); };
	    var prep;
	    var getWrappedLineExtent = function (ch) {
	      if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
	      prep = prep || prepareMeasureForLine(cm, line);
	      return wrappedLineExtentChar(cm, line, prep, ch)
	    };
	    var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

	    if (cm.doc.direction == "rtl" || part.level == 1) {
	      var moveInStorageOrder = (part.level == 1) == (dir < 0);
	      var ch = mv(start, moveInStorageOrder ? 1 : -1);
	      if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
	        // Case 2: We move within an rtl part or in an rtl editor on the same visual line
	        var sticky = moveInStorageOrder ? "before" : "after";
	        return new Pos(start.line, ch, sticky)
	      }
	    }

	    // Case 3: Could not move within this bidi part in this visual line, so leave
	    // the current bidi part

	    var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
	      var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
	        ? new Pos(start.line, mv(ch, 1), "before")
	        : new Pos(start.line, ch, "after"); };

	      for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
	        var part = bidi[partPos];
	        var moveInStorageOrder = (dir > 0) == (part.level != 1);
	        var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
	        if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
	        ch = moveInStorageOrder ? part.from : mv(part.to, -1);
	        if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
	      }
	    };

	    // Case 3a: Look for other bidi parts on the same visual line
	    var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
	    if (res) { return res }

	    // Case 3b: Look for other bidi parts on the next visual line
	    var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
	    if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
	      res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
	      if (res) { return res }
	    }

	    // Case 4: Nowhere to move
	    return null
	  }

	  // Commands are parameter-less actions that can be performed on an
	  // editor, mostly used for keybindings.
	  var commands = {
	    selectAll: selectAll,
	    singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
	    killLine: function (cm) { return deleteNearSelection(cm, function (range) {
	      if (range.empty()) {
	        var len = getLine(cm.doc, range.head.line).text.length;
	        if (range.head.ch == len && range.head.line < cm.lastLine())
	          { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
	        else
	          { return {from: range.head, to: Pos(range.head.line, len)} }
	      } else {
	        return {from: range.from(), to: range.to()}
	      }
	    }); },
	    deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
	      from: Pos(range.from().line, 0),
	      to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
	    }); }); },
	    delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
	      from: Pos(range.from().line, 0), to: range.from()
	    }); }); },
	    delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
	      var top = cm.charCoords(range.head, "div").top + 5;
	      var leftPos = cm.coordsChar({left: 0, top: top}, "div");
	      return {from: leftPos, to: range.from()}
	    }); },
	    delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
	      var top = cm.charCoords(range.head, "div").top + 5;
	      var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
	      return {from: range.from(), to: rightPos }
	    }); },
	    undo: function (cm) { return cm.undo(); },
	    redo: function (cm) { return cm.redo(); },
	    undoSelection: function (cm) { return cm.undoSelection(); },
	    redoSelection: function (cm) { return cm.redoSelection(); },
	    goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
	    goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
	    goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
	      {origin: "+move", bias: 1}
	    ); },
	    goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
	      {origin: "+move", bias: 1}
	    ); },
	    goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
	      {origin: "+move", bias: -1}
	    ); },
	    goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
	    }, sel_move); },
	    goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      return cm.coordsChar({left: 0, top: top}, "div")
	    }, sel_move); },
	    goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      var pos = cm.coordsChar({left: 0, top: top}, "div");
	      if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
	      return pos
	    }, sel_move); },
	    goLineUp: function (cm) { return cm.moveV(-1, "line"); },
	    goLineDown: function (cm) { return cm.moveV(1, "line"); },
	    goPageUp: function (cm) { return cm.moveV(-1, "page"); },
	    goPageDown: function (cm) { return cm.moveV(1, "page"); },
	    goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
	    goCharRight: function (cm) { return cm.moveH(1, "char"); },
	    goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
	    goColumnRight: function (cm) { return cm.moveH(1, "column"); },
	    goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
	    goGroupRight: function (cm) { return cm.moveH(1, "group"); },
	    goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
	    goWordRight: function (cm) { return cm.moveH(1, "word"); },
	    delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
	    delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
	    delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
	    delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
	    delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
	    delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
	    indentAuto: function (cm) { return cm.indentSelection("smart"); },
	    indentMore: function (cm) { return cm.indentSelection("add"); },
	    indentLess: function (cm) { return cm.indentSelection("subtract"); },
	    insertTab: function (cm) { return cm.replaceSelection("\t"); },
	    insertSoftTab: function (cm) {
	      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
	      for (var i = 0; i < ranges.length; i++) {
	        var pos = ranges[i].from();
	        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
	        spaces.push(spaceStr(tabSize - col % tabSize));
	      }
	      cm.replaceSelections(spaces);
	    },
	    defaultTab: function (cm) {
	      if (cm.somethingSelected()) { cm.indentSelection("add"); }
	      else { cm.execCommand("insertTab"); }
	    },
	    // Swap the two chars left and right of each selection's head.
	    // Move cursor behind the two swapped characters afterwards.
	    //
	    // Doesn't consider line feeds a character.
	    // Doesn't scan more than one line above to find a character.
	    // Doesn't do anything on an empty line.
	    // Doesn't do anything with non-empty selections.
	    transposeChars: function (cm) { return runInOp(cm, function () {
	      var ranges = cm.listSelections(), newSel = [];
	      for (var i = 0; i < ranges.length; i++) {
	        if (!ranges[i].empty()) { continue }
	        var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
	        if (line) {
	          if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1); }
	          if (cur.ch > 0) {
	            cur = new Pos(cur.line, cur.ch + 1);
	            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
	                            Pos(cur.line, cur.ch - 2), cur, "+transpose");
	          } else if (cur.line > cm.doc.first) {
	            var prev = getLine(cm.doc, cur.line - 1).text;
	            if (prev) {
	              cur = new Pos(cur.line, 1);
	              cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
	                              prev.charAt(prev.length - 1),
	                              Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
	            }
	          }
	        }
	        newSel.push(new Range(cur, cur));
	      }
	      cm.setSelections(newSel);
	    }); },
	    newlineAndIndent: function (cm) { return runInOp(cm, function () {
	      var sels = cm.listSelections();
	      for (var i = sels.length - 1; i >= 0; i--)
	        { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input"); }
	      sels = cm.listSelections();
	      for (var i$1 = 0; i$1 < sels.length; i$1++)
	        { cm.indentLine(sels[i$1].from().line, null, true); }
	      ensureCursorVisible(cm);
	    }); },
	    openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
	    toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
	  };


	  function lineStart(cm, lineN) {
	    var line = getLine(cm.doc, lineN);
	    var visual = visualLine(line);
	    if (visual != line) { lineN = lineNo(visual); }
	    return endOfLine(true, cm, visual, lineN, 1)
	  }
	  function lineEnd(cm, lineN) {
	    var line = getLine(cm.doc, lineN);
	    var visual = visualLineEnd(line);
	    if (visual != line) { lineN = lineNo(visual); }
	    return endOfLine(true, cm, line, lineN, -1)
	  }
	  function lineStartSmart(cm, pos) {
	    var start = lineStart(cm, pos.line);
	    var line = getLine(cm.doc, start.line);
	    var order = getOrder(line, cm.doc.direction);
	    if (!order || order[0].level == 0) {
	      var firstNonWS = Math.max(0, line.text.search(/\S/));
	      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
	      return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
	    }
	    return start
	  }

	  // Run a handler that was bound to a key.
	  function doHandleBinding(cm, bound, dropShift) {
	    if (typeof bound == "string") {
	      bound = commands[bound];
	      if (!bound) { return false }
	    }
	    // Ensure previous input has been read, so that the handler sees a
	    // consistent view of the document
	    cm.display.input.ensurePolled();
	    var prevShift = cm.display.shift, done = false;
	    try {
	      if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
	      if (dropShift) { cm.display.shift = false; }
	      done = bound(cm) != Pass;
	    } finally {
	      cm.display.shift = prevShift;
	      cm.state.suppressEdits = false;
	    }
	    return done
	  }

	  function lookupKeyForEditor(cm, name, handle) {
	    for (var i = 0; i < cm.state.keyMaps.length; i++) {
	      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
	      if (result) { return result }
	    }
	    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
	      || lookupKey(name, cm.options.keyMap, handle, cm)
	  }

	  // Note that, despite the name, this function is also used to check
	  // for bound mouse clicks.

	  var stopSeq = new Delayed;

	  function dispatchKey(cm, name, e, handle) {
	    var seq = cm.state.keySeq;
	    if (seq) {
	      if (isModifierKey(name)) { return "handled" }
	      if (/\'$/.test(name))
	        { cm.state.keySeq = null; }
	      else
	        { stopSeq.set(50, function () {
	          if (cm.state.keySeq == seq) {
	            cm.state.keySeq = null;
	            cm.display.input.reset();
	          }
	        }); }
	      if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
	    }
	    return dispatchKeyInner(cm, name, e, handle)
	  }

	  function dispatchKeyInner(cm, name, e, handle) {
	    var result = lookupKeyForEditor(cm, name, handle);

	    if (result == "multi")
	      { cm.state.keySeq = name; }
	    if (result == "handled")
	      { signalLater(cm, "keyHandled", cm, name, e); }

	    if (result == "handled" || result == "multi") {
	      e_preventDefault(e);
	      restartBlink(cm);
	    }

	    return !!result
	  }

	  // Handle a key from the keydown event.
	  function handleKeyBinding(cm, e) {
	    var name = keyName(e, true);
	    if (!name) { return false }

	    if (e.shiftKey && !cm.state.keySeq) {
	      // First try to resolve full name (including 'Shift-'). Failing
	      // that, see if there is a cursor-motion command (starting with
	      // 'go') bound to the keyname without 'Shift-'.
	      return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
	          || dispatchKey(cm, name, e, function (b) {
	               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
	                 { return doHandleBinding(cm, b) }
	             })
	    } else {
	      return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
	    }
	  }

	  // Handle a key from the keypress event
	  function handleCharBinding(cm, e, ch) {
	    return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
	  }

	  var lastStoppedKey = null;
	  function onKeyDown(e) {
	    var cm = this;
	    cm.curOp.focus = activeElt();
	    if (signalDOMEvent(cm, e)) { return }
	    // IE does strange things with escape.
	    if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false; }
	    var code = e.keyCode;
	    cm.display.shift = code == 16 || e.shiftKey;
	    var handled = handleKeyBinding(cm, e);
	    if (presto) {
	      lastStoppedKey = handled ? code : null;
	      // Opera has no cut event... we try to at least catch the key combo
	      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
	        { cm.replaceSelection("", null, "cut"); }
	    }

	    // Turn mouse into crosshair when Alt is held on Mac.
	    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
	      { showCrossHair(cm); }
	  }

	  function showCrossHair(cm) {
	    var lineDiv = cm.display.lineDiv;
	    addClass(lineDiv, "CodeMirror-crosshair");

	    function up(e) {
	      if (e.keyCode == 18 || !e.altKey) {
	        rmClass(lineDiv, "CodeMirror-crosshair");
	        off(document, "keyup", up);
	        off(document, "mouseover", up);
	      }
	    }
	    on(document, "keyup", up);
	    on(document, "mouseover", up);
	  }

	  function onKeyUp(e) {
	    if (e.keyCode == 16) { this.doc.sel.shift = false; }
	    signalDOMEvent(this, e);
	  }

	  function onKeyPress(e) {
	    var cm = this;
	    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
	    var keyCode = e.keyCode, charCode = e.charCode;
	    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
	    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
	    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
	    // Some browsers fire keypress events for backspace
	    if (ch == "\x08") { return }
	    if (handleCharBinding(cm, e, ch)) { return }
	    cm.display.input.onKeyPress(e);
	  }

	  var DOUBLECLICK_DELAY = 400;

	  var PastClick = function(time, pos, button) {
	    this.time = time;
	    this.pos = pos;
	    this.button = button;
	  };

	  PastClick.prototype.compare = function (time, pos, button) {
	    return this.time + DOUBLECLICK_DELAY > time &&
	      cmp(pos, this.pos) == 0 && button == this.button
	  };

	  var lastClick, lastDoubleClick;
	  function clickRepeat(pos, button) {
	    var now = +new Date;
	    if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
	      lastClick = lastDoubleClick = null;
	      return "triple"
	    } else if (lastClick && lastClick.compare(now, pos, button)) {
	      lastDoubleClick = new PastClick(now, pos, button);
	      lastClick = null;
	      return "double"
	    } else {
	      lastClick = new PastClick(now, pos, button);
	      lastDoubleClick = null;
	      return "single"
	    }
	  }

	  // A mouse down can be a single click, double click, triple click,
	  // start of selection drag, start of text drag, new cursor
	  // (ctrl-click), rectangle drag (alt-drag), or xwin
	  // middle-click-paste. Or it might be a click on something we should
	  // not interfere with, such as a scrollbar or widget.
	  function onMouseDown(e) {
	    var cm = this, display = cm.display;
	    if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
	    display.input.ensurePolled();
	    display.shift = e.shiftKey;

	    if (eventInWidget(display, e)) {
	      if (!webkit) {
	        // Briefly turn off draggability, to allow widgets to do
	        // normal dragging things.
	        display.scroller.draggable = false;
	        setTimeout(function () { return display.scroller.draggable = true; }, 100);
	      }
	      return
	    }
	    if (clickInGutter(cm, e)) { return }
	    var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single";
	    window.focus();

	    // #3261: make sure, that we're not starting a second selection
	    if (button == 1 && cm.state.selectingText)
	      { cm.state.selectingText(e); }

	    if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

	    if (button == 1) {
	      if (pos) { leftButtonDown(cm, pos, repeat, e); }
	      else if (e_target(e) == display.scroller) { e_preventDefault(e); }
	    } else if (button == 2) {
	      if (pos) { extendSelection(cm.doc, pos); }
	      setTimeout(function () { return display.input.focus(); }, 20);
	    } else if (button == 3) {
	      if (captureRightClick) { cm.display.input.onContextMenu(e); }
	      else { delayBlurEvent(cm); }
	    }
	  }

	  function handleMappedButton(cm, button, pos, repeat, event) {
	    var name = "Click";
	    if (repeat == "double") { name = "Double" + name; }
	    else if (repeat == "triple") { name = "Triple" + name; }
	    name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

	    return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
	      if (typeof bound == "string") { bound = commands[bound]; }
	      if (!bound) { return false }
	      var done = false;
	      try {
	        if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
	        done = bound(cm, pos) != Pass;
	      } finally {
	        cm.state.suppressEdits = false;
	      }
	      return done
	    })
	  }

	  function configureMouse(cm, repeat, event) {
	    var option = cm.getOption("configureMouse");
	    var value = option ? option(cm, repeat, event) : {};
	    if (value.unit == null) {
	      var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
	      value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
	    }
	    if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey; }
	    if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey; }
	    if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey); }
	    return value
	  }

	  function leftButtonDown(cm, pos, repeat, event) {
	    if (ie) { setTimeout(bind(ensureFocus, cm), 0); }
	    else { cm.curOp.focus = activeElt(); }

	    var behavior = configureMouse(cm, repeat, event);

	    var sel = cm.doc.sel, contained;
	    if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
	        repeat == "single" && (contained = sel.contains(pos)) > -1 &&
	        (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
	        (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
	      { leftButtonStartDrag(cm, event, pos, behavior); }
	    else
	      { leftButtonSelect(cm, event, pos, behavior); }
	  }

	  // Start a text drag. When it ends, see if any dragging actually
	  // happen, and treat as a click if it didn't.
	  function leftButtonStartDrag(cm, event, pos, behavior) {
	    var display = cm.display, moved = false;
	    var dragEnd = operation(cm, function (e) {
	      if (webkit) { display.scroller.draggable = false; }
	      cm.state.draggingText = false;
	      off(display.wrapper.ownerDocument, "mouseup", dragEnd);
	      off(display.wrapper.ownerDocument, "mousemove", mouseMove);
	      off(display.scroller, "dragstart", dragStart);
	      off(display.scroller, "drop", dragEnd);
	      if (!moved) {
	        e_preventDefault(e);
	        if (!behavior.addNew)
	          { extendSelection(cm.doc, pos, null, null, behavior.extend); }
	        // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
	        if (webkit || ie && ie_version == 9)
	          { setTimeout(function () {display.wrapper.ownerDocument.body.focus(); display.input.focus();}, 20); }
	        else
	          { display.input.focus(); }
	      }
	    });
	    var mouseMove = function(e2) {
	      moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
	    };
	    var dragStart = function () { return moved = true; };
	    // Let the drag handler handle this.
	    if (webkit) { display.scroller.draggable = true; }
	    cm.state.draggingText = dragEnd;
	    dragEnd.copy = !behavior.moveOnDrag;
	    // IE's approach to draggable
	    if (display.scroller.dragDrop) { display.scroller.dragDrop(); }
	    on(display.wrapper.ownerDocument, "mouseup", dragEnd);
	    on(display.wrapper.ownerDocument, "mousemove", mouseMove);
	    on(display.scroller, "dragstart", dragStart);
	    on(display.scroller, "drop", dragEnd);

	    delayBlurEvent(cm);
	    setTimeout(function () { return display.input.focus(); }, 20);
	  }

	  function rangeForUnit(cm, pos, unit) {
	    if (unit == "char") { return new Range(pos, pos) }
	    if (unit == "word") { return cm.findWordAt(pos) }
	    if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
	    var result = unit(cm, pos);
	    return new Range(result.from, result.to)
	  }

	  // Normal selection, as opposed to text dragging.
	  function leftButtonSelect(cm, event, start, behavior) {
	    var display = cm.display, doc = cm.doc;
	    e_preventDefault(event);

	    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
	    if (behavior.addNew && !behavior.extend) {
	      ourIndex = doc.sel.contains(start);
	      if (ourIndex > -1)
	        { ourRange = ranges[ourIndex]; }
	      else
	        { ourRange = new Range(start, start); }
	    } else {
	      ourRange = doc.sel.primary();
	      ourIndex = doc.sel.primIndex;
	    }

	    if (behavior.unit == "rectangle") {
	      if (!behavior.addNew) { ourRange = new Range(start, start); }
	      start = posFromMouse(cm, event, true, true);
	      ourIndex = -1;
	    } else {
	      var range$$1 = rangeForUnit(cm, start, behavior.unit);
	      if (behavior.extend)
	        { ourRange = extendRange(ourRange, range$$1.anchor, range$$1.head, behavior.extend); }
	      else
	        { ourRange = range$$1; }
	    }

	    if (!behavior.addNew) {
	      ourIndex = 0;
	      setSelection(doc, new Selection([ourRange], 0), sel_mouse);
	      startSel = doc.sel;
	    } else if (ourIndex == -1) {
	      ourIndex = ranges.length;
	      setSelection(doc, normalizeSelection(cm, ranges.concat([ourRange]), ourIndex),
	                   {scroll: false, origin: "*mouse"});
	    } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
	      setSelection(doc, normalizeSelection(cm, ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
	                   {scroll: false, origin: "*mouse"});
	      startSel = doc.sel;
	    } else {
	      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
	    }

	    var lastPos = start;
	    function extendTo(pos) {
	      if (cmp(lastPos, pos) == 0) { return }
	      lastPos = pos;

	      if (behavior.unit == "rectangle") {
	        var ranges = [], tabSize = cm.options.tabSize;
	        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
	        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
	        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
	        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
	             line <= end; line++) {
	          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
	          if (left == right)
	            { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); }
	          else if (text.length > leftPos)
	            { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))); }
	        }
	        if (!ranges.length) { ranges.push(new Range(start, start)); }
	        setSelection(doc, normalizeSelection(cm, startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
	                     {origin: "*mouse", scroll: false});
	        cm.scrollIntoView(pos);
	      } else {
	        var oldRange = ourRange;
	        var range$$1 = rangeForUnit(cm, pos, behavior.unit);
	        var anchor = oldRange.anchor, head;
	        if (cmp(range$$1.anchor, anchor) > 0) {
	          head = range$$1.head;
	          anchor = minPos(oldRange.from(), range$$1.anchor);
	        } else {
	          head = range$$1.anchor;
	          anchor = maxPos(oldRange.to(), range$$1.head);
	        }
	        var ranges$1 = startSel.ranges.slice(0);
	        ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head));
	        setSelection(doc, normalizeSelection(cm, ranges$1, ourIndex), sel_mouse);
	      }
	    }

	    var editorSize = display.wrapper.getBoundingClientRect();
	    // Used to ensure timeout re-tries don't fire when another extend
	    // happened in the meantime (clearTimeout isn't reliable -- at
	    // least on Chrome, the timeouts still happen even when cleared,
	    // if the clear happens after their scheduled firing time).
	    var counter = 0;

	    function extend(e) {
	      var curCount = ++counter;
	      var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
	      if (!cur) { return }
	      if (cmp(cur, lastPos) != 0) {
	        cm.curOp.focus = activeElt();
	        extendTo(cur);
	        var visible = visibleLines(display, doc);
	        if (cur.line >= visible.to || cur.line < visible.from)
	          { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e); }}), 150); }
	      } else {
	        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
	        if (outside) { setTimeout(operation(cm, function () {
	          if (counter != curCount) { return }
	          display.scroller.scrollTop += outside;
	          extend(e);
	        }), 50); }
	      }
	    }

	    function done(e) {
	      cm.state.selectingText = false;
	      counter = Infinity;
	      e_preventDefault(e);
	      display.input.focus();
	      off(display.wrapper.ownerDocument, "mousemove", move);
	      off(display.wrapper.ownerDocument, "mouseup", up);
	      doc.history.lastSelOrigin = null;
	    }

	    var move = operation(cm, function (e) {
	      if (e.buttons === 0 || !e_button(e)) { done(e); }
	      else { extend(e); }
	    });
	    var up = operation(cm, done);
	    cm.state.selectingText = up;
	    on(display.wrapper.ownerDocument, "mousemove", move);
	    on(display.wrapper.ownerDocument, "mouseup", up);
	  }

	  // Used when mouse-selecting to adjust the anchor to the proper side
	  // of a bidi jump depending on the visual position of the head.
	  function bidiSimplify(cm, range$$1) {
	    var anchor = range$$1.anchor;
	    var head = range$$1.head;
	    var anchorLine = getLine(cm.doc, anchor.line);
	    if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range$$1 }
	    var order = getOrder(anchorLine);
	    if (!order) { return range$$1 }
	    var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index];
	    if (part.from != anchor.ch && part.to != anchor.ch) { return range$$1 }
	    var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1);
	    if (boundary == 0 || boundary == order.length) { return range$$1 }

	    // Compute the relative visual position of the head compared to the
	    // anchor (<0 is to the left, >0 to the right)
	    var leftSide;
	    if (head.line != anchor.line) {
	      leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
	    } else {
	      var headIndex = getBidiPartAt(order, head.ch, head.sticky);
	      var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
	      if (headIndex == boundary - 1 || headIndex == boundary)
	        { leftSide = dir < 0; }
	      else
	        { leftSide = dir > 0; }
	    }

	    var usePart = order[boundary + (leftSide ? -1 : 0)];
	    var from = leftSide == (usePart.level == 1);
	    var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before";
	    return anchor.ch == ch && anchor.sticky == sticky ? range$$1 : new Range(new Pos(anchor.line, ch, sticky), head)
	  }


	  // Determines whether an event happened in the gutter, and fires the
	  // handlers for the corresponding event.
	  function gutterEvent(cm, e, type, prevent) {
	    var mX, mY;
	    if (e.touches) {
	      mX = e.touches[0].clientX;
	      mY = e.touches[0].clientY;
	    } else {
	      try { mX = e.clientX; mY = e.clientY; }
	      catch(e) { return false }
	    }
	    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
	    if (prevent) { e_preventDefault(e); }

	    var display = cm.display;
	    var lineBox = display.lineDiv.getBoundingClientRect();

	    if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
	    mY -= lineBox.top - display.viewOffset;

	    for (var i = 0; i < cm.options.gutters.length; ++i) {
	      var g = display.gutters.childNodes[i];
	      if (g && g.getBoundingClientRect().right >= mX) {
	        var line = lineAtHeight(cm.doc, mY);
	        var gutter = cm.options.gutters[i];
	        signal(cm, type, cm, line, gutter, e);
	        return e_defaultPrevented(e)
	      }
	    }
	  }

	  function clickInGutter(cm, e) {
	    return gutterEvent(cm, e, "gutterClick", true)
	  }

	  // CONTEXT MENU HANDLING

	  // To make the context menu work, we need to briefly unhide the
	  // textarea (making it as unobtrusive as possible) to let the
	  // right-click take effect on it.
	  function onContextMenu(cm, e) {
	    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
	    if (signalDOMEvent(cm, e, "contextmenu")) { return }
	    if (!captureRightClick) { cm.display.input.onContextMenu(e); }
	  }

	  function contextMenuInGutter(cm, e) {
	    if (!hasHandler(cm, "gutterContextMenu")) { return false }
	    return gutterEvent(cm, e, "gutterContextMenu", false)
	  }

	  function themeChanged(cm) {
	    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
	      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
	    clearCaches(cm);
	  }

	  var Init = {toString: function(){return "CodeMirror.Init"}};

	  var defaults = {};
	  var optionHandlers = {};

	  function defineOptions(CodeMirror) {
	    var optionHandlers = CodeMirror.optionHandlers;

	    function option(name, deflt, handle, notOnInit) {
	      CodeMirror.defaults[name] = deflt;
	      if (handle) { optionHandlers[name] =
	        notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old); }} : handle; }
	    }

	    CodeMirror.defineOption = option;

	    // Passed to option handlers when there is no old value.
	    CodeMirror.Init = Init;

	    // These two are, on init, called from the constructor because they
	    // have to be initialized before the editor can start at all.
	    option("value", "", function (cm, val) { return cm.setValue(val); }, true);
	    option("mode", null, function (cm, val) {
	      cm.doc.modeOption = val;
	      loadMode(cm);
	    }, true);

	    option("indentUnit", 2, loadMode, true);
	    option("indentWithTabs", false);
	    option("smartIndent", true);
	    option("tabSize", 4, function (cm) {
	      resetModeState(cm);
	      clearCaches(cm);
	      regChange(cm);
	    }, true);

	    option("lineSeparator", null, function (cm, val) {
	      cm.doc.lineSep = val;
	      if (!val) { return }
	      var newBreaks = [], lineNo = cm.doc.first;
	      cm.doc.iter(function (line) {
	        for (var pos = 0;;) {
	          var found = line.text.indexOf(val, pos);
	          if (found == -1) { break }
	          pos = found + val.length;
	          newBreaks.push(Pos(lineNo, found));
	        }
	        lineNo++;
	      });
	      for (var i = newBreaks.length - 1; i >= 0; i--)
	        { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)); }
	    });
	    option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff]/g, function (cm, val, old) {
	      cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
	      if (old != Init) { cm.refresh(); }
	    });
	    option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true);
	    option("electricChars", true);
	    option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
	      throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
	    }, true);
	    option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true);
	    option("autocorrect", false, function (cm, val) { return cm.getInputField().autocorrect = val; }, true);
	    option("autocapitalize", false, function (cm, val) { return cm.getInputField().autocapitalize = val; }, true);
	    option("rtlMoveVisually", !windows);
	    option("wholeLineUpdateBefore", true);

	    option("theme", "default", function (cm) {
	      themeChanged(cm);
	      guttersChanged(cm);
	    }, true);
	    option("keyMap", "default", function (cm, val, old) {
	      var next = getKeyMap(val);
	      var prev = old != Init && getKeyMap(old);
	      if (prev && prev.detach) { prev.detach(cm, next); }
	      if (next.attach) { next.attach(cm, prev || null); }
	    });
	    option("extraKeys", null);
	    option("configureMouse", null);

	    option("lineWrapping", false, wrappingChanged, true);
	    option("gutters", [], function (cm) {
	      setGuttersForLineNumbers(cm.options);
	      guttersChanged(cm);
	    }, true);
	    option("fixedGutter", true, function (cm, val) {
	      cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
	      cm.refresh();
	    }, true);
	    option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true);
	    option("scrollbarStyle", "native", function (cm) {
	      initScrollbars(cm);
	      updateScrollbars(cm);
	      cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
	      cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
	    }, true);
	    option("lineNumbers", false, function (cm) {
	      setGuttersForLineNumbers(cm.options);
	      guttersChanged(cm);
	    }, true);
	    option("firstLineNumber", 1, guttersChanged, true);
	    option("lineNumberFormatter", function (integer) { return integer; }, guttersChanged, true);
	    option("showCursorWhenSelecting", false, updateSelection, true);

	    option("resetSelectionOnContextMenu", true);
	    option("lineWiseCopyCut", true);
	    option("pasteLinesPerSelection", true);
	    option("selectionsMayTouch", false);

	    option("readOnly", false, function (cm, val) {
	      if (val == "nocursor") {
	        onBlur(cm);
	        cm.display.input.blur();
	      }
	      cm.display.input.readOnlyChanged(val);
	    });
	    option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset(); }}, true);
	    option("dragDrop", true, dragDropChanged);
	    option("allowDropFileTypes", null);

	    option("cursorBlinkRate", 530);
	    option("cursorScrollMargin", 0);
	    option("cursorHeight", 1, updateSelection, true);
	    option("singleCursorHeightPerLine", true, updateSelection, true);
	    option("workTime", 100);
	    option("workDelay", 100);
	    option("flattenSpans", true, resetModeState, true);
	    option("addModeClass", false, resetModeState, true);
	    option("pollInterval", 100);
	    option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; });
	    option("historyEventDelay", 1250);
	    option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true);
	    option("maxHighlightLength", 10000, resetModeState, true);
	    option("moveInputWithCursor", true, function (cm, val) {
	      if (!val) { cm.display.input.resetPosition(); }
	    });

	    option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; });
	    option("autofocus", null);
	    option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true);
	    option("phrases", null);
	  }

	  function guttersChanged(cm) {
	    updateGutters(cm);
	    regChange(cm);
	    alignHorizontally(cm);
	  }

	  function dragDropChanged(cm, value, old) {
	    var wasOn = old && old != Init;
	    if (!value != !wasOn) {
	      var funcs = cm.display.dragFunctions;
	      var toggle = value ? on : off;
	      toggle(cm.display.scroller, "dragstart", funcs.start);
	      toggle(cm.display.scroller, "dragenter", funcs.enter);
	      toggle(cm.display.scroller, "dragover", funcs.over);
	      toggle(cm.display.scroller, "dragleave", funcs.leave);
	      toggle(cm.display.scroller, "drop", funcs.drop);
	    }
	  }

	  function wrappingChanged(cm) {
	    if (cm.options.lineWrapping) {
	      addClass(cm.display.wrapper, "CodeMirror-wrap");
	      cm.display.sizer.style.minWidth = "";
	      cm.display.sizerWidth = null;
	    } else {
	      rmClass(cm.display.wrapper, "CodeMirror-wrap");
	      findMaxLine(cm);
	    }
	    estimateLineHeights(cm);
	    regChange(cm);
	    clearCaches(cm);
	    setTimeout(function () { return updateScrollbars(cm); }, 100);
	  }

	  // A CodeMirror instance represents an editor. This is the object
	  // that user code is usually dealing with.

	  function CodeMirror(place, options) {
	    var this$1 = this;

	    if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

	    this.options = options = options ? copyObj(options) : {};
	    // Determine effective options based on given values and defaults.
	    copyObj(defaults, options, false);
	    setGuttersForLineNumbers(options);

	    var doc = options.value;
	    if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction); }
	    else if (options.mode) { doc.modeOption = options.mode; }
	    this.doc = doc;

	    var input = new CodeMirror.inputStyles[options.inputStyle](this);
	    var display = this.display = new Display(place, doc, input);
	    display.wrapper.CodeMirror = this;
	    updateGutters(this);
	    themeChanged(this);
	    if (options.lineWrapping)
	      { this.display.wrapper.className += " CodeMirror-wrap"; }
	    initScrollbars(this);

	    this.state = {
	      keyMaps: [],  // stores maps added by addKeyMap
	      overlays: [], // highlighting overlays, as added by addOverlay
	      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
	      overwrite: false,
	      delayingBlurEvent: false,
	      focused: false,
	      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
	      pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
	      selectingText: false,
	      draggingText: false,
	      highlight: new Delayed(), // stores highlight worker timeout
	      keySeq: null,  // Unfinished key sequence
	      specialChars: null
	    };

	    if (options.autofocus && !mobile) { display.input.focus(); }

	    // Override magic textarea content restore that IE sometimes does
	    // on our hidden textarea on reload
	    if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20); }

	    registerEventHandlers(this);
	    ensureGlobalHandlers();

	    startOperation(this);
	    this.curOp.forceUpdate = true;
	    attachDoc(this, doc);

	    if ((options.autofocus && !mobile) || this.hasFocus())
	      { setTimeout(bind(onFocus, this), 20); }
	    else
	      { onBlur(this); }

	    for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
	      { optionHandlers[opt](this$1, options[opt], Init); } }
	    maybeUpdateLineNumberWidth(this);
	    if (options.finishInit) { options.finishInit(this); }
	    for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1); }
	    endOperation(this);
	    // Suppress optimizelegibility in Webkit, since it breaks text
	    // measuring on line wrapping boundaries.
	    if (webkit && options.lineWrapping &&
	        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
	      { display.lineDiv.style.textRendering = "auto"; }
	  }

	  // The default configuration options.
	  CodeMirror.defaults = defaults;
	  // Functions to run when options are changed.
	  CodeMirror.optionHandlers = optionHandlers;

	  // Attach the necessary event handlers when initializing the editor
	  function registerEventHandlers(cm) {
	    var d = cm.display;
	    on(d.scroller, "mousedown", operation(cm, onMouseDown));
	    // Older IE's will not fire a second mousedown for a double click
	    if (ie && ie_version < 11)
	      { on(d.scroller, "dblclick", operation(cm, function (e) {
	        if (signalDOMEvent(cm, e)) { return }
	        var pos = posFromMouse(cm, e);
	        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
	        e_preventDefault(e);
	        var word = cm.findWordAt(pos);
	        extendSelection(cm.doc, word.anchor, word.head);
	      })); }
	    else
	      { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }); }
	    // Some browsers fire contextmenu *after* opening the menu, at
	    // which point we can't mess with it anymore. Context menu is
	    // handled in onMouseDown for these browsers.
	    on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); });

	    // Used to suppress mouse event handling when a touch happens
	    var touchFinished, prevTouch = {end: 0};
	    function finishTouch() {
	      if (d.activeTouch) {
	        touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000);
	        prevTouch = d.activeTouch;
	        prevTouch.end = +new Date;
	      }
	    }
	    function isMouseLikeTouchEvent(e) {
	      if (e.touches.length != 1) { return false }
	      var touch = e.touches[0];
	      return touch.radiusX <= 1 && touch.radiusY <= 1
	    }
	    function farAway(touch, other) {
	      if (other.left == null) { return true }
	      var dx = other.left - touch.left, dy = other.top - touch.top;
	      return dx * dx + dy * dy > 20 * 20
	    }
	    on(d.scroller, "touchstart", function (e) {
	      if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
	        d.input.ensurePolled();
	        clearTimeout(touchFinished);
	        var now = +new Date;
	        d.activeTouch = {start: now, moved: false,
	                         prev: now - prevTouch.end <= 300 ? prevTouch : null};
	        if (e.touches.length == 1) {
	          d.activeTouch.left = e.touches[0].pageX;
	          d.activeTouch.top = e.touches[0].pageY;
	        }
	      }
	    });
	    on(d.scroller, "touchmove", function () {
	      if (d.activeTouch) { d.activeTouch.moved = true; }
	    });
	    on(d.scroller, "touchend", function (e) {
	      var touch = d.activeTouch;
	      if (touch && !eventInWidget(d, e) && touch.left != null &&
	          !touch.moved && new Date - touch.start < 300) {
	        var pos = cm.coordsChar(d.activeTouch, "page"), range;
	        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
	          { range = new Range(pos, pos); }
	        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
	          { range = cm.findWordAt(pos); }
	        else // Triple tap
	          { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))); }
	        cm.setSelection(range.anchor, range.head);
	        cm.focus();
	        e_preventDefault(e);
	      }
	      finishTouch();
	    });
	    on(d.scroller, "touchcancel", finishTouch);

	    // Sync scrolling between fake scrollbars and real scrollable
	    // area, ensure viewport is updated when scrolling.
	    on(d.scroller, "scroll", function () {
	      if (d.scroller.clientHeight) {
	        updateScrollTop(cm, d.scroller.scrollTop);
	        setScrollLeft(cm, d.scroller.scrollLeft, true);
	        signal(cm, "scroll", cm);
	      }
	    });

	    // Listen to wheel events in order to try and update the viewport on time.
	    on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); });
	    on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); });

	    // Prevent wrapper from ever scrolling
	    on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

	    d.dragFunctions = {
	      enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e); }},
	      over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e); }},
	      start: function (e) { return onDragStart(cm, e); },
	      drop: operation(cm, onDrop),
	      leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm); }}
	    };

	    var inp = d.input.getField();
	    on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); });
	    on(inp, "keydown", operation(cm, onKeyDown));
	    on(inp, "keypress", operation(cm, onKeyPress));
	    on(inp, "focus", function (e) { return onFocus(cm, e); });
	    on(inp, "blur", function (e) { return onBlur(cm, e); });
	  }

	  var initHooks = [];
	  CodeMirror.defineInitHook = function (f) { return initHooks.push(f); };

	  // Indent the given line. The how parameter can be "smart",
	  // "add"/null, "subtract", or "prev". When aggressive is false
	  // (typically set to true for forced single-line indents), empty
	  // lines are not indented, and places where the mode returns Pass
	  // are left alone.
	  function indentLine(cm, n, how, aggressive) {
	    var doc = cm.doc, state;
	    if (how == null) { how = "add"; }
	    if (how == "smart") {
	      // Fall back to "prev" when the mode doesn't have an indentation
	      // method.
	      if (!doc.mode.indent) { how = "prev"; }
	      else { state = getContextBefore(cm, n).state; }
	    }

	    var tabSize = cm.options.tabSize;
	    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
	    if (line.stateAfter) { line.stateAfter = null; }
	    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
	    if (!aggressive && !/\S/.test(line.text)) {
	      indentation = 0;
	      how = "not";
	    } else if (how == "smart") {
	      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
	      if (indentation == Pass || indentation > 150) {
	        if (!aggressive) { return }
	        how = "prev";
	      }
	    }
	    if (how == "prev") {
	      if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize); }
	      else { indentation = 0; }
	    } else if (how == "add") {
	      indentation = curSpace + cm.options.indentUnit;
	    } else if (how == "subtract") {
	      indentation = curSpace - cm.options.indentUnit;
	    } else if (typeof how == "number") {
	      indentation = curSpace + how;
	    }
	    indentation = Math.max(0, indentation);

	    var indentString = "", pos = 0;
	    if (cm.options.indentWithTabs)
	      { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";} }
	    if (pos < indentation) { indentString += spaceStr(indentation - pos); }

	    if (indentString != curSpaceString) {
	      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
	      line.stateAfter = null;
	      return true
	    } else {
	      // Ensure that, if the cursor was in the whitespace at the start
	      // of the line, it is moved to the end of that space.
	      for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
	        var range = doc.sel.ranges[i$1];
	        if (range.head.line == n && range.head.ch < curSpaceString.length) {
	          var pos$1 = Pos(n, curSpaceString.length);
	          replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
	          break
	        }
	      }
	    }
	  }

	  // This will be set to a {lineWise: bool, text: [string]} object, so
	  // that, when pasting, we know what kind of selections the copied
	  // text was made out of.
	  var lastCopied = null;

	  function setLastCopied(newLastCopied) {
	    lastCopied = newLastCopied;
	  }

	  function applyTextInput(cm, inserted, deleted, sel, origin) {
	    var doc = cm.doc;
	    cm.display.shift = false;
	    if (!sel) { sel = doc.sel; }

	    var paste = cm.state.pasteIncoming || origin == "paste";
	    var textLines = splitLinesAuto(inserted), multiPaste = null;
	    // When pasting N lines into N selections, insert one line per selection
	    if (paste && sel.ranges.length > 1) {
	      if (lastCopied && lastCopied.text.join("\n") == inserted) {
	        if (sel.ranges.length % lastCopied.text.length == 0) {
	          multiPaste = [];
	          for (var i = 0; i < lastCopied.text.length; i++)
	            { multiPaste.push(doc.splitLines(lastCopied.text[i])); }
	        }
	      } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
	        multiPaste = map(textLines, function (l) { return [l]; });
	      }
	    }

	    var updateInput = cm.curOp.updateInput;
	    // Normal behavior is to insert the new text into every selection
	    for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
	      var range$$1 = sel.ranges[i$1];
	      var from = range$$1.from(), to = range$$1.to();
	      if (range$$1.empty()) {
	        if (deleted && deleted > 0) // Handle deletion
	          { from = Pos(from.line, from.ch - deleted); }
	        else if (cm.state.overwrite && !paste) // Handle overwrite
	          { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)); }
	        else if (paste && lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
	          { from = to = Pos(from.line, 0); }
	      }
	      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
	                         origin: origin || (paste ? "paste" : cm.state.cutIncoming ? "cut" : "+input")};
	      makeChange(cm.doc, changeEvent);
	      signalLater(cm, "inputRead", cm, changeEvent);
	    }
	    if (inserted && !paste)
	      { triggerElectric(cm, inserted); }

	    ensureCursorVisible(cm);
	    if (cm.curOp.updateInput < 2) { cm.curOp.updateInput = updateInput; }
	    cm.curOp.typing = true;
	    cm.state.pasteIncoming = cm.state.cutIncoming = false;
	  }

	  function handlePaste(e, cm) {
	    var pasted = e.clipboardData && e.clipboardData.getData("Text");
	    if (pasted) {
	      e.preventDefault();
	      if (!cm.isReadOnly() && !cm.options.disableInput)
	        { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }); }
	      return true
	    }
	  }

	  function triggerElectric(cm, inserted) {
	    // When an 'electric' character is inserted, immediately trigger a reindent
	    if (!cm.options.electricChars || !cm.options.smartIndent) { return }
	    var sel = cm.doc.sel;

	    for (var i = sel.ranges.length - 1; i >= 0; i--) {
	      var range$$1 = sel.ranges[i];
	      if (range$$1.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range$$1.head.line)) { continue }
	      var mode = cm.getModeAt(range$$1.head);
	      var indented = false;
	      if (mode.electricChars) {
	        for (var j = 0; j < mode.electricChars.length; j++)
	          { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
	            indented = indentLine(cm, range$$1.head.line, "smart");
	            break
	          } }
	      } else if (mode.electricInput) {
	        if (mode.electricInput.test(getLine(cm.doc, range$$1.head.line).text.slice(0, range$$1.head.ch)))
	          { indented = indentLine(cm, range$$1.head.line, "smart"); }
	      }
	      if (indented) { signalLater(cm, "electricInput", cm, range$$1.head.line); }
	    }
	  }

	  function copyableRanges(cm) {
	    var text = [], ranges = [];
	    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
	      var line = cm.doc.sel.ranges[i].head.line;
	      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
	      ranges.push(lineRange);
	      text.push(cm.getRange(lineRange.anchor, lineRange.head));
	    }
	    return {text: text, ranges: ranges}
	  }

	  function disableBrowserMagic(field, spellcheck, autocorrect, autocapitalize) {
	    field.setAttribute("autocorrect", !!autocorrect);
	    field.setAttribute("autocapitalize", !!autocapitalize);
	    field.setAttribute("spellcheck", !!spellcheck);
	  }

	  function hiddenTextarea() {
	    var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
	    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
	    // The textarea is kept positioned near the cursor to prevent the
	    // fact that it'll be scrolled into view on input from scrolling
	    // our fake cursor out of view. On webkit, when wrap=off, paste is
	    // very slow. So make the area wide instead.
	    if (webkit) { te.style.width = "1000px"; }
	    else { te.setAttribute("wrap", "off"); }
	    // If border: 0; -- iOS fails to open keyboard (issue #1287)
	    if (ios) { te.style.border = "1px solid black"; }
	    disableBrowserMagic(te);
	    return div
	  }

	  // The publicly visible API. Note that methodOp(f) means
	  // 'wrap f in an operation, performed on its `this` parameter'.

	  // This is not the complete set of editor methods. Most of the
	  // methods defined on the Doc type are also injected into
	  // CodeMirror.prototype, for backwards compatibility and
	  // convenience.

	  function addEditorMethods(CodeMirror) {
	    var optionHandlers = CodeMirror.optionHandlers;

	    var helpers = CodeMirror.helpers = {};

	    CodeMirror.prototype = {
	      constructor: CodeMirror,
	      focus: function(){window.focus(); this.display.input.focus();},

	      setOption: function(option, value) {
	        var options = this.options, old = options[option];
	        if (options[option] == value && option != "mode") { return }
	        options[option] = value;
	        if (optionHandlers.hasOwnProperty(option))
	          { operation(this, optionHandlers[option])(this, value, old); }
	        signal(this, "optionChange", this, option);
	      },

	      getOption: function(option) {return this.options[option]},
	      getDoc: function() {return this.doc},

	      addKeyMap: function(map$$1, bottom) {
	        this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map$$1));
	      },
	      removeKeyMap: function(map$$1) {
	        var maps = this.state.keyMaps;
	        for (var i = 0; i < maps.length; ++i)
	          { if (maps[i] == map$$1 || maps[i].name == map$$1) {
	            maps.splice(i, 1);
	            return true
	          } }
	      },

	      addOverlay: methodOp(function(spec, options) {
	        var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
	        if (mode.startState) { throw new Error("Overlays may not be stateful.") }
	        insertSorted(this.state.overlays,
	                     {mode: mode, modeSpec: spec, opaque: options && options.opaque,
	                      priority: (options && options.priority) || 0},
	                     function (overlay) { return overlay.priority; });
	        this.state.modeGen++;
	        regChange(this);
	      }),
	      removeOverlay: methodOp(function(spec) {
	        var this$1 = this;

	        var overlays = this.state.overlays;
	        for (var i = 0; i < overlays.length; ++i) {
	          var cur = overlays[i].modeSpec;
	          if (cur == spec || typeof spec == "string" && cur.name == spec) {
	            overlays.splice(i, 1);
	            this$1.state.modeGen++;
	            regChange(this$1);
	            return
	          }
	        }
	      }),

	      indentLine: methodOp(function(n, dir, aggressive) {
	        if (typeof dir != "string" && typeof dir != "number") {
	          if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev"; }
	          else { dir = dir ? "add" : "subtract"; }
	        }
	        if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive); }
	      }),
	      indentSelection: methodOp(function(how) {
	        var this$1 = this;

	        var ranges = this.doc.sel.ranges, end = -1;
	        for (var i = 0; i < ranges.length; i++) {
	          var range$$1 = ranges[i];
	          if (!range$$1.empty()) {
	            var from = range$$1.from(), to = range$$1.to();
	            var start = Math.max(end, from.line);
	            end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
	            for (var j = start; j < end; ++j)
	              { indentLine(this$1, j, how); }
	            var newRanges = this$1.doc.sel.ranges;
	            if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
	              { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll); }
	          } else if (range$$1.head.line > end) {
	            indentLine(this$1, range$$1.head.line, how, true);
	            end = range$$1.head.line;
	            if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1); }
	          }
	        }
	      }),

	      // Fetch the parser token for a given character. Useful for hacks
	      // that want to inspect the mode state (say, for completion).
	      getTokenAt: function(pos, precise) {
	        return takeToken(this, pos, precise)
	      },

	      getLineTokens: function(line, precise) {
	        return takeToken(this, Pos(line), precise, true)
	      },

	      getTokenTypeAt: function(pos) {
	        pos = clipPos(this.doc, pos);
	        var styles = getLineStyles(this, getLine(this.doc, pos.line));
	        var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
	        var type;
	        if (ch == 0) { type = styles[2]; }
	        else { for (;;) {
	          var mid = (before + after) >> 1;
	          if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid; }
	          else if (styles[mid * 2 + 1] < ch) { before = mid + 1; }
	          else { type = styles[mid * 2 + 2]; break }
	        } }
	        var cut = type ? type.indexOf("overlay ") : -1;
	        return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
	      },

	      getModeAt: function(pos) {
	        var mode = this.doc.mode;
	        if (!mode.innerMode) { return mode }
	        return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
	      },

	      getHelper: function(pos, type) {
	        return this.getHelpers(pos, type)[0]
	      },

	      getHelpers: function(pos, type) {
	        var this$1 = this;

	        var found = [];
	        if (!helpers.hasOwnProperty(type)) { return found }
	        var help = helpers[type], mode = this.getModeAt(pos);
	        if (typeof mode[type] == "string") {
	          if (help[mode[type]]) { found.push(help[mode[type]]); }
	        } else if (mode[type]) {
	          for (var i = 0; i < mode[type].length; i++) {
	            var val = help[mode[type][i]];
	            if (val) { found.push(val); }
	          }
	        } else if (mode.helperType && help[mode.helperType]) {
	          found.push(help[mode.helperType]);
	        } else if (help[mode.name]) {
	          found.push(help[mode.name]);
	        }
	        for (var i$1 = 0; i$1 < help._global.length; i$1++) {
	          var cur = help._global[i$1];
	          if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
	            { found.push(cur.val); }
	        }
	        return found
	      },

	      getStateAfter: function(line, precise) {
	        var doc = this.doc;
	        line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
	        return getContextBefore(this, line + 1, precise).state
	      },

	      cursorCoords: function(start, mode) {
	        var pos, range$$1 = this.doc.sel.primary();
	        if (start == null) { pos = range$$1.head; }
	        else if (typeof start == "object") { pos = clipPos(this.doc, start); }
	        else { pos = start ? range$$1.from() : range$$1.to(); }
	        return cursorCoords(this, pos, mode || "page")
	      },

	      charCoords: function(pos, mode) {
	        return charCoords(this, clipPos(this.doc, pos), mode || "page")
	      },

	      coordsChar: function(coords, mode) {
	        coords = fromCoordSystem(this, coords, mode || "page");
	        return coordsChar(this, coords.left, coords.top)
	      },

	      lineAtHeight: function(height, mode) {
	        height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
	        return lineAtHeight(this.doc, height + this.display.viewOffset)
	      },
	      heightAtLine: function(line, mode, includeWidgets) {
	        var end = false, lineObj;
	        if (typeof line == "number") {
	          var last = this.doc.first + this.doc.size - 1;
	          if (line < this.doc.first) { line = this.doc.first; }
	          else if (line > last) { line = last; end = true; }
	          lineObj = getLine(this.doc, line);
	        } else {
	          lineObj = line;
	        }
	        return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
	          (end ? this.doc.height - heightAtLine(lineObj) : 0)
	      },

	      defaultTextHeight: function() { return textHeight(this.display) },
	      defaultCharWidth: function() { return charWidth(this.display) },

	      getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

	      addWidget: function(pos, node, scroll, vert, horiz) {
	        var display = this.display;
	        pos = cursorCoords(this, clipPos(this.doc, pos));
	        var top = pos.bottom, left = pos.left;
	        node.style.position = "absolute";
	        node.setAttribute("cm-ignore-events", "true");
	        this.display.input.setUneditable(node);
	        display.sizer.appendChild(node);
	        if (vert == "over") {
	          top = pos.top;
	        } else if (vert == "above" || vert == "near") {
	          var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
	          hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
	          // Default to positioning above (if specified and possible); otherwise default to positioning below
	          if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
	            { top = pos.top - node.offsetHeight; }
	          else if (pos.bottom + node.offsetHeight <= vspace)
	            { top = pos.bottom; }
	          if (left + node.offsetWidth > hspace)
	            { left = hspace - node.offsetWidth; }
	        }
	        node.style.top = top + "px";
	        node.style.left = node.style.right = "";
	        if (horiz == "right") {
	          left = display.sizer.clientWidth - node.offsetWidth;
	          node.style.right = "0px";
	        } else {
	          if (horiz == "left") { left = 0; }
	          else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2; }
	          node.style.left = left + "px";
	        }
	        if (scroll)
	          { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}); }
	      },

	      triggerOnKeyDown: methodOp(onKeyDown),
	      triggerOnKeyPress: methodOp(onKeyPress),
	      triggerOnKeyUp: onKeyUp,
	      triggerOnMouseDown: methodOp(onMouseDown),

	      execCommand: function(cmd) {
	        if (commands.hasOwnProperty(cmd))
	          { return commands[cmd].call(null, this) }
	      },

	      triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

	      findPosH: function(from, amount, unit, visually) {
	        var this$1 = this;

	        var dir = 1;
	        if (amount < 0) { dir = -1; amount = -amount; }
	        var cur = clipPos(this.doc, from);
	        for (var i = 0; i < amount; ++i) {
	          cur = findPosH(this$1.doc, cur, dir, unit, visually);
	          if (cur.hitSide) { break }
	        }
	        return cur
	      },

	      moveH: methodOp(function(dir, unit) {
	        var this$1 = this;

	        this.extendSelectionsBy(function (range$$1) {
	          if (this$1.display.shift || this$1.doc.extend || range$$1.empty())
	            { return findPosH(this$1.doc, range$$1.head, dir, unit, this$1.options.rtlMoveVisually) }
	          else
	            { return dir < 0 ? range$$1.from() : range$$1.to() }
	        }, sel_move);
	      }),

	      deleteH: methodOp(function(dir, unit) {
	        var sel = this.doc.sel, doc = this.doc;
	        if (sel.somethingSelected())
	          { doc.replaceSelection("", null, "+delete"); }
	        else
	          { deleteNearSelection(this, function (range$$1) {
	            var other = findPosH(doc, range$$1.head, dir, unit, false);
	            return dir < 0 ? {from: other, to: range$$1.head} : {from: range$$1.head, to: other}
	          }); }
	      }),

	      findPosV: function(from, amount, unit, goalColumn) {
	        var this$1 = this;

	        var dir = 1, x = goalColumn;
	        if (amount < 0) { dir = -1; amount = -amount; }
	        var cur = clipPos(this.doc, from);
	        for (var i = 0; i < amount; ++i) {
	          var coords = cursorCoords(this$1, cur, "div");
	          if (x == null) { x = coords.left; }
	          else { coords.left = x; }
	          cur = findPosV(this$1, coords, dir, unit);
	          if (cur.hitSide) { break }
	        }
	        return cur
	      },

	      moveV: methodOp(function(dir, unit) {
	        var this$1 = this;

	        var doc = this.doc, goals = [];
	        var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
	        doc.extendSelectionsBy(function (range$$1) {
	          if (collapse)
	            { return dir < 0 ? range$$1.from() : range$$1.to() }
	          var headPos = cursorCoords(this$1, range$$1.head, "div");
	          if (range$$1.goalColumn != null) { headPos.left = range$$1.goalColumn; }
	          goals.push(headPos.left);
	          var pos = findPosV(this$1, headPos, dir, unit);
	          if (unit == "page" && range$$1 == doc.sel.primary())
	            { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top); }
	          return pos
	        }, sel_move);
	        if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
	          { doc.sel.ranges[i].goalColumn = goals[i]; } }
	      }),

	      // Find the word at the given position (as returned by coordsChar).
	      findWordAt: function(pos) {
	        var doc = this.doc, line = getLine(doc, pos.line).text;
	        var start = pos.ch, end = pos.ch;
	        if (line) {
	          var helper = this.getHelper(pos, "wordChars");
	          if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end; }
	          var startChar = line.charAt(start);
	          var check = isWordChar(startChar, helper)
	            ? function (ch) { return isWordChar(ch, helper); }
	            : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
	            : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); };
	          while (start > 0 && check(line.charAt(start - 1))) { --start; }
	          while (end < line.length && check(line.charAt(end))) { ++end; }
	        }
	        return new Range(Pos(pos.line, start), Pos(pos.line, end))
	      },

	      toggleOverwrite: function(value) {
	        if (value != null && value == this.state.overwrite) { return }
	        if (this.state.overwrite = !this.state.overwrite)
	          { addClass(this.display.cursorDiv, "CodeMirror-overwrite"); }
	        else
	          { rmClass(this.display.cursorDiv, "CodeMirror-overwrite"); }

	        signal(this, "overwriteToggle", this, this.state.overwrite);
	      },
	      hasFocus: function() { return this.display.input.getField() == activeElt() },
	      isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

	      scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y); }),
	      getScrollInfo: function() {
	        var scroller = this.display.scroller;
	        return {left: scroller.scrollLeft, top: scroller.scrollTop,
	                height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
	                width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
	                clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
	      },

	      scrollIntoView: methodOp(function(range$$1, margin) {
	        if (range$$1 == null) {
	          range$$1 = {from: this.doc.sel.primary().head, to: null};
	          if (margin == null) { margin = this.options.cursorScrollMargin; }
	        } else if (typeof range$$1 == "number") {
	          range$$1 = {from: Pos(range$$1, 0), to: null};
	        } else if (range$$1.from == null) {
	          range$$1 = {from: range$$1, to: null};
	        }
	        if (!range$$1.to) { range$$1.to = range$$1.from; }
	        range$$1.margin = margin || 0;

	        if (range$$1.from.line != null) {
	          scrollToRange(this, range$$1);
	        } else {
	          scrollToCoordsRange(this, range$$1.from, range$$1.to, range$$1.margin);
	        }
	      }),

	      setSize: methodOp(function(width, height) {
	        var this$1 = this;

	        var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
	        if (width != null) { this.display.wrapper.style.width = interpret(width); }
	        if (height != null) { this.display.wrapper.style.height = interpret(height); }
	        if (this.options.lineWrapping) { clearLineMeasurementCache(this); }
	        var lineNo$$1 = this.display.viewFrom;
	        this.doc.iter(lineNo$$1, this.display.viewTo, function (line) {
	          if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
	            { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo$$1, "widget"); break } } }
	          ++lineNo$$1;
	        });
	        this.curOp.forceUpdate = true;
	        signal(this, "refresh", this);
	      }),

	      operation: function(f){return runInOp(this, f)},
	      startOperation: function(){return startOperation(this)},
	      endOperation: function(){return endOperation(this)},

	      refresh: methodOp(function() {
	        var oldHeight = this.display.cachedTextHeight;
	        regChange(this);
	        this.curOp.forceUpdate = true;
	        clearCaches(this);
	        scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
	        updateGutterSpace(this);
	        if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
	          { estimateLineHeights(this); }
	        signal(this, "refresh", this);
	      }),

	      swapDoc: methodOp(function(doc) {
	        var old = this.doc;
	        old.cm = null;
	        attachDoc(this, doc);
	        clearCaches(this);
	        this.display.input.reset();
	        scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
	        this.curOp.forceScroll = true;
	        signalLater(this, "swapDoc", this, old);
	        return old
	      }),

	      phrase: function(phraseText) {
	        var phrases = this.options.phrases;
	        return phrases && Object.prototype.hasOwnProperty.call(phrases, phraseText) ? phrases[phraseText] : phraseText
	      },

	      getInputField: function(){return this.display.input.getField()},
	      getWrapperElement: function(){return this.display.wrapper},
	      getScrollerElement: function(){return this.display.scroller},
	      getGutterElement: function(){return this.display.gutters}
	    };
	    eventMixin(CodeMirror);

	    CodeMirror.registerHelper = function(type, name, value) {
	      if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []}; }
	      helpers[type][name] = value;
	    };
	    CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
	      CodeMirror.registerHelper(type, name, value);
	      helpers[type]._global.push({pred: predicate, val: value});
	    };
	  }

	  // Used for horizontal relative motion. Dir is -1 or 1 (left or
	  // right), unit can be "char", "column" (like char, but doesn't
	  // cross line boundaries), "word" (across next word), or "group" (to
	  // the start of next group of word or non-word-non-whitespace
	  // chars). The visually param controls whether, in right-to-left
	  // text, direction 1 means to move towards the next index in the
	  // string, or towards the character to the right of the current
	  // position. The resulting position will have a hitSide=true
	  // property if it reached the end of the document.
	  function findPosH(doc, pos, dir, unit, visually) {
	    var oldPos = pos;
	    var origDir = dir;
	    var lineObj = getLine(doc, pos.line);
	    function findNextLine() {
	      var l = pos.line + dir;
	      if (l < doc.first || l >= doc.first + doc.size) { return false }
	      pos = new Pos(l, pos.ch, pos.sticky);
	      return lineObj = getLine(doc, l)
	    }
	    function moveOnce(boundToLine) {
	      var next;
	      if (visually) {
	        next = moveVisually(doc.cm, lineObj, pos, dir);
	      } else {
	        next = moveLogically(lineObj, pos, dir);
	      }
	      if (next == null) {
	        if (!boundToLine && findNextLine())
	          { pos = endOfLine(visually, doc.cm, lineObj, pos.line, dir); }
	        else
	          { return false }
	      } else {
	        pos = next;
	      }
	      return true
	    }

	    if (unit == "char") {
	      moveOnce();
	    } else if (unit == "column") {
	      moveOnce(true);
	    } else if (unit == "word" || unit == "group") {
	      var sawType = null, group = unit == "group";
	      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
	      for (var first = true;; first = false) {
	        if (dir < 0 && !moveOnce(!first)) { break }
	        var cur = lineObj.text.charAt(pos.ch) || "\n";
	        var type = isWordChar(cur, helper) ? "w"
	          : group && cur == "\n" ? "n"
	          : !group || /\s/.test(cur) ? null
	          : "p";
	        if (group && !first && !type) { type = "s"; }
	        if (sawType && sawType != type) {
	          if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after";}
	          break
	        }

	        if (type) { sawType = type; }
	        if (dir > 0 && !moveOnce(!first)) { break }
	      }
	    }
	    var result = skipAtomic(doc, pos, oldPos, origDir, true);
	    if (equalCursorPos(oldPos, result)) { result.hitSide = true; }
	    return result
	  }

	  // For relative vertical movement. Dir may be -1 or 1. Unit can be
	  // "page" or "line". The resulting position will have a hitSide=true
	  // property if it reached the end of the document.
	  function findPosV(cm, pos, dir, unit) {
	    var doc = cm.doc, x = pos.left, y;
	    if (unit == "page") {
	      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
	      var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
	      y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;

	    } else if (unit == "line") {
	      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
	    }
	    var target;
	    for (;;) {
	      target = coordsChar(cm, x, y);
	      if (!target.outside) { break }
	      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
	      y += dir * 5;
	    }
	    return target
	  }

	  // CONTENTEDITABLE INPUT STYLE

	  var ContentEditableInput = function(cm) {
	    this.cm = cm;
	    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
	    this.polling = new Delayed();
	    this.composing = null;
	    this.gracePeriod = false;
	    this.readDOMTimeout = null;
	  };

	  ContentEditableInput.prototype.init = function (display) {
	      var this$1 = this;

	    var input = this, cm = input.cm;
	    var div = input.div = display.lineDiv;
	    disableBrowserMagic(div, cm.options.spellcheck, cm.options.autocorrect, cm.options.autocapitalize);

	    on(div, "paste", function (e) {
	      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
	      // IE doesn't fire input events, so we schedule a read for the pasted content in this way
	      if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20); }
	    });

	    on(div, "compositionstart", function (e) {
	      this$1.composing = {data: e.data, done: false};
	    });
	    on(div, "compositionupdate", function (e) {
	      if (!this$1.composing) { this$1.composing = {data: e.data, done: false}; }
	    });
	    on(div, "compositionend", function (e) {
	      if (this$1.composing) {
	        if (e.data != this$1.composing.data) { this$1.readFromDOMSoon(); }
	        this$1.composing.done = true;
	      }
	    });

	    on(div, "touchstart", function () { return input.forceCompositionEnd(); });

	    on(div, "input", function () {
	      if (!this$1.composing) { this$1.readFromDOMSoon(); }
	    });

	    function onCopyCut(e) {
	      if (signalDOMEvent(cm, e)) { return }
	      if (cm.somethingSelected()) {
	        setLastCopied({lineWise: false, text: cm.getSelections()});
	        if (e.type == "cut") { cm.replaceSelection("", null, "cut"); }
	      } else if (!cm.options.lineWiseCopyCut) {
	        return
	      } else {
	        var ranges = copyableRanges(cm);
	        setLastCopied({lineWise: true, text: ranges.text});
	        if (e.type == "cut") {
	          cm.operation(function () {
	            cm.setSelections(ranges.ranges, 0, sel_dontScroll);
	            cm.replaceSelection("", null, "cut");
	          });
	        }
	      }
	      if (e.clipboardData) {
	        e.clipboardData.clearData();
	        var content = lastCopied.text.join("\n");
	        // iOS exposes the clipboard API, but seems to discard content inserted into it
	        e.clipboardData.setData("Text", content);
	        if (e.clipboardData.getData("Text") == content) {
	          e.preventDefault();
	          return
	        }
	      }
	      // Old-fashioned briefly-focus-a-textarea hack
	      var kludge = hiddenTextarea(), te = kludge.firstChild;
	      cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
	      te.value = lastCopied.text.join("\n");
	      var hadFocus = document.activeElement;
	      selectInput(te);
	      setTimeout(function () {
	        cm.display.lineSpace.removeChild(kludge);
	        hadFocus.focus();
	        if (hadFocus == div) { input.showPrimarySelection(); }
	      }, 50);
	    }
	    on(div, "copy", onCopyCut);
	    on(div, "cut", onCopyCut);
	  };

	  ContentEditableInput.prototype.prepareSelection = function () {
	    var result = prepareSelection(this.cm, false);
	    result.focus = this.cm.state.focused;
	    return result
	  };

	  ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
	    if (!info || !this.cm.display.view.length) { return }
	    if (info.focus || takeFocus) { this.showPrimarySelection(); }
	    this.showMultipleSelections(info);
	  };

	  ContentEditableInput.prototype.getSelection = function () {
	    return this.cm.display.wrapper.ownerDocument.getSelection()
	  };

	  ContentEditableInput.prototype.showPrimarySelection = function () {
	    var sel = this.getSelection(), cm = this.cm, prim = cm.doc.sel.primary();
	    var from = prim.from(), to = prim.to();

	    if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
	      sel.removeAllRanges();
	      return
	    }

	    var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
	    var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
	    if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
	        cmp(minPos(curAnchor, curFocus), from) == 0 &&
	        cmp(maxPos(curAnchor, curFocus), to) == 0)
	      { return }

	    var view = cm.display.view;
	    var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
	        {node: view[0].measure.map[2], offset: 0};
	    var end = to.line < cm.display.viewTo && posToDOM(cm, to);
	    if (!end) {
	      var measure = view[view.length - 1].measure;
	      var map$$1 = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
	      end = {node: map$$1[map$$1.length - 1], offset: map$$1[map$$1.length - 2] - map$$1[map$$1.length - 3]};
	    }

	    if (!start || !end) {
	      sel.removeAllRanges();
	      return
	    }

	    var old = sel.rangeCount && sel.getRangeAt(0), rng;
	    try { rng = range(start.node, start.offset, end.offset, end.node); }
	    catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
	    if (rng) {
	      if (!gecko && cm.state.focused) {
	        sel.collapse(start.node, start.offset);
	        if (!rng.collapsed) {
	          sel.removeAllRanges();
	          sel.addRange(rng);
	        }
	      } else {
	        sel.removeAllRanges();
	        sel.addRange(rng);
	      }
	      if (old && sel.anchorNode == null) { sel.addRange(old); }
	      else if (gecko) { this.startGracePeriod(); }
	    }
	    this.rememberSelection();
	  };

	  ContentEditableInput.prototype.startGracePeriod = function () {
	      var this$1 = this;

	    clearTimeout(this.gracePeriod);
	    this.gracePeriod = setTimeout(function () {
	      this$1.gracePeriod = false;
	      if (this$1.selectionChanged())
	        { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }); }
	    }, 20);
	  };

	  ContentEditableInput.prototype.showMultipleSelections = function (info) {
	    removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
	    removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
	  };

	  ContentEditableInput.prototype.rememberSelection = function () {
	    var sel = this.getSelection();
	    this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
	    this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
	  };

	  ContentEditableInput.prototype.selectionInEditor = function () {
	    var sel = this.getSelection();
	    if (!sel.rangeCount) { return false }
	    var node = sel.getRangeAt(0).commonAncestorContainer;
	    return contains(this.div, node)
	  };

	  ContentEditableInput.prototype.focus = function () {
	    if (this.cm.options.readOnly != "nocursor") {
	      if (!this.selectionInEditor())
	        { this.showSelection(this.prepareSelection(), true); }
	      this.div.focus();
	    }
	  };
	  ContentEditableInput.prototype.blur = function () { this.div.blur(); };
	  ContentEditableInput.prototype.getField = function () { return this.div };

	  ContentEditableInput.prototype.supportsTouch = function () { return true };

	  ContentEditableInput.prototype.receivedFocus = function () {
	    var input = this;
	    if (this.selectionInEditor())
	      { this.pollSelection(); }
	    else
	      { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }); }

	    function poll() {
	      if (input.cm.state.focused) {
	        input.pollSelection();
	        input.polling.set(input.cm.options.pollInterval, poll);
	      }
	    }
	    this.polling.set(this.cm.options.pollInterval, poll);
	  };

	  ContentEditableInput.prototype.selectionChanged = function () {
	    var sel = this.getSelection();
	    return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
	      sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
	  };

	  ContentEditableInput.prototype.pollSelection = function () {
	    if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
	    var sel = this.getSelection(), cm = this.cm;
	    // On Android Chrome (version 56, at least), backspacing into an
	    // uneditable block element will put the cursor in that element,
	    // and then, because it's not editable, hide the virtual keyboard.
	    // Because Android doesn't allow us to actually detect backspace
	    // presses in a sane way, this code checks for when that happens
	    // and simulates a backspace press in this case.
	    if (android && chrome && this.cm.options.gutters.length && isInGutter(sel.anchorNode)) {
	      this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs});
	      this.blur();
	      this.focus();
	      return
	    }
	    if (this.composing) { return }
	    this.rememberSelection();
	    var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
	    var head = domToPos(cm, sel.focusNode, sel.focusOffset);
	    if (anchor && head) { runInOp(cm, function () {
	      setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
	      if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true; }
	    }); }
	  };

	  ContentEditableInput.prototype.pollContent = function () {
	    if (this.readDOMTimeout != null) {
	      clearTimeout(this.readDOMTimeout);
	      this.readDOMTimeout = null;
	    }

	    var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
	    var from = sel.from(), to = sel.to();
	    if (from.ch == 0 && from.line > cm.firstLine())
	      { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length); }
	    if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
	      { to = Pos(to.line + 1, 0); }
	    if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

	    var fromIndex, fromLine, fromNode;
	    if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
	      fromLine = lineNo(display.view[0].line);
	      fromNode = display.view[0].node;
	    } else {
	      fromLine = lineNo(display.view[fromIndex].line);
	      fromNode = display.view[fromIndex - 1].node.nextSibling;
	    }
	    var toIndex = findViewIndex(cm, to.line);
	    var toLine, toNode;
	    if (toIndex == display.view.length - 1) {
	      toLine = display.viewTo - 1;
	      toNode = display.lineDiv.lastChild;
	    } else {
	      toLine = lineNo(display.view[toIndex + 1].line) - 1;
	      toNode = display.view[toIndex + 1].node.previousSibling;
	    }

	    if (!fromNode) { return false }
	    var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
	    var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
	    while (newText.length > 1 && oldText.length > 1) {
	      if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
	      else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
	      else { break }
	    }

	    var cutFront = 0, cutEnd = 0;
	    var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
	    while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
	      { ++cutFront; }
	    var newBot = lst(newText), oldBot = lst(oldText);
	    var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
	                             oldBot.length - (oldText.length == 1 ? cutFront : 0));
	    while (cutEnd < maxCutEnd &&
	           newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
	      { ++cutEnd; }
	    // Try to move start of change to start of selection if ambiguous
	    if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
	      while (cutFront && cutFront > from.ch &&
	             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
	        cutFront--;
	        cutEnd++;
	      }
	    }

	    newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
	    newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

	    var chFrom = Pos(fromLine, cutFront);
	    var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
	    if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
	      replaceRange(cm.doc, newText, chFrom, chTo, "+input");
	      return true
	    }
	  };

	  ContentEditableInput.prototype.ensurePolled = function () {
	    this.forceCompositionEnd();
	  };
	  ContentEditableInput.prototype.reset = function () {
	    this.forceCompositionEnd();
	  };
	  ContentEditableInput.prototype.forceCompositionEnd = function () {
	    if (!this.composing) { return }
	    clearTimeout(this.readDOMTimeout);
	    this.composing = null;
	    this.updateFromDOM();
	    this.div.blur();
	    this.div.focus();
	  };
	  ContentEditableInput.prototype.readFromDOMSoon = function () {
	      var this$1 = this;

	    if (this.readDOMTimeout != null) { return }
	    this.readDOMTimeout = setTimeout(function () {
	      this$1.readDOMTimeout = null;
	      if (this$1.composing) {
	        if (this$1.composing.done) { this$1.composing = null; }
	        else { return }
	      }
	      this$1.updateFromDOM();
	    }, 80);
	  };

	  ContentEditableInput.prototype.updateFromDOM = function () {
	      var this$1 = this;

	    if (this.cm.isReadOnly() || !this.pollContent())
	      { runInOp(this.cm, function () { return regChange(this$1.cm); }); }
	  };

	  ContentEditableInput.prototype.setUneditable = function (node) {
	    node.contentEditable = "false";
	  };

	  ContentEditableInput.prototype.onKeyPress = function (e) {
	    if (e.charCode == 0 || this.composing) { return }
	    e.preventDefault();
	    if (!this.cm.isReadOnly())
	      { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0); }
	  };

	  ContentEditableInput.prototype.readOnlyChanged = function (val) {
	    this.div.contentEditable = String(val != "nocursor");
	  };

	  ContentEditableInput.prototype.onContextMenu = function () {};
	  ContentEditableInput.prototype.resetPosition = function () {};

	  ContentEditableInput.prototype.needsContentAttribute = true;

	  function posToDOM(cm, pos) {
	    var view = findViewForLine(cm, pos.line);
	    if (!view || view.hidden) { return null }
	    var line = getLine(cm.doc, pos.line);
	    var info = mapFromLineView(view, line, pos.line);

	    var order = getOrder(line, cm.doc.direction), side = "left";
	    if (order) {
	      var partPos = getBidiPartAt(order, pos.ch);
	      side = partPos % 2 ? "right" : "left";
	    }
	    var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
	    result.offset = result.collapse == "right" ? result.end : result.start;
	    return result
	  }

	  function isInGutter(node) {
	    for (var scan = node; scan; scan = scan.parentNode)
	      { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
	    return false
	  }

	  function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

	  function domTextBetween(cm, from, to, fromLine, toLine) {
	    var text = "", closing = false, lineSep = cm.doc.lineSeparator(), extraLinebreak = false;
	    function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
	    function close() {
	      if (closing) {
	        text += lineSep;
	        if (extraLinebreak) { text += lineSep; }
	        closing = extraLinebreak = false;
	      }
	    }
	    function addText(str) {
	      if (str) {
	        close();
	        text += str;
	      }
	    }
	    function walk(node) {
	      if (node.nodeType == 1) {
	        var cmText = node.getAttribute("cm-text");
	        if (cmText) {
	          addText(cmText);
	          return
	        }
	        var markerID = node.getAttribute("cm-marker"), range$$1;
	        if (markerID) {
	          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
	          if (found.length && (range$$1 = found[0].find(0)))
	            { addText(getBetween(cm.doc, range$$1.from, range$$1.to).join(lineSep)); }
	          return
	        }
	        if (node.getAttribute("contenteditable") == "false") { return }
	        var isBlock = /^(pre|div|p|li|table|br)$/i.test(node.nodeName);
	        if (!/^br$/i.test(node.nodeName) && node.textContent.length == 0) { return }

	        if (isBlock) { close(); }
	        for (var i = 0; i < node.childNodes.length; i++)
	          { walk(node.childNodes[i]); }

	        if (/^(pre|p)$/i.test(node.nodeName)) { extraLinebreak = true; }
	        if (isBlock) { closing = true; }
	      } else if (node.nodeType == 3) {
	        addText(node.nodeValue.replace(/\u200b/g, "").replace(/\u00a0/g, " "));
	      }
	    }
	    for (;;) {
	      walk(from);
	      if (from == to) { break }
	      from = from.nextSibling;
	      extraLinebreak = false;
	    }
	    return text
	  }

	  function domToPos(cm, node, offset) {
	    var lineNode;
	    if (node == cm.display.lineDiv) {
	      lineNode = cm.display.lineDiv.childNodes[offset];
	      if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
	      node = null; offset = 0;
	    } else {
	      for (lineNode = node;; lineNode = lineNode.parentNode) {
	        if (!lineNode || lineNode == cm.display.lineDiv) { return null }
	        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
	      }
	    }
	    for (var i = 0; i < cm.display.view.length; i++) {
	      var lineView = cm.display.view[i];
	      if (lineView.node == lineNode)
	        { return locateNodeInLineView(lineView, node, offset) }
	    }
	  }

	  function locateNodeInLineView(lineView, node, offset) {
	    var wrapper = lineView.text.firstChild, bad = false;
	    if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
	    if (node == wrapper) {
	      bad = true;
	      node = wrapper.childNodes[offset];
	      offset = 0;
	      if (!node) {
	        var line = lineView.rest ? lst(lineView.rest) : lineView.line;
	        return badPos(Pos(lineNo(line), line.text.length), bad)
	      }
	    }

	    var textNode = node.nodeType == 3 ? node : null, topNode = node;
	    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
	      textNode = node.firstChild;
	      if (offset) { offset = textNode.nodeValue.length; }
	    }
	    while (topNode.parentNode != wrapper) { topNode = topNode.parentNode; }
	    var measure = lineView.measure, maps = measure.maps;

	    function find(textNode, topNode, offset) {
	      for (var i = -1; i < (maps ? maps.length : 0); i++) {
	        var map$$1 = i < 0 ? measure.map : maps[i];
	        for (var j = 0; j < map$$1.length; j += 3) {
	          var curNode = map$$1[j + 2];
	          if (curNode == textNode || curNode == topNode) {
	            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
	            var ch = map$$1[j] + offset;
	            if (offset < 0 || curNode != textNode) { ch = map$$1[j + (offset ? 1 : 0)]; }
	            return Pos(line, ch)
	          }
	        }
	      }
	    }
	    var found = find(textNode, topNode, offset);
	    if (found) { return badPos(found, bad) }

	    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
	    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
	      found = find(after, after.firstChild, 0);
	      if (found)
	        { return badPos(Pos(found.line, found.ch - dist), bad) }
	      else
	        { dist += after.textContent.length; }
	    }
	    for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
	      found = find(before, before.firstChild, -1);
	      if (found)
	        { return badPos(Pos(found.line, found.ch + dist$1), bad) }
	      else
	        { dist$1 += before.textContent.length; }
	    }
	  }

	  // TEXTAREA INPUT STYLE

	  var TextareaInput = function(cm) {
	    this.cm = cm;
	    // See input.poll and input.reset
	    this.prevInput = "";

	    // Flag that indicates whether we expect input to appear real soon
	    // now (after some event like 'keypress' or 'input') and are
	    // polling intensively.
	    this.pollingFast = false;
	    // Self-resetting timeout for the poller
	    this.polling = new Delayed();
	    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
	    this.hasSelection = false;
	    this.composing = null;
	  };

	  TextareaInput.prototype.init = function (display) {
	      var this$1 = this;

	    var input = this, cm = this.cm;
	    this.createField(display);
	    var te = this.textarea;

	    display.wrapper.insertBefore(this.wrapper, display.wrapper.firstChild);

	    // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
	    if (ios) { te.style.width = "0px"; }

	    on(te, "input", function () {
	      if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null; }
	      input.poll();
	    });

	    on(te, "paste", function (e) {
	      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

	      cm.state.pasteIncoming = true;
	      input.fastPoll();
	    });

	    function prepareCopyCut(e) {
	      if (signalDOMEvent(cm, e)) { return }
	      if (cm.somethingSelected()) {
	        setLastCopied({lineWise: false, text: cm.getSelections()});
	      } else if (!cm.options.lineWiseCopyCut) {
	        return
	      } else {
	        var ranges = copyableRanges(cm);
	        setLastCopied({lineWise: true, text: ranges.text});
	        if (e.type == "cut") {
	          cm.setSelections(ranges.ranges, null, sel_dontScroll);
	        } else {
	          input.prevInput = "";
	          te.value = ranges.text.join("\n");
	          selectInput(te);
	        }
	      }
	      if (e.type == "cut") { cm.state.cutIncoming = true; }
	    }
	    on(te, "cut", prepareCopyCut);
	    on(te, "copy", prepareCopyCut);

	    on(display.scroller, "paste", function (e) {
	      if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
	      cm.state.pasteIncoming = true;
	      input.focus();
	    });

	    // Prevent normal selection in the editor (we handle our own)
	    on(display.lineSpace, "selectstart", function (e) {
	      if (!eventInWidget(display, e)) { e_preventDefault(e); }
	    });

	    on(te, "compositionstart", function () {
	      var start = cm.getCursor("from");
	      if (input.composing) { input.composing.range.clear(); }
	      input.composing = {
	        start: start,
	        range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
	      };
	    });
	    on(te, "compositionend", function () {
	      if (input.composing) {
	        input.poll();
	        input.composing.range.clear();
	        input.composing = null;
	      }
	    });
	  };

	  TextareaInput.prototype.createField = function (_display) {
	    // Wraps and hides input textarea
	    this.wrapper = hiddenTextarea();
	    // The semihidden textarea that is focused when the editor is
	    // focused, and receives input.
	    this.textarea = this.wrapper.firstChild;
	  };

	  TextareaInput.prototype.prepareSelection = function () {
	    // Redraw the selection and/or cursor
	    var cm = this.cm, display = cm.display, doc = cm.doc;
	    var result = prepareSelection(cm);

	    // Move the hidden textarea near the cursor to prevent scrolling artifacts
	    if (cm.options.moveInputWithCursor) {
	      var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
	      var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
	      result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
	                                          headPos.top + lineOff.top - wrapOff.top));
	      result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
	                                           headPos.left + lineOff.left - wrapOff.left));
	    }

	    return result
	  };

	  TextareaInput.prototype.showSelection = function (drawn) {
	    var cm = this.cm, display = cm.display;
	    removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
	    removeChildrenAndAdd(display.selectionDiv, drawn.selection);
	    if (drawn.teTop != null) {
	      this.wrapper.style.top = drawn.teTop + "px";
	      this.wrapper.style.left = drawn.teLeft + "px";
	    }
	  };

	  // Reset the input to correspond to the selection (or to be empty,
	  // when not typing and nothing is selected)
	  TextareaInput.prototype.reset = function (typing) {
	    if (this.contextMenuPending || this.composing) { return }
	    var cm = this.cm;
	    if (cm.somethingSelected()) {
	      this.prevInput = "";
	      var content = cm.getSelection();
	      this.textarea.value = content;
	      if (cm.state.focused) { selectInput(this.textarea); }
	      if (ie && ie_version >= 9) { this.hasSelection = content; }
	    } else if (!typing) {
	      this.prevInput = this.textarea.value = "";
	      if (ie && ie_version >= 9) { this.hasSelection = null; }
	    }
	  };

	  TextareaInput.prototype.getField = function () { return this.textarea };

	  TextareaInput.prototype.supportsTouch = function () { return false };

	  TextareaInput.prototype.focus = function () {
	    if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
	      try { this.textarea.focus(); }
	      catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
	    }
	  };

	  TextareaInput.prototype.blur = function () { this.textarea.blur(); };

	  TextareaInput.prototype.resetPosition = function () {
	    this.wrapper.style.top = this.wrapper.style.left = 0;
	  };

	  TextareaInput.prototype.receivedFocus = function () { this.slowPoll(); };

	  // Poll for input changes, using the normal rate of polling. This
	  // runs as long as the editor is focused.
	  TextareaInput.prototype.slowPoll = function () {
	      var this$1 = this;

	    if (this.pollingFast) { return }
	    this.polling.set(this.cm.options.pollInterval, function () {
	      this$1.poll();
	      if (this$1.cm.state.focused) { this$1.slowPoll(); }
	    });
	  };

	  // When an event has just come in that is likely to add or change
	  // something in the input textarea, we poll faster, to ensure that
	  // the change appears on the screen quickly.
	  TextareaInput.prototype.fastPoll = function () {
	    var missed = false, input = this;
	    input.pollingFast = true;
	    function p() {
	      var changed = input.poll();
	      if (!changed && !missed) {missed = true; input.polling.set(60, p);}
	      else {input.pollingFast = false; input.slowPoll();}
	    }
	    input.polling.set(20, p);
	  };

	  // Read input from the textarea, and update the document to match.
	  // When something is selected, it is present in the textarea, and
	  // selected (unless it is huge, in which case a placeholder is
	  // used). When nothing is selected, the cursor sits after previously
	  // seen text (can be empty), which is stored in prevInput (we must
	  // not reset the textarea when typing, because that breaks IME).
	  TextareaInput.prototype.poll = function () {
	      var this$1 = this;

	    var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
	    // Since this is called a *lot*, try to bail out as cheaply as
	    // possible when it is clear that nothing happened. hasSelection
	    // will be the case when there is a lot of text in the textarea,
	    // in which case reading its value would be expensive.
	    if (this.contextMenuPending || !cm.state.focused ||
	        (hasSelection(input) && !prevInput && !this.composing) ||
	        cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
	      { return false }

	    var text = input.value;
	    // If nothing changed, bail.
	    if (text == prevInput && !cm.somethingSelected()) { return false }
	    // Work around nonsensical selection resetting in IE9/10, and
	    // inexplicable appearance of private area unicode characters on
	    // some key combos in Mac (#2689).
	    if (ie && ie_version >= 9 && this.hasSelection === text ||
	        mac && /[\uf700-\uf7ff]/.test(text)) {
	      cm.display.input.reset();
	      return false
	    }

	    if (cm.doc.sel == cm.display.selForContextMenu) {
	      var first = text.charCodeAt(0);
	      if (first == 0x200b && !prevInput) { prevInput = "\u200b"; }
	      if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
	    }
	    // Find the part of the input that is actually new
	    var same = 0, l = Math.min(prevInput.length, text.length);
	    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same; }

	    runInOp(cm, function () {
	      applyTextInput(cm, text.slice(same), prevInput.length - same,
	                     null, this$1.composing ? "*compose" : null);

	      // Don't leave long text in the textarea, since it makes further polling slow
	      if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = ""; }
	      else { this$1.prevInput = text; }

	      if (this$1.composing) {
	        this$1.composing.range.clear();
	        this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
	                                           {className: "CodeMirror-composing"});
	      }
	    });
	    return true
	  };

	  TextareaInput.prototype.ensurePolled = function () {
	    if (this.pollingFast && this.poll()) { this.pollingFast = false; }
	  };

	  TextareaInput.prototype.onKeyPress = function () {
	    if (ie && ie_version >= 9) { this.hasSelection = null; }
	    this.fastPoll();
	  };

	  TextareaInput.prototype.onContextMenu = function (e) {
	    var input = this, cm = input.cm, display = cm.display, te = input.textarea;
	    if (input.contextMenuPending) { input.contextMenuPending(); }
	    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
	    if (!pos || presto) { return } // Opera is difficult.

	    // Reset the current text selection only if the click is done outside of the selection
	    // and 'resetSelectionOnContextMenu' option is true.
	    var reset = cm.options.resetSelectionOnContextMenu;
	    if (reset && cm.doc.sel.contains(pos) == -1)
	      { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll); }

	    var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText;
	    var wrapperBox = input.wrapper.offsetParent.getBoundingClientRect();
	    input.wrapper.style.cssText = "position: static";
	    te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
	    var oldScrollY;
	    if (webkit) { oldScrollY = window.scrollY; } // Work around Chrome issue (#2712)
	    display.input.focus();
	    if (webkit) { window.scrollTo(null, oldScrollY); }
	    display.input.reset();
	    // Adds "Select all" to context menu in FF
	    if (!cm.somethingSelected()) { te.value = input.prevInput = " "; }
	    input.contextMenuPending = rehide;
	    display.selForContextMenu = cm.doc.sel;
	    clearTimeout(display.detectingSelectAll);

	    // Select-all will be greyed out if there's nothing to select, so
	    // this adds a zero-width space so that we can later check whether
	    // it got selected.
	    function prepareSelectAllHack() {
	      if (te.selectionStart != null) {
	        var selected = cm.somethingSelected();
	        var extval = "\u200b" + (selected ? te.value : "");
	        te.value = "\u21da"; // Used to catch context-menu undo
	        te.value = extval;
	        input.prevInput = selected ? "" : "\u200b";
	        te.selectionStart = 1; te.selectionEnd = extval.length;
	        // Re-set this, in case some other handler touched the
	        // selection in the meantime.
	        display.selForContextMenu = cm.doc.sel;
	      }
	    }
	    function rehide() {
	      if (input.contextMenuPending != rehide) { return }
	      input.contextMenuPending = false;
	      input.wrapper.style.cssText = oldWrapperCSS;
	      te.style.cssText = oldCSS;
	      if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos); }

	      // Try to detect the user choosing select-all
	      if (te.selectionStart != null) {
	        if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack(); }
	        var i = 0, poll = function () {
	          if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
	              te.selectionEnd > 0 && input.prevInput == "\u200b") {
	            operation(cm, selectAll)(cm);
	          } else if (i++ < 10) {
	            display.detectingSelectAll = setTimeout(poll, 500);
	          } else {
	            display.selForContextMenu = null;
	            display.input.reset();
	          }
	        };
	        display.detectingSelectAll = setTimeout(poll, 200);
	      }
	    }

	    if (ie && ie_version >= 9) { prepareSelectAllHack(); }
	    if (captureRightClick) {
	      e_stop(e);
	      var mouseup = function () {
	        off(window, "mouseup", mouseup);
	        setTimeout(rehide, 20);
	      };
	      on(window, "mouseup", mouseup);
	    } else {
	      setTimeout(rehide, 50);
	    }
	  };

	  TextareaInput.prototype.readOnlyChanged = function (val) {
	    if (!val) { this.reset(); }
	    this.textarea.disabled = val == "nocursor";
	  };

	  TextareaInput.prototype.setUneditable = function () {};

	  TextareaInput.prototype.needsContentAttribute = false;

	  function fromTextArea(textarea, options) {
	    options = options ? copyObj(options) : {};
	    options.value = textarea.value;
	    if (!options.tabindex && textarea.tabIndex)
	      { options.tabindex = textarea.tabIndex; }
	    if (!options.placeholder && textarea.placeholder)
	      { options.placeholder = textarea.placeholder; }
	    // Set autofocus to true if this textarea is focused, or if it has
	    // autofocus and no other element is focused.
	    if (options.autofocus == null) {
	      var hasFocus = activeElt();
	      options.autofocus = hasFocus == textarea ||
	        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
	    }

	    function save() {textarea.value = cm.getValue();}

	    var realSubmit;
	    if (textarea.form) {
	      on(textarea.form, "submit", save);
	      // Deplorable hack to make the submit method do the right thing.
	      if (!options.leaveSubmitMethodAlone) {
	        var form = textarea.form;
	        realSubmit = form.submit;
	        try {
	          var wrappedSubmit = form.submit = function () {
	            save();
	            form.submit = realSubmit;
	            form.submit();
	            form.submit = wrappedSubmit;
	          };
	        } catch(e) {}
	      }
	    }

	    options.finishInit = function (cm) {
	      cm.save = save;
	      cm.getTextArea = function () { return textarea; };
	      cm.toTextArea = function () {
	        cm.toTextArea = isNaN; // Prevent this from being ran twice
	        save();
	        textarea.parentNode.removeChild(cm.getWrapperElement());
	        textarea.style.display = "";
	        if (textarea.form) {
	          off(textarea.form, "submit", save);
	          if (typeof textarea.form.submit == "function")
	            { textarea.form.submit = realSubmit; }
	        }
	      };
	    };

	    textarea.style.display = "none";
	    var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
	      options);
	    return cm
	  }

	  function addLegacyProps(CodeMirror) {
	    CodeMirror.off = off;
	    CodeMirror.on = on;
	    CodeMirror.wheelEventPixels = wheelEventPixels;
	    CodeMirror.Doc = Doc;
	    CodeMirror.splitLines = splitLinesAuto;
	    CodeMirror.countColumn = countColumn;
	    CodeMirror.findColumn = findColumn;
	    CodeMirror.isWordChar = isWordCharBasic;
	    CodeMirror.Pass = Pass;
	    CodeMirror.signal = signal;
	    CodeMirror.Line = Line;
	    CodeMirror.changeEnd = changeEnd;
	    CodeMirror.scrollbarModel = scrollbarModel;
	    CodeMirror.Pos = Pos;
	    CodeMirror.cmpPos = cmp;
	    CodeMirror.modes = modes;
	    CodeMirror.mimeModes = mimeModes;
	    CodeMirror.resolveMode = resolveMode;
	    CodeMirror.getMode = getMode;
	    CodeMirror.modeExtensions = modeExtensions;
	    CodeMirror.extendMode = extendMode;
	    CodeMirror.copyState = copyState;
	    CodeMirror.startState = startState;
	    CodeMirror.innerMode = innerMode;
	    CodeMirror.commands = commands;
	    CodeMirror.keyMap = keyMap;
	    CodeMirror.keyName = keyName;
	    CodeMirror.isModifierKey = isModifierKey;
	    CodeMirror.lookupKey = lookupKey;
	    CodeMirror.normalizeKeyMap = normalizeKeyMap;
	    CodeMirror.StringStream = StringStream;
	    CodeMirror.SharedTextMarker = SharedTextMarker;
	    CodeMirror.TextMarker = TextMarker;
	    CodeMirror.LineWidget = LineWidget;
	    CodeMirror.e_preventDefault = e_preventDefault;
	    CodeMirror.e_stopPropagation = e_stopPropagation;
	    CodeMirror.e_stop = e_stop;
	    CodeMirror.addClass = addClass;
	    CodeMirror.contains = contains;
	    CodeMirror.rmClass = rmClass;
	    CodeMirror.keyNames = keyNames;
	  }

	  // EDITOR CONSTRUCTOR

	  defineOptions(CodeMirror);

	  addEditorMethods(CodeMirror);

	  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
	  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
	  for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
	    { CodeMirror.prototype[prop] = (function(method) {
	      return function() {return method.apply(this.doc, arguments)}
	    })(Doc.prototype[prop]); } }

	  eventMixin(Doc);
	  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

	  // Extra arguments are stored as the mode's dependencies, which is
	  // used by (legacy) mechanisms like loadmode.js to automatically
	  // load a mode. (Preferred mechanism is the require/define calls.)
	  CodeMirror.defineMode = function(name/*, mode, …*/) {
	    if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name; }
	    defineMode.apply(this, arguments);
	  };

	  CodeMirror.defineMIME = defineMIME;

	  // Minimal default mode.
	  CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); });
	  CodeMirror.defineMIME("text/plain", "null");

	  // EXTENSIONS

	  CodeMirror.defineExtension = function (name, func) {
	    CodeMirror.prototype[name] = func;
	  };
	  CodeMirror.defineDocExtension = function (name, func) {
	    Doc.prototype[name] = func;
	  };

	  CodeMirror.fromTextArea = fromTextArea;

	  addLegacyProps(CodeMirror);

	  CodeMirror.version = "5.43.0";

	  return CodeMirror;

	})));

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE

	var mac = /Mac/.test(navigator.platform);

	(function(mod) {
	  if (typeof exports == "object" && typeof module == "object") // CommonJS
	    mod(require("../../lib/codemirror"));
	  else if (typeof define == "function" && define.amd) // AMD
	    define(["../../lib/codemirror"], mod);
	  else // Plain browser env
	    mod(CodeMirror);
	})(function(CodeMirror) {

	  var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
	  var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

	  // This is the old interface, kept around for now to stay
	  // backwards-compatible.
	  CodeMirror.showHint = function(cm, getHints, options) {
	    if (!getHints) return cm.showHint(options);
	    if (options && options.async) getHints.async = true;
	    var newOpts = {hint: getHints};
	    if (options) for (var prop in options) newOpts[prop] = options[prop];
	    return cm.showHint(newOpts);
	  };

	  CodeMirror.defineExtension("showHint", function(options) {
	    options = parseOptions(this, this.getCursor("start"), options);
	    var selections = this.listSelections();
	    if (selections.length > 1) return;
	    // By default, don't allow completion when something is selected.
	    // A hint function can have a `supportsSelection` property to
	    // indicate that it can handle selections.
	    if (this.somethingSelected()) {
	      if (!options.hint.supportsSelection) return;
	      // Don't try with cross-line selections
	      for (var i = 0; i < selections.length; i++)
	        if (selections[i].head.line != selections[i].anchor.line) return;
	    }

	    if (this.state.completionActive) this.state.completionActive.close();
	    var completion = this.state.completionActive = new Completion(this, options);
	    if (!completion.options.hint) return;

	    CodeMirror.signal(this, "startCompletion", this);
	    completion.update(true);
	  });

	  CodeMirror.defineExtension("closeHint", function() {
	    if (this.state.completionActive) this.state.completionActive.close();
	  });

	  function Completion(cm, options) {
	    this.cm = cm;
	    this.options = options;
	    this.widget = null;
	    this.debounce = 0;
	    this.tick = 0;
	    this.startPos = this.cm.getCursor("start");
	    this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

	    var self = this;
	    cm.on("cursorActivity", this.activityFunc = function() { self.cursorActivity(); });
	  }

	  var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
	    return setTimeout(fn, 1000/60);
	  };
	  var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

	  Completion.prototype = {
	    close: function() {
	      if (!this.active()) return;
	      this.cm.state.completionActive = null;
	      this.tick = null;
	      this.cm.off("cursorActivity", this.activityFunc);

	      if (this.widget && this.data) CodeMirror.signal(this.data, "close");
	      if (this.widget) this.widget.close();
	      CodeMirror.signal(this.cm, "endCompletion", this.cm);
	    },

	    active: function() {
	      return this.cm.state.completionActive == this;
	    },

	    pick: function(data, i) {
	      var completion = data.list[i];
	      if (completion.hint) completion.hint(this.cm, data, completion);
	      else this.cm.replaceRange(getText(completion), completion.from || data.from,
	                                completion.to || data.to, "complete");
	      CodeMirror.signal(data, "pick", completion);
	      this.close();
	    },

	    cursorActivity: function() {
	      if (this.debounce) {
	        cancelAnimationFrame(this.debounce);
	        this.debounce = 0;
	      }

	      var pos = this.cm.getCursor(), line = this.cm.getLine(pos.line);
	      if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
	          pos.ch < this.startPos.ch || this.cm.somethingSelected() ||
	          (!pos.ch || this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
	        this.close();
	      } else {
	        var self = this;
	        this.debounce = requestAnimationFrame(function() {self.update();});
	        if (this.widget) this.widget.disable();
	      }
	    },

	    update: function(first) {
	      if (this.tick == null) return
	      var self = this, myTick = ++this.tick;
	      fetchHints(this.options.hint, this.cm, this.options, function(data) {
	        if (self.tick == myTick) self.finishUpdate(data, first);
	      });
	    },

	    finishUpdate: function(data, first) {
	      if (this.data) CodeMirror.signal(this.data, "update");

	      var picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
	      if (this.widget) this.widget.close();

	      this.data = data;

	      if (data && data.list.length) {
	        if (picked && data.list.length == 1) {
	          this.pick(data, 0);
	        } else {
	          this.widget = new Widget(this, data);
	          CodeMirror.signal(data, "shown");
	        }
	      }
	    }
	  };

	  function parseOptions(cm, pos, options) {
	    var editor = cm.options.hintOptions;
	    var out = {};
	    for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
	    if (editor) for (var prop in editor)
	      if (editor[prop] !== undefined) out[prop] = editor[prop];
	    if (options) for (var prop in options)
	      if (options[prop] !== undefined) out[prop] = options[prop];
	    if (out.hint.resolve) out.hint = out.hint.resolve(cm, pos);
	    return out;
	  }

	  function getText(completion) {
	    if (typeof completion == "string") return completion;
	    else return completion.text;
	  }

	  function buildKeyMap(completion, handle) {
	    var baseMap = {
	      Up: function() {handle.moveFocus(-1);},
	      Down: function() {handle.moveFocus(1);},
	      PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
	      PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
	      Home: function() {handle.setFocus(0);},
	      End: function() {handle.setFocus(handle.length - 1);},
	      Enter: handle.pick,
	      Tab: handle.pick,
	      Esc: handle.close
	    };

	    if (mac) {
	      baseMap["Ctrl-P"] = function() {handle.moveFocus(-1);};
	      baseMap["Ctrl-N"] = function() {handle.moveFocus(1);};
	    }

	    var custom = completion.options.customKeys;
	    var ourMap = custom ? {} : baseMap;
	    function addBinding(key, val) {
	      var bound;
	      if (typeof val != "string")
	        bound = function(cm) { return val(cm, handle); };
	      // This mechanism is deprecated
	      else if (baseMap.hasOwnProperty(val))
	        bound = baseMap[val];
	      else
	        bound = val;
	      ourMap[key] = bound;
	    }
	    if (custom)
	      for (var key in custom) if (custom.hasOwnProperty(key))
	        addBinding(key, custom[key]);
	    var extra = completion.options.extraKeys;
	    if (extra)
	      for (var key in extra) if (extra.hasOwnProperty(key))
	        addBinding(key, extra[key]);
	    return ourMap;
	  }

	  function getHintElement(hintsElement, el) {
	    while (el && el != hintsElement) {
	      if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
	      el = el.parentNode;
	    }
	  }

	  function Widget(completion, data) {
	    this.completion = completion;
	    this.data = data;
	    this.picked = false;
	    var widget = this, cm = completion.cm;
	    var ownerDocument = cm.getInputField().ownerDocument;
	    var parentWindow = ownerDocument.defaultView || ownerDocument.parentWindow;

	    var hints = this.hints = ownerDocument.createElement("ul");
	    var theme = completion.cm.options.theme;
	    hints.className = "CodeMirror-hints " + theme;
	    this.selectedHint = data.selectedHint || 0;

	    var completions = data.list;
	    for (var i = 0; i < completions.length; ++i) {
	      var elt = hints.appendChild(ownerDocument.createElement("li")), cur = completions[i];
	      var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
	      if (cur.className != null) className = cur.className + " " + className;
	      elt.className = className;
	      if (cur.render) cur.render(elt, data, cur);
	      else elt.appendChild(ownerDocument.createTextNode(cur.displayText || getText(cur)));
	      elt.hintId = i;
	    }

	    var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
	    var left = pos.left, top = pos.bottom, below = true;
	    hints.style.left = left + "px";
	    hints.style.top = top + "px";
	    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
	    var winW = parentWindow.innerWidth || Math.max(ownerDocument.body.offsetWidth, ownerDocument.documentElement.offsetWidth);
	    var winH = parentWindow.innerHeight || Math.max(ownerDocument.body.offsetHeight, ownerDocument.documentElement.offsetHeight);
	    (completion.options.container || ownerDocument.body).appendChild(hints);
	    var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
	    var scrolls = hints.scrollHeight > hints.clientHeight + 1;
	    var startScroll = cm.getScrollInfo();

	    if (overlapY > 0) {
	      var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
	      if (curTop - height > 0) { // Fits above cursor
	        hints.style.top = (top = pos.top - height) + "px";
	        below = false;
	      } else if (height > winH) {
	        hints.style.height = (winH - 5) + "px";
	        hints.style.top = (top = pos.bottom - box.top) + "px";
	        var cursor = cm.getCursor();
	        if (data.from.ch != cursor.ch) {
	          pos = cm.cursorCoords(cursor);
	          hints.style.left = (left = pos.left) + "px";
	          box = hints.getBoundingClientRect();
	        }
	      }
	    }
	    var overlapX = box.right - winW;
	    if (overlapX > 0) {
	      if (box.right - box.left > winW) {
	        hints.style.width = (winW - 5) + "px";
	        overlapX -= (box.right - box.left) - winW;
	      }
	      hints.style.left = (left = pos.left - overlapX) + "px";
	    }
	    if (scrolls) for (var node = hints.firstChild; node; node = node.nextSibling)
	      node.style.paddingRight = cm.display.nativeBarWidth + "px";

	    cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
	      moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
	      setFocus: function(n) { widget.changeActive(n); },
	      menuSize: function() { return widget.screenAmount(); },
	      length: completions.length,
	      close: function() { completion.close(); },
	      pick: function() { widget.pick(); },
	      data: data
	    }));

	    if (completion.options.closeOnUnfocus) {
	      var closingOnBlur;
	      cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
	      cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
	    }

	    cm.on("scroll", this.onScroll = function() {
	      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
	      var newTop = top + startScroll.top - curScroll.top;
	      var point = newTop - (parentWindow.pageYOffset || (ownerDocument.documentElement || ownerDocument.body).scrollTop);
	      if (!below) point += hints.offsetHeight;
	      if (point <= editor.top || point >= editor.bottom) return completion.close();
	      hints.style.top = newTop + "px";
	      hints.style.left = (left + startScroll.left - curScroll.left) + "px";
	    });

	    CodeMirror.on(hints, "dblclick", function(e) {
	      var t = getHintElement(hints, e.target || e.srcElement);
	      if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
	    });

	    CodeMirror.on(hints, "click", function(e) {
	      var t = getHintElement(hints, e.target || e.srcElement);
	      if (t && t.hintId != null) {
	        widget.changeActive(t.hintId);
	        if (completion.options.completeOnSingleClick) widget.pick();
	      }
	    });

	    CodeMirror.on(hints, "mousedown", function() {
	      setTimeout(function(){cm.focus();}, 20);
	    });

	    CodeMirror.signal(data, "select", completions[this.selectedHint], hints.childNodes[this.selectedHint]);
	    return true;
	  }

	  Widget.prototype = {
	    close: function() {
	      if (this.completion.widget != this) return;
	      this.completion.widget = null;
	      this.hints.parentNode.removeChild(this.hints);
	      this.completion.cm.removeKeyMap(this.keyMap);

	      var cm = this.completion.cm;
	      if (this.completion.options.closeOnUnfocus) {
	        cm.off("blur", this.onBlur);
	        cm.off("focus", this.onFocus);
	      }
	      cm.off("scroll", this.onScroll);
	    },

	    disable: function() {
	      this.completion.cm.removeKeyMap(this.keyMap);
	      var widget = this;
	      this.keyMap = {Enter: function() { widget.picked = true; }};
	      this.completion.cm.addKeyMap(this.keyMap);
	    },

	    pick: function() {
	      this.completion.pick(this.data, this.selectedHint);
	    },

	    changeActive: function(i, avoidWrap) {
	      if (i >= this.data.list.length)
	        i = avoidWrap ? this.data.list.length - 1 : 0;
	      else if (i < 0)
	        i = avoidWrap ? 0  : this.data.list.length - 1;
	      if (this.selectedHint == i) return;
	      var node = this.hints.childNodes[this.selectedHint];
	      if (node) node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
	      node = this.hints.childNodes[this.selectedHint = i];
	      node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
	      if (node.offsetTop < this.hints.scrollTop)
	        this.hints.scrollTop = node.offsetTop - 3;
	      else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
	        this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
	      CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
	    },

	    screenAmount: function() {
	      return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
	    }
	  };

	  function applicableHelpers(cm, helpers) {
	    if (!cm.somethingSelected()) return helpers
	    var result = [];
	    for (var i = 0; i < helpers.length; i++)
	      if (helpers[i].supportsSelection) result.push(helpers[i]);
	    return result
	  }

	  function fetchHints(hint, cm, options, callback) {
	    if (hint.async) {
	      hint(cm, callback, options);
	    } else {
	      var result = hint(cm, options);
	      if (result && result.then) result.then(callback);
	      else callback(result);
	    }
	  }

	  function resolveAutoHints(cm, pos) {
	    var helpers = cm.getHelpers(pos, "hint"), words;
	    if (helpers.length) {
	      var resolved = function(cm, callback, options) {
	        var app = applicableHelpers(cm, helpers);
	        function run(i) {
	          if (i == app.length) return callback(null)
	          fetchHints(app[i], cm, options, function(result) {
	            if (result && result.list.length > 0) callback(result);
	            else run(i + 1);
	          });
	        }
	        run(0);
	      };
	      resolved.async = true;
	      resolved.supportsSelection = true;
	      return resolved
	    } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
	      return function(cm) { return CodeMirror.hint.fromList(cm, {words: words}) }
	    } else if (CodeMirror.hint.anyword) {
	      return function(cm, options) { return CodeMirror.hint.anyword(cm, options) }
	    } else {
	      return function() {}
	    }
	  }

	  CodeMirror.registerHelper("hint", "auto", {
	    resolve: resolveAutoHints
	  });

	  CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
	    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
	    var term, from = CodeMirror.Pos(cur.line, token.start), to = cur;
	    if (token.start < cur.ch && /\w/.test(token.string.charAt(cur.ch - token.start - 1))) {
	      term = token.string.substr(0, cur.ch - token.start);
	    } else {
	      term = "";
	      from = cur;
	    }
	    var found = [];
	    for (var i = 0; i < options.words.length; i++) {
	      var word = options.words[i];
	      if (word.slice(0, term.length) == term)
	        found.push(word);
	    }

	    if (found.length) return {list: found, from: from, to: to};
	  });

	  CodeMirror.commands.autocomplete = CodeMirror.showHint;

	  var defaultOptions = {
	    hint: CodeMirror.hint.auto,
	    completeSingle: true,
	    alignWithWord: true,
	    closeCharacters: /[\s()\[\]{};:>,]/,
	    closeOnUnfocus: true,
	    completeOnSingleClick: true,
	    container: null,
	    customKeys: null,
	    extraKeys: null
	  };

	  CodeMirror.defineOption("hintOptions", null);
	});

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE

	(function(mod) {
	  if (typeof exports == "object" && typeof module == "object") // CommonJS
	    mod(require("../../lib/codemirror"));
	  else if (typeof define == "function" && define.amd) // AMD
	    define(["../../lib/codemirror"], mod);
	  else // Plain browser env
	    mod(CodeMirror);
	})(function(CodeMirror) {
	  var Pos = CodeMirror.Pos;

	  function forEach(arr, f) {
	    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
	  }

	  function arrayContains(arr, item) {
	    if (!Array.prototype.indexOf) {
	      var i = arr.length;
	      while (i--) {
	        if (arr[i] === item) {
	          return true;
	        }
	      }
	      return false;
	    }
	    return arr.indexOf(item) != -1;
	  }

	  function scriptHint(editor, keywords, getToken, options) {
	    // Find the token at the cursor
	    var cur = editor.getCursor(), token = getToken(editor, cur);
	    if (/\b(?:string|comment)\b/.test(token.type)) return;
	    var innerMode = CodeMirror.innerMode(editor.getMode(), token.state);
	    if (innerMode.mode.helperType === "json") return;
	    token.state = innerMode.state;

	    // If it's not a 'word-style' token, ignore the token.
	    if (!/^[\w$_]*$/.test(token.string)) {
	      token = {start: cur.ch, end: cur.ch, string: "", state: token.state,
	               type: token.string == "." ? "property" : null};
	    } else if (token.end > cur.ch) {
	      token.end = cur.ch;
	      token.string = token.string.slice(0, cur.ch - token.start);
	    }

	    var tprop = token;
	    // If it is a property, find out what it is a property of.
	    while (tprop.type == "property") {
	      tprop = getToken(editor, Pos(cur.line, tprop.start));
	      if (tprop.string != ".") return;
	      tprop = getToken(editor, Pos(cur.line, tprop.start));
	      if (!context) var context = [];
	      context.push(tprop);
	    }
	    return {list: getCompletions(token, context, keywords, options),
	            from: Pos(cur.line, token.start),
	            to: Pos(cur.line, token.end)};
	  }

	  function javascriptHint(editor, options) {
	    return scriptHint(editor, javascriptKeywords,
	                      function (e, cur) {return e.getTokenAt(cur);},
	                      options);
	  }  CodeMirror.registerHelper("hint", "javascript", javascriptHint);

	  function getCoffeeScriptToken(editor, cur) {
	  // This getToken, it is for coffeescript, imitates the behavior of
	  // getTokenAt method in javascript.js, that is, returning "property"
	  // type and treat "." as indepenent token.
	    var token = editor.getTokenAt(cur);
	    if (cur.ch == token.start + 1 && token.string.charAt(0) == '.') {
	      token.end = token.start;
	      token.string = '.';
	      token.type = "property";
	    }
	    else if (/^\.[\w$_]*$/.test(token.string)) {
	      token.type = "property";
	      token.start++;
	      token.string = token.string.replace(/\./, '');
	    }
	    return token;
	  }

	  function coffeescriptHint(editor, options) {
	    return scriptHint(editor, coffeescriptKeywords, getCoffeeScriptToken, options);
	  }
	  CodeMirror.registerHelper("hint", "coffeescript", coffeescriptHint);

	  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
	                     "toUpperCase toLowerCase split concat match replace search").split(" ");
	  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
	                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
	  var funcProps = "prototype apply call bind".split(" ");
	  var javascriptKeywords = ("break case catch class const continue debugger default delete do else export extends false finally for function " +
	                  "if in import instanceof new null return super switch this throw true try typeof var void while with yield").split(" ");
	  var coffeescriptKeywords = ("and break catch class continue delete do else extends false finally for " +
	                  "if in instanceof isnt new no not null of off on or return switch then throw true try typeof until void while with yes").split(" ");

	  function forAllProps(obj, callback) {
	    if (!Object.getOwnPropertyNames || !Object.getPrototypeOf) {
	      for (var name in obj) callback(name);
	    } else {
	      for (var o = obj; o; o = Object.getPrototypeOf(o))
	        Object.getOwnPropertyNames(o).forEach(callback);
	    }
	  }

	  function getCompletions(token, context, keywords, options) {
	    var found = [], start = token.string, global = options && options.globalScope || window;
	    function maybeAdd(str) {
	      if (str.lastIndexOf(start, 0) == 0 && !arrayContains(found, str)) found.push(str);
	    }
	    function gatherCompletions(obj) {
	      if (typeof obj == "string") forEach(stringProps, maybeAdd);
	      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
	      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
	      forAllProps(obj, maybeAdd);
	    }

	    if (context && context.length) {
	      // If this is a property, see if it belongs to some object we can
	      // find in the current environment.
	      var obj = context.pop(), base;
	      if (obj.type && obj.type.indexOf("variable") === 0) {
	        if (options && options.additionalContext)
	          base = options.additionalContext[obj.string];
	        if (!options || options.useGlobalScope !== false)
	          base = base || global[obj.string];
	      } else if (obj.type == "string") {
	        base = "";
	      } else if (obj.type == "atom") {
	        base = 1;
	      } else if (obj.type == "function") {
	        if (global.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
	            (typeof global.jQuery == 'function'))
	          base = global.jQuery();
	        else if (global._ != null && (obj.string == '_') && (typeof global._ == 'function'))
	          base = global._();
	      }
	      while (base != null && context.length)
	        base = base[context.pop().string];
	      if (base != null) gatherCompletions(base);
	    } else {
	      // If not, just look in the global object and any local scope
	      // (reading into JS mode internals to get at the local and global variables)
	      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
	      for (var v = token.state.globalVars; v; v = v.next) maybeAdd(v.name);
	      if (!options || options.useGlobalScope !== false)
	        gatherCompletions(global);
	      forEach(keywords, maybeAdd);
	    }
	    return found;
	  }
	});

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE

	(function(mod) {
	  if (typeof exports == "object" && typeof module == "object") // CommonJS
	    mod(require("../../lib/codemirror"));
	  else if (typeof define == "function" && define.amd) // AMD
	    define(["../../lib/codemirror"], mod);
	  else // Plain browser env
	    mod(CodeMirror);
	})(function(CodeMirror) {

	CodeMirror.defineMode("javascript", function(config, parserConfig) {
	  var indentUnit = config.indentUnit;
	  var statementIndent = parserConfig.statementIndent;
	  var jsonldMode = parserConfig.jsonld;
	  var jsonMode = parserConfig.json || jsonldMode;
	  var isTS = parserConfig.typescript;
	  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

	  // Tokenizer

	  var keywords = function(){
	    function kw(type) {return {type: type, style: "keyword"};}
	    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c"), D = kw("keyword d");
	    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

	    return {
	      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
	      "return": D, "break": D, "continue": D, "new": kw("new"), "delete": C, "void": C, "throw": C,
	      "debugger": kw("debugger"), "var": kw("var"), "const": kw("var"), "let": kw("var"),
	      "function": kw("function"), "catch": kw("catch"),
	      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
	      "in": operator, "typeof": operator, "instanceof": operator,
	      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
	      "this": kw("this"), "class": kw("class"), "super": kw("atom"),
	      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C,
	      "await": C
	    };
	  }();

	  var isOperatorChar = /[+\-*&%=<>!?|~^@]/;
	  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

	  function readRegexp(stream) {
	    var escaped = false, next, inSet = false;
	    while ((next = stream.next()) != null) {
	      if (!escaped) {
	        if (next == "/" && !inSet) return;
	        if (next == "[") inSet = true;
	        else if (inSet && next == "]") inSet = false;
	      }
	      escaped = !escaped && next == "\\";
	    }
	  }

	  // Used as scratch variables to communicate multiple values without
	  // consing up tons of objects.
	  var type, content;
	  function ret(tp, style, cont) {
	    type = tp; content = cont;
	    return style;
	  }
	  function tokenBase(stream, state) {
	    var ch = stream.next();
	    if (ch == '"' || ch == "'") {
	      state.tokenize = tokenString(ch);
	      return state.tokenize(stream, state);
	    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
	      return ret("number", "number");
	    } else if (ch == "." && stream.match("..")) {
	      return ret("spread", "meta");
	    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
	      return ret(ch);
	    } else if (ch == "=" && stream.eat(">")) {
	      return ret("=>", "operator");
	    } else if (ch == "0" && stream.match(/^(?:x[\da-f]+|o[0-7]+|b[01]+)n?/i)) {
	      return ret("number", "number");
	    } else if (/\d/.test(ch)) {
	      stream.match(/^\d*(?:n|(?:\.\d*)?(?:[eE][+\-]?\d+)?)?/);
	      return ret("number", "number");
	    } else if (ch == "/") {
	      if (stream.eat("*")) {
	        state.tokenize = tokenComment;
	        return tokenComment(stream, state);
	      } else if (stream.eat("/")) {
	        stream.skipToEnd();
	        return ret("comment", "comment");
	      } else if (expressionAllowed(stream, state, 1)) {
	        readRegexp(stream);
	        stream.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/);
	        return ret("regexp", "string-2");
	      } else {
	        stream.eat("=");
	        return ret("operator", "operator", stream.current());
	      }
	    } else if (ch == "`") {
	      state.tokenize = tokenQuasi;
	      return tokenQuasi(stream, state);
	    } else if (ch == "#") {
	      stream.skipToEnd();
	      return ret("error", "error");
	    } else if (isOperatorChar.test(ch)) {
	      if (ch != ">" || !state.lexical || state.lexical.type != ">") {
	        if (stream.eat("=")) {
	          if (ch == "!" || ch == "=") stream.eat("=");
	        } else if (/[<>*+\-]/.test(ch)) {
	          stream.eat(ch);
	          if (ch == ">") stream.eat(ch);
	        }
	      }
	      return ret("operator", "operator", stream.current());
	    } else if (wordRE.test(ch)) {
	      stream.eatWhile(wordRE);
	      var word = stream.current();
	      if (state.lastType != ".") {
	        if (keywords.propertyIsEnumerable(word)) {
	          var kw = keywords[word];
	          return ret(kw.type, kw.style, word)
	        }
	        if (word == "async" && stream.match(/^(\s|\/\*.*?\*\/)*[\[\(\w]/, false))
	          return ret("async", "keyword", word)
	      }
	      return ret("variable", "variable", word)
	    }
	  }

	  function tokenString(quote) {
	    return function(stream, state) {
	      var escaped = false, next;
	      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
	        state.tokenize = tokenBase;
	        return ret("jsonld-keyword", "meta");
	      }
	      while ((next = stream.next()) != null) {
	        if (next == quote && !escaped) break;
	        escaped = !escaped && next == "\\";
	      }
	      if (!escaped) state.tokenize = tokenBase;
	      return ret("string", "string");
	    };
	  }

	  function tokenComment(stream, state) {
	    var maybeEnd = false, ch;
	    while (ch = stream.next()) {
	      if (ch == "/" && maybeEnd) {
	        state.tokenize = tokenBase;
	        break;
	      }
	      maybeEnd = (ch == "*");
	    }
	    return ret("comment", "comment");
	  }

	  function tokenQuasi(stream, state) {
	    var escaped = false, next;
	    while ((next = stream.next()) != null) {
	      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
	        state.tokenize = tokenBase;
	        break;
	      }
	      escaped = !escaped && next == "\\";
	    }
	    return ret("quasi", "string-2", stream.current());
	  }

	  var brackets = "([{}])";
	  // This is a crude lookahead trick to try and notice that we're
	  // parsing the argument patterns for a fat-arrow function before we
	  // actually hit the arrow token. It only works if the arrow is on
	  // the same line as the arguments and there's no strange noise
	  // (comments) in between. Fallback is to only notice when we hit the
	  // arrow, and not declare the arguments as locals for the arrow
	  // body.
	  function findFatArrow(stream, state) {
	    if (state.fatArrowAt) state.fatArrowAt = null;
	    var arrow = stream.string.indexOf("=>", stream.start);
	    if (arrow < 0) return;

	    if (isTS) { // Try to skip TypeScript return type declarations after the arguments
	      var m = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(stream.string.slice(stream.start, arrow));
	      if (m) arrow = m.index;
	    }

	    var depth = 0, sawSomething = false;
	    for (var pos = arrow - 1; pos >= 0; --pos) {
	      var ch = stream.string.charAt(pos);
	      var bracket = brackets.indexOf(ch);
	      if (bracket >= 0 && bracket < 3) {
	        if (!depth) { ++pos; break; }
	        if (--depth == 0) { if (ch == "(") sawSomething = true; break; }
	      } else if (bracket >= 3 && bracket < 6) {
	        ++depth;
	      } else if (wordRE.test(ch)) {
	        sawSomething = true;
	      } else if (/["'\/]/.test(ch)) {
	        return;
	      } else if (sawSomething && !depth) {
	        ++pos;
	        break;
	      }
	    }
	    if (sawSomething && !depth) state.fatArrowAt = pos;
	  }

	  // Parser

	  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

	  function JSLexical(indented, column, type, align, prev, info) {
	    this.indented = indented;
	    this.column = column;
	    this.type = type;
	    this.prev = prev;
	    this.info = info;
	    if (align != null) this.align = align;
	  }

	  function inScope(state, varname) {
	    for (var v = state.localVars; v; v = v.next)
	      if (v.name == varname) return true;
	    for (var cx = state.context; cx; cx = cx.prev) {
	      for (var v = cx.vars; v; v = v.next)
	        if (v.name == varname) return true;
	    }
	  }

	  function parseJS(state, style, type, content, stream) {
	    var cc = state.cc;
	    // Communicate our context to the combinators.
	    // (Less wasteful than consing up a hundred closures on every call.)
	    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

	    if (!state.lexical.hasOwnProperty("align"))
	      state.lexical.align = true;

	    while(true) {
	      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
	      if (combinator(type, content)) {
	        while(cc.length && cc[cc.length - 1].lex)
	          cc.pop()();
	        if (cx.marked) return cx.marked;
	        if (type == "variable" && inScope(state, content)) return "variable-2";
	        return style;
	      }
	    }
	  }

	  // Combinator utils

	  var cx = {state: null, column: null, marked: null, cc: null};
	  function pass() {
	    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
	  }
	  function cont() {
	    pass.apply(null, arguments);
	    return true;
	  }
	  function inList(name, list) {
	    for (var v = list; v; v = v.next) if (v.name == name) return true
	    return false;
	  }
	  function register(varname) {
	    var state = cx.state;
	    cx.marked = "def";
	    if (state.context) {
	      if (state.lexical.info == "var" && state.context && state.context.block) {
	        // FIXME function decls are also not block scoped
	        var newContext = registerVarScoped(varname, state.context);
	        if (newContext != null) {
	          state.context = newContext;
	          return
	        }
	      } else if (!inList(varname, state.localVars)) {
	        state.localVars = new Var(varname, state.localVars);
	        return
	      }
	    }
	    // Fall through means this is global
	    if (parserConfig.globalVars && !inList(varname, state.globalVars))
	      state.globalVars = new Var(varname, state.globalVars);
	  }
	  function registerVarScoped(varname, context) {
	    if (!context) {
	      return null
	    } else if (context.block) {
	      var inner = registerVarScoped(varname, context.prev);
	      if (!inner) return null
	      if (inner == context.prev) return context
	      return new Context(inner, context.vars, true)
	    } else if (inList(varname, context.vars)) {
	      return context
	    } else {
	      return new Context(context.prev, new Var(varname, context.vars), false)
	    }
	  }

	  function isModifier(name) {
	    return name == "public" || name == "private" || name == "protected" || name == "abstract" || name == "readonly"
	  }

	  // Combinators

	  function Context(prev, vars, block) { this.prev = prev; this.vars = vars; this.block = block; }
	  function Var(name, next) { this.name = name; this.next = next; }

	  var defaultVars = new Var("this", new Var("arguments", null));
	  function pushcontext() {
	    cx.state.context = new Context(cx.state.context, cx.state.localVars, false);
	    cx.state.localVars = defaultVars;
	  }
	  function pushblockcontext() {
	    cx.state.context = new Context(cx.state.context, cx.state.localVars, true);
	    cx.state.localVars = null;
	  }
	  function popcontext() {
	    cx.state.localVars = cx.state.context.vars;
	    cx.state.context = cx.state.context.prev;
	  }
	  popcontext.lex = true;
	  function pushlex(type, info) {
	    var result = function() {
	      var state = cx.state, indent = state.indented;
	      if (state.lexical.type == "stat") indent = state.lexical.indented;
	      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
	        indent = outer.indented;
	      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
	    };
	    result.lex = true;
	    return result;
	  }
	  function poplex() {
	    var state = cx.state;
	    if (state.lexical.prev) {
	      if (state.lexical.type == ")")
	        state.indented = state.lexical.indented;
	      state.lexical = state.lexical.prev;
	    }
	  }
	  poplex.lex = true;

	  function expect(wanted) {
	    function exp(type) {
	      if (type == wanted) return cont();
	      else if (wanted == ";" || type == "}" || type == ")" || type == "]") return pass();
	      else return cont(exp);
	    }    return exp;
	  }

	  function statement(type, value) {
	    if (type == "var") return cont(pushlex("vardef", value), vardef, expect(";"), poplex);
	    if (type == "keyword a") return cont(pushlex("form"), parenExpr, statement, poplex);
	    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
	    if (type == "keyword d") return cx.stream.match(/^\s*$/, false) ? cont() : cont(pushlex("stat"), maybeexpression, expect(";"), poplex);
	    if (type == "debugger") return cont(expect(";"));
	    if (type == "{") return cont(pushlex("}"), pushblockcontext, block, poplex, popcontext);
	    if (type == ";") return cont();
	    if (type == "if") {
	      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
	        cx.state.cc.pop()();
	      return cont(pushlex("form"), parenExpr, statement, poplex, maybeelse);
	    }
	    if (type == "function") return cont(functiondef);
	    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
	    if (type == "class" || (isTS && value == "interface")) {
	      cx.marked = "keyword";
	      return cont(pushlex("form", type == "class" ? type : value), className, poplex)
	    }
	    if (type == "variable") {
	      if (isTS && value == "declare") {
	        cx.marked = "keyword";
	        return cont(statement)
	      } else if (isTS && (value == "module" || value == "enum" || value == "type") && cx.stream.match(/^\s*\w/, false)) {
	        cx.marked = "keyword";
	        if (value == "enum") return cont(enumdef);
	        else if (value == "type") return cont(typename, expect("operator"), typeexpr, expect(";"));
	        else return cont(pushlex("form"), pattern, expect("{"), pushlex("}"), block, poplex, poplex)
	      } else if (isTS && value == "namespace") {
	        cx.marked = "keyword";
	        return cont(pushlex("form"), expression, statement, poplex)
	      } else if (isTS && value == "abstract") {
	        cx.marked = "keyword";
	        return cont(statement)
	      } else {
	        return cont(pushlex("stat"), maybelabel);
	      }
	    }
	    if (type == "switch") return cont(pushlex("form"), parenExpr, expect("{"), pushlex("}", "switch"), pushblockcontext,
	                                      block, poplex, poplex, popcontext);
	    if (type == "case") return cont(expression, expect(":"));
	    if (type == "default") return cont(expect(":"));
	    if (type == "catch") return cont(pushlex("form"), pushcontext, maybeCatchBinding, statement, poplex, popcontext);
	    if (type == "export") return cont(pushlex("stat"), afterExport, poplex);
	    if (type == "import") return cont(pushlex("stat"), afterImport, poplex);
	    if (type == "async") return cont(statement)
	    if (value == "@") return cont(expression, statement)
	    return pass(pushlex("stat"), expression, expect(";"), poplex);
	  }
	  function maybeCatchBinding(type) {
	    if (type == "(") return cont(funarg, expect(")"))
	  }
	  function expression(type, value) {
	    return expressionInner(type, value, false);
	  }
	  function expressionNoComma(type, value) {
	    return expressionInner(type, value, true);
	  }
	  function parenExpr(type) {
	    if (type != "(") return pass()
	    return cont(pushlex(")"), expression, expect(")"), poplex)
	  }
	  function expressionInner(type, value, noComma) {
	    if (cx.state.fatArrowAt == cx.stream.start) {
	      var body = noComma ? arrowBodyNoComma : arrowBody;
	      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, expect("=>"), body, popcontext);
	      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
	    }

	    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
	    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
	    if (type == "function") return cont(functiondef, maybeop);
	    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), classExpression, poplex); }
	    if (type == "keyword c" || type == "async") return cont(noComma ? expressionNoComma : expression);
	    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
	    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
	    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
	    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
	    if (type == "quasi") return pass(quasi, maybeop);
	    if (type == "new") return cont(maybeTarget(noComma));
	    if (type == "import") return cont(expression);
	    return cont();
	  }
	  function maybeexpression(type) {
	    if (type.match(/[;\}\)\],]/)) return pass();
	    return pass(expression);
	  }

	  function maybeoperatorComma(type, value) {
	    if (type == ",") return cont(expression);
	    return maybeoperatorNoComma(type, value, false);
	  }
	  function maybeoperatorNoComma(type, value, noComma) {
	    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
	    var expr = noComma == false ? expression : expressionNoComma;
	    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
	    if (type == "operator") {
	      if (/\+\+|--/.test(value) || isTS && value == "!") return cont(me);
	      if (isTS && value == "<" && cx.stream.match(/^([^>]|<.*?>)*>\s*\(/, false))
	        return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, me);
	      if (value == "?") return cont(expression, expect(":"), expr);
	      return cont(expr);
	    }
	    if (type == "quasi") { return pass(quasi, me); }
	    if (type == ";") return;
	    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
	    if (type == ".") return cont(property, me);
	    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
	    if (isTS && value == "as") { cx.marked = "keyword"; return cont(typeexpr, me) }
	    if (type == "regexp") {
	      cx.state.lastType = cx.marked = "operator";
	      cx.stream.backUp(cx.stream.pos - cx.stream.start - 1);
	      return cont(expr)
	    }
	  }
	  function quasi(type, value) {
	    if (type != "quasi") return pass();
	    if (value.slice(value.length - 2) != "${") return cont(quasi);
	    return cont(expression, continueQuasi);
	  }
	  function continueQuasi(type) {
	    if (type == "}") {
	      cx.marked = "string-2";
	      cx.state.tokenize = tokenQuasi;
	      return cont(quasi);
	    }
	  }
	  function arrowBody(type) {
	    findFatArrow(cx.stream, cx.state);
	    return pass(type == "{" ? statement : expression);
	  }
	  function arrowBodyNoComma(type) {
	    findFatArrow(cx.stream, cx.state);
	    return pass(type == "{" ? statement : expressionNoComma);
	  }
	  function maybeTarget(noComma) {
	    return function(type) {
	      if (type == ".") return cont(noComma ? targetNoComma : target);
	      else if (type == "variable" && isTS) return cont(maybeTypeArgs, noComma ? maybeoperatorNoComma : maybeoperatorComma)
	      else return pass(noComma ? expressionNoComma : expression);
	    };
	  }
	  function target(_, value) {
	    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorComma); }
	  }
	  function targetNoComma(_, value) {
	    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorNoComma); }
	  }
	  function maybelabel(type) {
	    if (type == ":") return cont(poplex, statement);
	    return pass(maybeoperatorComma, expect(";"), poplex);
	  }
	  function property(type) {
	    if (type == "variable") {cx.marked = "property"; return cont();}
	  }
	  function objprop(type, value) {
	    if (type == "async") {
	      cx.marked = "property";
	      return cont(objprop);
	    } else if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      if (value == "get" || value == "set") return cont(getterSetter);
	      var m; // Work around fat-arrow-detection complication for detecting typescript typed arrow params
	      if (isTS && cx.state.fatArrowAt == cx.stream.start && (m = cx.stream.match(/^\s*:\s*/, false)))
	        cx.state.fatArrowAt = cx.stream.pos + m[0].length;
	      return cont(afterprop);
	    } else if (type == "number" || type == "string") {
	      cx.marked = jsonldMode ? "property" : (cx.style + " property");
	      return cont(afterprop);
	    } else if (type == "jsonld-keyword") {
	      return cont(afterprop);
	    } else if (isTS && isModifier(value)) {
	      cx.marked = "keyword";
	      return cont(objprop)
	    } else if (type == "[") {
	      return cont(expression, maybetype, expect("]"), afterprop);
	    } else if (type == "spread") {
	      return cont(expressionNoComma, afterprop);
	    } else if (value == "*") {
	      cx.marked = "keyword";
	      return cont(objprop);
	    } else if (type == ":") {
	      return pass(afterprop)
	    }
	  }
	  function getterSetter(type) {
	    if (type != "variable") return pass(afterprop);
	    cx.marked = "property";
	    return cont(functiondef);
	  }
	  function afterprop(type) {
	    if (type == ":") return cont(expressionNoComma);
	    if (type == "(") return pass(functiondef);
	  }
	  function commasep(what, end, sep) {
	    function proceed(type, value) {
	      if (sep ? sep.indexOf(type) > -1 : type == ",") {
	        var lex = cx.state.lexical;
	        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
	        return cont(function(type, value) {
	          if (type == end || value == end) return pass()
	          return pass(what)
	        }, proceed);
	      }
	      if (type == end || value == end) return cont();
	      if (sep && sep.indexOf(";") > -1) return pass(what)
	      return cont(expect(end));
	    }
	    return function(type, value) {
	      if (type == end || value == end) return cont();
	      return pass(what, proceed);
	    };
	  }
	  function contCommasep(what, end, info) {
	    for (var i = 3; i < arguments.length; i++)
	      cx.cc.push(arguments[i]);
	    return cont(pushlex(end, info), commasep(what, end), poplex);
	  }
	  function block(type) {
	    if (type == "}") return cont();
	    return pass(statement, block);
	  }
	  function maybetype(type, value) {
	    if (isTS) {
	      if (type == ":" || value == "in") return cont(typeexpr);
	      if (value == "?") return cont(maybetype);
	    }
	  }
	  function mayberettype(type) {
	    if (isTS && type == ":") {
	      if (cx.stream.match(/^\s*\w+\s+is\b/, false)) return cont(expression, isKW, typeexpr)
	      else return cont(typeexpr)
	    }
	  }
	  function isKW(_, value) {
	    if (value == "is") {
	      cx.marked = "keyword";
	      return cont()
	    }
	  }
	  function typeexpr(type, value) {
	    if (value == "keyof" || value == "typeof" || value == "infer") {
	      cx.marked = "keyword";
	      return cont(value == "typeof" ? expressionNoComma : typeexpr)
	    }
	    if (type == "variable" || value == "void") {
	      cx.marked = "type";
	      return cont(afterType)
	    }
	    if (type == "string" || type == "number" || type == "atom") return cont(afterType);
	    if (type == "[") return cont(pushlex("]"), commasep(typeexpr, "]", ","), poplex, afterType)
	    if (type == "{") return cont(pushlex("}"), commasep(typeprop, "}", ",;"), poplex, afterType)
	    if (type == "(") return cont(commasep(typearg, ")"), maybeReturnType, afterType)
	    if (type == "<") return cont(commasep(typeexpr, ">"), typeexpr)
	  }
	  function maybeReturnType(type) {
	    if (type == "=>") return cont(typeexpr)
	  }
	  function typeprop(type, value) {
	    if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      return cont(typeprop)
	    } else if (value == "?" || type == "number" || type == "string") {
	      return cont(typeprop)
	    } else if (type == ":") {
	      return cont(typeexpr)
	    } else if (type == "[") {
	      return cont(expect("variable"), maybetype, expect("]"), typeprop)
	    } else if (type == "(") {
	      return pass(functiondecl, typeprop)
	    }
	  }
	  function typearg(type, value) {
	    if (type == "variable" && cx.stream.match(/^\s*[?:]/, false) || value == "?") return cont(typearg)
	    if (type == ":") return cont(typeexpr)
	    if (type == "spread") return cont(typearg)
	    return pass(typeexpr)
	  }
	  function afterType(type, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
	    if (value == "|" || type == "." || value == "&") return cont(typeexpr)
	    if (type == "[") return cont(typeexpr, expect("]"), afterType)
	    if (value == "extends" || value == "implements") { cx.marked = "keyword"; return cont(typeexpr) }
	    if (value == "?") return cont(typeexpr, expect(":"), typeexpr)
	  }
	  function maybeTypeArgs(_, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
	  }
	  function typeparam() {
	    return pass(typeexpr, maybeTypeDefault)
	  }
	  function maybeTypeDefault(_, value) {
	    if (value == "=") return cont(typeexpr)
	  }
	  function vardef(_, value) {
	    if (value == "enum") {cx.marked = "keyword"; return cont(enumdef)}
	    return pass(pattern, maybetype, maybeAssign, vardefCont);
	  }
	  function pattern(type, value) {
	    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(pattern) }
	    if (type == "variable") { register(value); return cont(); }
	    if (type == "spread") return cont(pattern);
	    if (type == "[") return contCommasep(eltpattern, "]");
	    if (type == "{") return contCommasep(proppattern, "}");
	  }
	  function proppattern(type, value) {
	    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
	      register(value);
	      return cont(maybeAssign);
	    }
	    if (type == "variable") cx.marked = "property";
	    if (type == "spread") return cont(pattern);
	    if (type == "}") return pass();
	    if (type == "[") return cont(expression, expect(']'), expect(':'), proppattern);
	    return cont(expect(":"), pattern, maybeAssign);
	  }
	  function eltpattern() {
	    return pass(pattern, maybeAssign)
	  }
	  function maybeAssign(_type, value) {
	    if (value == "=") return cont(expressionNoComma);
	  }
	  function vardefCont(type) {
	    if (type == ",") return cont(vardef);
	  }
	  function maybeelse(type, value) {
	    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
	  }
	  function forspec(type, value) {
	    if (value == "await") return cont(forspec);
	    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
	  }
	  function forspec1(type) {
	    if (type == "var") return cont(vardef, expect(";"), forspec2);
	    if (type == ";") return cont(forspec2);
	    if (type == "variable") return cont(formaybeinof);
	    return pass(expression, expect(";"), forspec2);
	  }
	  function formaybeinof(_type, value) {
	    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
	    return cont(maybeoperatorComma, forspec2);
	  }
	  function forspec2(type, value) {
	    if (type == ";") return cont(forspec3);
	    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
	    return pass(expression, expect(";"), forspec3);
	  }
	  function forspec3(type) {
	    if (type != ")") cont(expression);
	  }
	  function functiondef(type, value) {
	    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
	    if (type == "variable") {register(value); return cont(functiondef);}
	    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, statement, popcontext);
	    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondef)
	  }
	  function functiondecl(type, value) {
	    if (value == "*") {cx.marked = "keyword"; return cont(functiondecl);}
	    if (type == "variable") {register(value); return cont(functiondecl);}
	    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, popcontext);
	    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondecl)
	  }
	  function typename(type, value) {
	    if (type == "keyword" || type == "variable") {
	      cx.marked = "type";
	      return cont(typename)
	    } else if (value == "<") {
	      return cont(pushlex(">"), commasep(typeparam, ">"), poplex)
	    }
	  }
	  function funarg(type, value) {
	    if (value == "@") cont(expression, funarg);
	    if (type == "spread") return cont(funarg);
	    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(funarg); }
	    return pass(pattern, maybetype, maybeAssign);
	  }
	  function classExpression(type, value) {
	    // Class expressions may have an optional name.
	    if (type == "variable") return className(type, value);
	    return classNameAfter(type, value);
	  }
	  function className(type, value) {
	    if (type == "variable") {register(value); return cont(classNameAfter);}
	  }
	  function classNameAfter(type, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, classNameAfter)
	    if (value == "extends" || value == "implements" || (isTS && type == ",")) {
	      if (value == "implements") cx.marked = "keyword";
	      return cont(isTS ? typeexpr : expression, classNameAfter);
	    }
	    if (type == "{") return cont(pushlex("}"), classBody, poplex);
	  }
	  function classBody(type, value) {
	    if (type == "async" ||
	        (type == "variable" &&
	         (value == "static" || value == "get" || value == "set" || (isTS && isModifier(value))) &&
	         cx.stream.match(/^\s+[\w$\xa1-\uffff]/, false))) {
	      cx.marked = "keyword";
	      return cont(classBody);
	    }
	    if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      return cont(isTS ? classfield : functiondef, classBody);
	    }
	    if (type == "number" || type == "string") return cont(isTS ? classfield : functiondef, classBody);
	    if (type == "[")
	      return cont(expression, maybetype, expect("]"), isTS ? classfield : functiondef, classBody)
	    if (value == "*") {
	      cx.marked = "keyword";
	      return cont(classBody);
	    }
	    if (isTS && type == "(") return pass(functiondecl, classBody)
	    if (type == ";" || type == ",") return cont(classBody);
	    if (type == "}") return cont();
	    if (value == "@") return cont(expression, classBody)
	  }
	  function classfield(type, value) {
	    if (value == "?") return cont(classfield)
	    if (type == ":") return cont(typeexpr, maybeAssign)
	    if (value == "=") return cont(expressionNoComma)
	    var context = cx.state.lexical.prev, isInterface = context && context.info == "interface";
	    return pass(isInterface ? functiondecl : functiondef)
	  }
	  function afterExport(type, value) {
	    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
	    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
	    if (type == "{") return cont(commasep(exportField, "}"), maybeFrom, expect(";"));
	    return pass(statement);
	  }
	  function exportField(type, value) {
	    if (value == "as") { cx.marked = "keyword"; return cont(expect("variable")); }
	    if (type == "variable") return pass(expressionNoComma, exportField);
	  }
	  function afterImport(type) {
	    if (type == "string") return cont();
	    if (type == "(") return pass(expression);
	    return pass(importSpec, maybeMoreImports, maybeFrom);
	  }
	  function importSpec(type, value) {
	    if (type == "{") return contCommasep(importSpec, "}");
	    if (type == "variable") register(value);
	    if (value == "*") cx.marked = "keyword";
	    return cont(maybeAs);
	  }
	  function maybeMoreImports(type) {
	    if (type == ",") return cont(importSpec, maybeMoreImports)
	  }
	  function maybeAs(_type, value) {
	    if (value == "as") { cx.marked = "keyword"; return cont(importSpec); }
	  }
	  function maybeFrom(_type, value) {
	    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
	  }
	  function arrayLiteral(type) {
	    if (type == "]") return cont();
	    return pass(commasep(expressionNoComma, "]"));
	  }
	  function enumdef() {
	    return pass(pushlex("form"), pattern, expect("{"), pushlex("}"), commasep(enummember, "}"), poplex, poplex)
	  }
	  function enummember() {
	    return pass(pattern, maybeAssign);
	  }

	  function isContinuedStatement(state, textAfter) {
	    return state.lastType == "operator" || state.lastType == "," ||
	      isOperatorChar.test(textAfter.charAt(0)) ||
	      /[,.]/.test(textAfter.charAt(0));
	  }

	  function expressionAllowed(stream, state, backUp) {
	    return state.tokenize == tokenBase &&
	      /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(state.lastType) ||
	      (state.lastType == "quasi" && /\{\s*$/.test(stream.string.slice(0, stream.pos - (backUp || 0))))
	  }

	  // Interface

	  return {
	    startState: function(basecolumn) {
	      var state = {
	        tokenize: tokenBase,
	        lastType: "sof",
	        cc: [],
	        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
	        localVars: parserConfig.localVars,
	        context: parserConfig.localVars && new Context(null, null, false),
	        indented: basecolumn || 0
	      };
	      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
	        state.globalVars = parserConfig.globalVars;
	      return state;
	    },

	    token: function(stream, state) {
	      if (stream.sol()) {
	        if (!state.lexical.hasOwnProperty("align"))
	          state.lexical.align = false;
	        state.indented = stream.indentation();
	        findFatArrow(stream, state);
	      }
	      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
	      var style = state.tokenize(stream, state);
	      if (type == "comment") return style;
	      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
	      return parseJS(state, style, type, content, stream);
	    },

	    indent: function(state, textAfter) {
	      if (state.tokenize == tokenComment) return CodeMirror.Pass;
	      if (state.tokenize != tokenBase) return 0;
	      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical, top;
	      // Kludge to prevent 'maybelse' from blocking lexical scope pops
	      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
	        var c = state.cc[i];
	        if (c == poplex) lexical = lexical.prev;
	        else if (c != maybeelse) break;
	      }
	      while ((lexical.type == "stat" || lexical.type == "form") &&
	             (firstChar == "}" || ((top = state.cc[state.cc.length - 1]) &&
	                                   (top == maybeoperatorComma || top == maybeoperatorNoComma) &&
	                                   !/^[,\.=+\-*:?[\(]/.test(textAfter))))
	        lexical = lexical.prev;
	      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
	        lexical = lexical.prev;
	      var type = lexical.type, closing = firstChar == type;

	      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info.length + 1 : 0);
	      else if (type == "form" && firstChar == "{") return lexical.indented;
	      else if (type == "form") return lexical.indented + indentUnit;
	      else if (type == "stat")
	        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
	      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
	        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
	      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
	      else return lexical.indented + (closing ? 0 : indentUnit);
	    },

	    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
	    blockCommentStart: jsonMode ? null : "/*",
	    blockCommentEnd: jsonMode ? null : "*/",
	    blockCommentContinue: jsonMode ? null : " * ",
	    lineComment: jsonMode ? null : "//",
	    fold: "brace",
	    closeBrackets: "()[]{}''\"\"``",

	    helperType: jsonMode ? "json" : "javascript",
	    jsonldMode: jsonldMode,
	    jsonMode: jsonMode,

	    expressionAllowed: expressionAllowed,

	    skipExpression: function(state) {
	      var top = state.cc[state.cc.length - 1];
	      if (top == expression || top == expressionNoComma) state.cc.pop();
	    }
	  };
	});

	CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

	CodeMirror.defineMIME("text/javascript", "javascript");
	CodeMirror.defineMIME("text/ecmascript", "javascript");
	CodeMirror.defineMIME("application/javascript", "javascript");
	CodeMirror.defineMIME("application/x-javascript", "javascript");
	CodeMirror.defineMIME("application/ecmascript", "javascript");
	CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
	CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
	CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
	CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
	CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

	});

	// Dependencies


	class CodeEditor{
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

	/** Consente di creare una Sandbox in cui eseguire 
	del codice in modo protetto. Rende accessibili solo
	le funzioni presenti nell'api */

	class Sandbox{
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
	    });
		}
		
		// Esegue del codice
		run(src){
			src = 'with (sandbox) { return new function(){' + src + '}}';
			const code = new Function('sandbox', src);
			return code(this._sandbox);
		}
	}

	/**
	* matter-js 0.10.0 by @liabru 2016-05-01
	* http://brm.io/matter-js/
	* License MIT
	*/

	/**
	 * The MIT License (MIT)
	 * 
	 * Copyright (c) 2014 Liam Brummitt
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f();}else if(typeof define==="function"&&define.amd){define([],f);}else{var g;if(typeof window!=="undefined"){g=window;}else if(typeof global!=="undefined"){g=global;}else if(typeof self!=="undefined"){g=self;}else{g=this;}g.Matter = f();}})(function(){return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r);}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
	/**
	* The `Matter.Body` module contains methods for creating and manipulating body models.
	* A `Matter.Body` is a rigid body that can be simulated by a `Matter.Engine`.
	* Factories for commonly used body configurations (such as rectangles, circles and other polygons) can be found in the module `Matter.Bodies`.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).

	* @class Body
	*/

	var Body = {};

	module.exports = Body;

	var Vertices = require('../geometry/Vertices');
	var Vector = require('../geometry/Vector');
	var Sleeping = require('../core/Sleeping');
	var Render = require('../render/Render');
	var Common = require('../core/Common');
	var Bounds = require('../geometry/Bounds');
	var Axes = require('../geometry/Axes');

	(function() {

	    Body._inertiaScale = 4;
	    Body._nextCollidingGroupId = 1;
	    Body._nextNonCollidingGroupId = -1;
	    Body._nextCategory = 0x0001;

	    /**
	     * Creates a new rigid body model. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * All properties have default values, and many are pre-calculated automatically based on other properties.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {} options
	     * @return {body} body
	     */
	    Body.create = function(options) {
	        var defaults = {
	            id: Common.nextId(),
	            type: 'body',
	            label: 'Body',
	            parts: [],
	            angle: 0,
	            vertices: Vertices.fromPath('L 0 0 L 40 0 L 40 40 L 0 40'),
	            position: { x: 0, y: 0 },
	            force: { x: 0, y: 0 },
	            torque: 0,
	            positionImpulse: { x: 0, y: 0 },
	            constraintImpulse: { x: 0, y: 0, angle: 0 },
	            totalContacts: 0,
	            speed: 0,
	            angularSpeed: 0,
	            velocity: { x: 0, y: 0 },
	            angularVelocity: 0,
	            isSensor: false,
	            isStatic: false,
	            isSleeping: false,
	            motion: 0,
	            sleepThreshold: 60,
	            density: 0.001,
	            restitution: 0,
	            friction: 0.1,
	            frictionStatic: 0.5,
	            frictionAir: 0.01,
	            collisionFilter: {
	                category: 0x0001,
	                mask: 0xFFFFFFFF,
	                group: 0
	            },
	            slop: 0.05,
	            timeScale: 1,
	            render: {
	                visible: true,
	                opacity: 1,
	                sprite: {
	                    xScale: 1,
	                    yScale: 1,
	                    xOffset: 0,
	                    yOffset: 0
	                },
	                lineWidth: 1.5
	            }
	        };

	        var body = Common.extend(defaults, options);

	        _initProperties(body, options);

	        return body;
	    };

	    /**
	     * Returns the next unique group index for which bodies will collide.
	     * If `isNonColliding` is `true`, returns the next unique group index for which bodies will _not_ collide.
	     * See `body.collisionFilter` for more information.
	     * @method nextGroup
	     * @param {bool} [isNonColliding=false]
	     * @return {Number} Unique group index
	     */
	    Body.nextGroup = function(isNonColliding) {
	        if (isNonColliding)
	            return Body._nextNonCollidingGroupId--;

	        return Body._nextCollidingGroupId++;
	    };

	    /**
	     * Returns the next unique category bitfield (starting after the initial default category `0x0001`).
	     * There are 32 available. See `body.collisionFilter` for more information.
	     * @method nextCategory
	     * @return {Number} Unique category bitfield
	     */
	    Body.nextCategory = function() {
	        Body._nextCategory = Body._nextCategory << 1;
	        return Body._nextCategory;
	    };

	    /**
	     * Initialises body properties.
	     * @method _initProperties
	     * @private
	     * @param {body} body
	     * @param {} options
	     */
	    var _initProperties = function(body, options) {
	        // init required properties (order is important)
	        Body.set(body, {
	            bounds: body.bounds || Bounds.create(body.vertices),
	            positionPrev: body.positionPrev || Vector.clone(body.position),
	            anglePrev: body.anglePrev || body.angle,
	            vertices: body.vertices,
	            parts: body.parts || [body],
	            isStatic: body.isStatic,
	            isSleeping: body.isSleeping,
	            parent: body.parent || body
	        });

	        Vertices.rotate(body.vertices, body.angle, body.position);
	        Axes.rotate(body.axes, body.angle);
	        Bounds.update(body.bounds, body.vertices, body.velocity);

	        // allow options to override the automatically calculated properties
	        Body.set(body, {
	            axes: options.axes || body.axes,
	            area: options.area || body.area,
	            mass: options.mass || body.mass,
	            inertia: options.inertia || body.inertia
	        });

	        // render properties
	        var defaultFillStyle = (body.isStatic ? '#eeeeee' : Common.choose(['#556270', '#4ECDC4', '#C7F464', '#FF6B6B', '#C44D58'])),
	            defaultStrokeStyle = Common.shadeColor(defaultFillStyle, -20);
	        body.render.fillStyle = body.render.fillStyle || defaultFillStyle;
	        body.render.strokeStyle = body.render.strokeStyle || defaultStrokeStyle;
	        body.render.sprite.xOffset += -(body.bounds.min.x - body.position.x) / (body.bounds.max.x - body.bounds.min.x);
	        body.render.sprite.yOffset += -(body.bounds.min.y - body.position.y) / (body.bounds.max.y - body.bounds.min.y);
	    };

	    /**
	     * Given a property and a value (or map of), sets the property(s) on the body, using the appropriate setter functions if they exist.
	     * Prefer to use the actual setter functions in performance critical situations.
	     * @method set
	     * @param {body} body
	     * @param {} settings A property name (or map of properties and values) to set on the body.
	     * @param {} value The value to set if `settings` is a single property name.
	     */
	    Body.set = function(body, settings, value) {
	        var property;

	        if (typeof settings === 'string') {
	            property = settings;
	            settings = {};
	            settings[property] = value;
	        }

	        for (property in settings) {
	            value = settings[property];

	            if (!settings.hasOwnProperty(property))
	                continue;

	            switch (property) {

	            case 'isStatic':
	                Body.setStatic(body, value);
	                break;
	            case 'isSleeping':
	                Sleeping.set(body, value);
	                break;
	            case 'mass':
	                Body.setMass(body, value);
	                break;
	            case 'density':
	                Body.setDensity(body, value);
	                break;
	            case 'inertia':
	                Body.setInertia(body, value);
	                break;
	            case 'vertices':
	                Body.setVertices(body, value);
	                break;
	            case 'position':
	                Body.setPosition(body, value);
	                break;
	            case 'angle':
	                Body.setAngle(body, value);
	                break;
	            case 'velocity':
	                Body.setVelocity(body, value);
	                break;
	            case 'angularVelocity':
	                Body.setAngularVelocity(body, value);
	                break;
	            case 'parts':
	                Body.setParts(body, value);
	                break;
	            default:
	                body[property] = value;

	            }
	        }
	    };

	    /**
	     * Sets the body as static, including isStatic flag and setting mass and inertia to Infinity.
	     * @method setStatic
	     * @param {body} body
	     * @param {bool} isStatic
	     */
	    Body.setStatic = function(body, isStatic) {
	        for (var i = 0; i < body.parts.length; i++) {
	            var part = body.parts[i];
	            part.isStatic = isStatic;

	            if (isStatic) {
	                part.restitution = 0;
	                part.friction = 1;
	                part.mass = part.inertia = part.density = Infinity;
	                part.inverseMass = part.inverseInertia = 0;

	                part.positionPrev.x = part.position.x;
	                part.positionPrev.y = part.position.y;
	                part.anglePrev = part.angle;
	                part.angularVelocity = 0;
	                part.speed = 0;
	                part.angularSpeed = 0;
	                part.motion = 0;
	            }
	        }
	    };

	    /**
	     * Sets the mass of the body. Inverse mass and density are automatically updated to reflect the change.
	     * @method setMass
	     * @param {body} body
	     * @param {number} mass
	     */
	    Body.setMass = function(body, mass) {
	        body.mass = mass;
	        body.inverseMass = 1 / body.mass;
	        body.density = body.mass / body.area;
	    };

	    /**
	     * Sets the density of the body. Mass is automatically updated to reflect the change.
	     * @method setDensity
	     * @param {body} body
	     * @param {number} density
	     */
	    Body.setDensity = function(body, density) {
	        Body.setMass(body, density * body.area);
	        body.density = density;
	    };

	    /**
	     * Sets the moment of inertia (i.e. second moment of area) of the body of the body. 
	     * Inverse inertia is automatically updated to reflect the change. Mass is not changed.
	     * @method setInertia
	     * @param {body} body
	     * @param {number} inertia
	     */
	    Body.setInertia = function(body, inertia) {
	        body.inertia = inertia;
	        body.inverseInertia = 1 / body.inertia;
	    };

	    /**
	     * Sets the body's vertices and updates body properties accordingly, including inertia, area and mass (with respect to `body.density`).
	     * Vertices will be automatically transformed to be orientated around their centre of mass as the origin.
	     * They are then automatically translated to world space based on `body.position`.
	     *
	     * The `vertices` argument should be passed as an array of `Matter.Vector` points (or a `Matter.Vertices` array).
	     * Vertices must form a convex hull, concave hulls are not supported.
	     *
	     * @method setVertices
	     * @param {body} body
	     * @param {vector[]} vertices
	     */
	    Body.setVertices = function(body, vertices) {
	        // change vertices
	        if (vertices[0].body === body) {
	            body.vertices = vertices;
	        } else {
	            body.vertices = Vertices.create(vertices, body);
	        }

	        // update properties
	        body.axes = Axes.fromVertices(body.vertices);
	        body.area = Vertices.area(body.vertices);
	        Body.setMass(body, body.density * body.area);

	        // orient vertices around the centre of mass at origin (0, 0)
	        var centre = Vertices.centre(body.vertices);
	        Vertices.translate(body.vertices, centre, -1);

	        // update inertia while vertices are at origin (0, 0)
	        Body.setInertia(body, Body._inertiaScale * Vertices.inertia(body.vertices, body.mass));

	        // update geometry
	        Vertices.translate(body.vertices, body.position);
	        Bounds.update(body.bounds, body.vertices, body.velocity);
	    };

	    /**
	     * Sets the parts of the `body` and updates mass, inertia and centroid.
	     * Each part will have its parent set to `body`.
	     * By default the convex hull will be automatically computed and set on `body`, unless `autoHull` is set to `false.`
	     * Note that this method will ensure that the first part in `body.parts` will always be the `body`.
	     * @method setParts
	     * @param {body} body
	     * @param [body] parts
	     * @param {bool} [autoHull=true]
	     */
	    Body.setParts = function(body, parts, autoHull) {
	        var i;

	        // add all the parts, ensuring that the first part is always the parent body
	        parts = parts.slice(0);
	        body.parts.length = 0;
	        body.parts.push(body);
	        body.parent = body;

	        for (i = 0; i < parts.length; i++) {
	            var part = parts[i];
	            if (part !== body) {
	                part.parent = body;
	                body.parts.push(part);
	            }
	        }

	        if (body.parts.length === 1)
	            return;

	        autoHull = typeof autoHull !== 'undefined' ? autoHull : true;

	        // find the convex hull of all parts to set on the parent body
	        if (autoHull) {
	            var vertices = [];
	            for (i = 0; i < parts.length; i++) {
	                vertices = vertices.concat(parts[i].vertices);
	            }

	            Vertices.clockwiseSort(vertices);

	            var hull = Vertices.hull(vertices),
	                hullCentre = Vertices.centre(hull);

	            Body.setVertices(body, hull);
	            Vertices.translate(body.vertices, hullCentre);
	        }

	        // sum the properties of all compound parts of the parent body
	        var total = _totalProperties(body);

	        body.area = total.area;
	        body.parent = body;
	        body.position.x = total.centre.x;
	        body.position.y = total.centre.y;
	        body.positionPrev.x = total.centre.x;
	        body.positionPrev.y = total.centre.y;

	        Body.setMass(body, total.mass);
	        Body.setInertia(body, total.inertia);
	        Body.setPosition(body, total.centre);
	    };

	    /**
	     * Sets the position of the body instantly. Velocity, angle, force etc. are unchanged.
	     * @method setPosition
	     * @param {body} body
	     * @param {vector} position
	     */
	    Body.setPosition = function(body, position) {
	        var delta = Vector.sub(position, body.position);
	        body.positionPrev.x += delta.x;
	        body.positionPrev.y += delta.y;

	        for (var i = 0; i < body.parts.length; i++) {
	            var part = body.parts[i];
	            part.position.x += delta.x;
	            part.position.y += delta.y;
	            Vertices.translate(part.vertices, delta);
	            Bounds.update(part.bounds, part.vertices, body.velocity);
	        }
	    };

	    /**
	     * Sets the angle of the body instantly. Angular velocity, position, force etc. are unchanged.
	     * @method setAngle
	     * @param {body} body
	     * @param {number} angle
	     */
	    Body.setAngle = function(body, angle) {
	        var delta = angle - body.angle;
	        body.anglePrev += delta;

	        for (var i = 0; i < body.parts.length; i++) {
	            var part = body.parts[i];
	            part.angle += delta;
	            Vertices.rotate(part.vertices, delta, body.position);
	            Axes.rotate(part.axes, delta);
	            Bounds.update(part.bounds, part.vertices, body.velocity);
	            if (i > 0) {
	                Vector.rotateAbout(part.position, delta, body.position, part.position);
	            }
	        }
	    };

	    /**
	     * Sets the linear velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
	     * @method setVelocity
	     * @param {body} body
	     * @param {vector} velocity
	     */
	    Body.setVelocity = function(body, velocity) {
	        body.positionPrev.x = body.position.x - velocity.x;
	        body.positionPrev.y = body.position.y - velocity.y;
	        body.velocity.x = velocity.x;
	        body.velocity.y = velocity.y;
	        body.speed = Vector.magnitude(body.velocity);
	    };

	    /**
	     * Sets the angular velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
	     * @method setAngularVelocity
	     * @param {body} body
	     * @param {number} velocity
	     */
	    Body.setAngularVelocity = function(body, velocity) {
	        body.anglePrev = body.angle - velocity;
	        body.angularVelocity = velocity;
	        body.angularSpeed = Math.abs(body.angularVelocity);
	    };

	    /**
	     * Moves a body by a given vector relative to its current position, without imparting any velocity.
	     * @method translate
	     * @param {body} body
	     * @param {vector} translation
	     */
	    Body.translate = function(body, translation) {
	        Body.setPosition(body, Vector.add(body.position, translation));
	    };

	    /**
	     * Rotates a body by a given angle relative to its current angle, without imparting any angular velocity.
	     * @method rotate
	     * @param {body} body
	     * @param {number} rotation
	     */
	    Body.rotate = function(body, rotation) {
	        Body.setAngle(body, body.angle + rotation);
	    };

	    /**
	     * Scales the body, including updating physical properties (mass, area, axes, inertia), from a world-space point (default is body centre).
	     * @method scale
	     * @param {body} body
	     * @param {number} scaleX
	     * @param {number} scaleY
	     * @param {vector} [point]
	     */
	    Body.scale = function(body, scaleX, scaleY, point) {
	        for (var i = 0; i < body.parts.length; i++) {
	            var part = body.parts[i];

	            // scale vertices
	            Vertices.scale(part.vertices, scaleX, scaleY, body.position);

	            // update properties
	            part.axes = Axes.fromVertices(part.vertices);

	            if (!body.isStatic) {
	                part.area = Vertices.area(part.vertices);
	                Body.setMass(part, body.density * part.area);

	                // update inertia (requires vertices to be at origin)
	                Vertices.translate(part.vertices, { x: -part.position.x, y: -part.position.y });
	                Body.setInertia(part, Vertices.inertia(part.vertices, part.mass));
	                Vertices.translate(part.vertices, { x: part.position.x, y: part.position.y });
	            }

	            // update bounds
	            Bounds.update(part.bounds, part.vertices, body.velocity);
	        }

	        // handle circles
	        if (body.circleRadius) { 
	            if (scaleX === scaleY) {
	                body.circleRadius *= scaleX;
	            } else {
	                // body is no longer a circle
	                body.circleRadius = null;
	            }
	        }

	        if (!body.isStatic) {
	            var total = _totalProperties(body);
	            body.area = total.area;
	            Body.setMass(body, total.mass);
	            Body.setInertia(body, total.inertia);
	        }
	    };

	    /**
	     * Performs a simulation step for the given `body`, including updating position and angle using Verlet integration.
	     * @method update
	     * @param {body} body
	     * @param {number} deltaTime
	     * @param {number} timeScale
	     * @param {number} correction
	     */
	    Body.update = function(body, deltaTime, timeScale, correction) {
	        var deltaTimeSquared = Math.pow(deltaTime * timeScale * body.timeScale, 2);

	        // from the previous step
	        var frictionAir = 1 - body.frictionAir * timeScale * body.timeScale,
	            velocityPrevX = body.position.x - body.positionPrev.x,
	            velocityPrevY = body.position.y - body.positionPrev.y;

	        // update velocity with Verlet integration
	        body.velocity.x = (velocityPrevX * frictionAir * correction) + (body.force.x / body.mass) * deltaTimeSquared;
	        body.velocity.y = (velocityPrevY * frictionAir * correction) + (body.force.y / body.mass) * deltaTimeSquared;

	        body.positionPrev.x = body.position.x;
	        body.positionPrev.y = body.position.y;
	        body.position.x += body.velocity.x;
	        body.position.y += body.velocity.y;

	        // update angular velocity with Verlet integration
	        body.angularVelocity = ((body.angle - body.anglePrev) * frictionAir * correction) + (body.torque / body.inertia) * deltaTimeSquared;
	        body.anglePrev = body.angle;
	        body.angle += body.angularVelocity;

	        // track speed and acceleration
	        body.speed = Vector.magnitude(body.velocity);
	        body.angularSpeed = Math.abs(body.angularVelocity);

	        // transform the body geometry
	        for (var i = 0; i < body.parts.length; i++) {
	            var part = body.parts[i];

	            Vertices.translate(part.vertices, body.velocity);
	            
	            if (i > 0) {
	                part.position.x += body.velocity.x;
	                part.position.y += body.velocity.y;
	            }

	            if (body.angularVelocity !== 0) {
	                Vertices.rotate(part.vertices, body.angularVelocity, body.position);
	                Axes.rotate(part.axes, body.angularVelocity);
	                if (i > 0) {
	                    Vector.rotateAbout(part.position, body.angularVelocity, body.position, part.position);
	                }
	            }

	            Bounds.update(part.bounds, part.vertices, body.velocity);
	        }
	    };

	    /**
	     * Applies a force to a body from a given world-space position, including resulting torque.
	     * @method applyForce
	     * @param {body} body
	     * @param {vector} position
	     * @param {vector} force
	     */
	    Body.applyForce = function(body, position, force) {
	        body.force.x += force.x;
	        body.force.y += force.y;
	        var offset = { x: position.x - body.position.x, y: position.y - body.position.y };
	        body.torque += offset.x * force.y - offset.y * force.x;
	    };

	    /**
	     * Returns the sums of the properties of all compound parts of the parent body.
	     * @method _totalProperties
	     * @private
	     * @param {body} body
	     * @return {}
	     */
	    var _totalProperties = function(body) {
	        // https://ecourses.ou.edu/cgi-bin/ebook.cgi?doc=&topic=st&chap_sec=07.2&page=theory
	        // http://output.to/sideway/default.asp?qno=121100087

	        var properties = {
	            mass: 0,
	            area: 0,
	            inertia: 0,
	            centre: { x: 0, y: 0 }
	        };

	        // sum the properties of all compound parts of the parent body
	        for (var i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; i++) {
	            var part = body.parts[i];
	            properties.mass += part.mass;
	            properties.area += part.area;
	            properties.inertia += part.inertia;
	            properties.centre = Vector.add(properties.centre, 
	                                           Vector.mult(part.position, part.mass !== Infinity ? part.mass : 1));
	        }

	        properties.centre = Vector.div(properties.centre, 
	                                       properties.mass !== Infinity ? properties.mass : body.parts.length);

	        return properties;
	    };

	    /*
	    *
	    *  Events Documentation
	    *
	    */

	    /**
	    * Fired when a body starts sleeping (where `this` is the body).
	    *
	    * @event sleepStart
	    * @this {body} The body that has started sleeping
	    * @param {} event An event object
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when a body ends sleeping (where `this` is the body).
	    *
	    * @event sleepEnd
	    * @this {body} The body that has ended sleeping
	    * @param {} event An event object
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * An integer `Number` uniquely identifying number generated in `Body.create` by `Common.nextId`.
	     *
	     * @property id
	     * @type number
	     */

	    /**
	     * A `String` denoting the type of object.
	     *
	     * @property type
	     * @type string
	     * @default "body"
	     * @readOnly
	     */

	    /**
	     * An arbitrary `String` name to help the user identify and manage bodies.
	     *
	     * @property label
	     * @type string
	     * @default "Body"
	     */

	    /**
	     * An array of bodies that make up this body. 
	     * The first body in the array must always be a self reference to the current body instance.
	     * All bodies in the `parts` array together form a single rigid compound body.
	     * Parts are allowed to overlap, have gaps or holes or even form concave bodies.
	     * Parts themselves should never be added to a `World`, only the parent body should be.
	     * Use `Body.setParts` when setting parts to ensure correct updates of all properties.
	     *
	     * @property parts
	     * @type body[]
	     */

	    /**
	     * A self reference if the body is _not_ a part of another body.
	     * Otherwise this is a reference to the body that this is a part of.
	     * See `body.parts`.
	     *
	     * @property parent
	     * @type body
	     */

	    /**
	     * A `Number` specifying the angle of the body, in radians.
	     *
	     * @property angle
	     * @type number
	     * @default 0
	     */

	    /**
	     * An array of `Vector` objects that specify the convex hull of the rigid body.
	     * These should be provided about the origin `(0, 0)`. E.g.
	     *
	     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
	     *
	     * When passed via `Body.create`, the vertices are translated relative to `body.position` (i.e. world-space, and constantly updated by `Body.update` during simulation).
	     * The `Vector` objects are also augmented with additional properties required for efficient collision detection. 
	     *
	     * Other properties such as `inertia` and `bounds` are automatically calculated from the passed vertices (unless provided via `options`).
	     * Concave hulls are not currently supported. The module `Matter.Vertices` contains useful methods for working with vertices.
	     *
	     * @property vertices
	     * @type vector[]
	     */

	    /**
	     * A `Vector` that specifies the current world-space position of the body.
	     *
	     * @property position
	     * @type vector
	     * @default { x: 0, y: 0 }
	     */

	    /**
	     * A `Vector` that specifies the force to apply in the current step. It is zeroed after every `Body.update`. See also `Body.applyForce`.
	     *
	     * @property force
	     * @type vector
	     * @default { x: 0, y: 0 }
	     */

	    /**
	     * A `Number` that specifies the torque (turning force) to apply in the current step. It is zeroed after every `Body.update`.
	     *
	     * @property torque
	     * @type number
	     * @default 0
	     */

	    /**
	     * A `Number` that _measures_ the current speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.velocity`).
	     *
	     * @readOnly
	     * @property speed
	     * @type number
	     * @default 0
	     */

	    /**
	     * A `Number` that _measures_ the current angular speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.angularVelocity`).
	     *
	     * @readOnly
	     * @property angularSpeed
	     * @type number
	     * @default 0
	     */

	    /**
	     * A `Vector` that _measures_ the current velocity of the body after the last `Body.update`. It is read-only. 
	     * If you need to modify a body's velocity directly, you should either apply a force or simply change the body's `position` (as the engine uses position-Verlet integration).
	     *
	     * @readOnly
	     * @property velocity
	     * @type vector
	     * @default { x: 0, y: 0 }
	     */

	    /**
	     * A `Number` that _measures_ the current angular velocity of the body after the last `Body.update`. It is read-only. 
	     * If you need to modify a body's angular velocity directly, you should apply a torque or simply change the body's `angle` (as the engine uses position-Verlet integration).
	     *
	     * @readOnly
	     * @property angularVelocity
	     * @type number
	     * @default 0
	     */

	    /**
	     * A flag that indicates whether a body is considered static. A static body can never change position or angle and is completely fixed.
	     * If you need to set a body as static after its creation, you should use `Body.setStatic` as this requires more than just setting this flag.
	     *
	     * @property isStatic
	     * @type boolean
	     * @default false
	     */

	    /**
	     * A flag that indicates whether a body is a sensor. Sensor triggers collision events, but doesn't react with colliding body physically.
	     *
	     * @property isSensor
	     * @type boolean
	     * @default false
	     */

	    /**
	     * A flag that indicates whether the body is considered sleeping. A sleeping body acts similar to a static body, except it is only temporary and can be awoken.
	     * If you need to set a body as sleeping, you should use `Sleeping.set` as this requires more than just setting this flag.
	     *
	     * @property isSleeping
	     * @type boolean
	     * @default false
	     */

	    /**
	     * A `Number` that _measures_ the amount of movement a body currently has (a combination of `speed` and `angularSpeed`). It is read-only and always positive.
	     * It is used and updated by the `Matter.Sleeping` module during simulation to decide if a body has come to rest.
	     *
	     * @readOnly
	     * @property motion
	     * @type number
	     * @default 0
	     */

	    /**
	     * A `Number` that defines the number of updates in which this body must have near-zero velocity before it is set as sleeping by the `Matter.Sleeping` module (if sleeping is enabled by the engine).
	     *
	     * @property sleepThreshold
	     * @type number
	     * @default 60
	     */

	    /**
	     * A `Number` that defines the density of the body, that is its mass per unit area.
	     * If you pass the density via `Body.create` the `mass` property is automatically calculated for you based on the size (area) of the object.
	     * This is generally preferable to simply setting mass and allows for more intuitive definition of materials (e.g. rock has a higher density than wood).
	     *
	     * @property density
	     * @type number
	     * @default 0.001
	     */

	    /**
	     * A `Number` that defines the mass of the body, although it may be more appropriate to specify the `density` property instead.
	     * If you modify this value, you must also modify the `body.inverseMass` property (`1 / mass`).
	     *
	     * @property mass
	     * @type number
	     */

	    /**
	     * A `Number` that defines the inverse mass of the body (`1 / mass`).
	     * If you modify this value, you must also modify the `body.mass` property.
	     *
	     * @property inverseMass
	     * @type number
	     */

	    /**
	     * A `Number` that defines the moment of inertia (i.e. second moment of area) of the body.
	     * It is automatically calculated from the given convex hull (`vertices` array) and density in `Body.create`.
	     * If you modify this value, you must also modify the `body.inverseInertia` property (`1 / inertia`).
	     *
	     * @property inertia
	     * @type number
	     */

	    /**
	     * A `Number` that defines the inverse moment of inertia of the body (`1 / inertia`).
	     * If you modify this value, you must also modify the `body.inertia` property.
	     *
	     * @property inverseInertia
	     * @type number
	     */

	    /**
	     * A `Number` that defines the restitution (elasticity) of the body. The value is always positive and is in the range `(0, 1)`.
	     * A value of `0` means collisions may be perfectly inelastic and no bouncing may occur. 
	     * A value of `0.8` means the body may bounce back with approximately 80% of its kinetic energy.
	     * Note that collision response is based on _pairs_ of bodies, and that `restitution` values are _combined_ with the following formula:
	     *
	     *     Math.max(bodyA.restitution, bodyB.restitution)
	     *
	     * @property restitution
	     * @type number
	     * @default 0
	     */

	    /**
	     * A `Number` that defines the friction of the body. The value is always positive and is in the range `(0, 1)`.
	     * A value of `0` means that the body may slide indefinitely.
	     * A value of `1` means the body may come to a stop almost instantly after a force is applied.
	     *
	     * The effects of the value may be non-linear. 
	     * High values may be unstable depending on the body.
	     * The engine uses a Coulomb friction model including static and kinetic friction.
	     * Note that collision response is based on _pairs_ of bodies, and that `friction` values are _combined_ with the following formula:
	     *
	     *     Math.min(bodyA.friction, bodyB.friction)
	     *
	     * @property friction
	     * @type number
	     * @default 0.1
	     */

	    /**
	     * A `Number` that defines the static friction of the body (in the Coulomb friction model). 
	     * A value of `0` means the body will never 'stick' when it is nearly stationary and only dynamic `friction` is used.
	     * The higher the value (e.g. `10`), the more force it will take to initially get the body moving when nearly stationary.
	     * This value is multiplied with the `friction` property to make it easier to change `friction` and maintain an appropriate amount of static friction.
	     *
	     * @property frictionStatic
	     * @type number
	     * @default 0.5
	     */

	    /**
	     * A `Number` that defines the air friction of the body (air resistance). 
	     * A value of `0` means the body will never slow as it moves through space.
	     * The higher the value, the faster a body slows when moving through space.
	     * The effects of the value are non-linear. 
	     *
	     * @property frictionAir
	     * @type number
	     * @default 0.01
	     */

	    /**
	     * An `Object` that specifies the collision filtering properties of this body.
	     *
	     * Collisions between two bodies will obey the following rules:
	     * - If the two bodies have the same non-zero value of `collisionFilter.group`,
	     *   they will always collide if the value is positive, and they will never collide
	     *   if the value is negative.
	     * - If the two bodies have different values of `collisionFilter.group` or if one
	     *   (or both) of the bodies has a value of 0, then the category/mask rules apply as follows:
	     *
	     * Each body belongs to a collision category, given by `collisionFilter.category`. This
	     * value is used as a bit field and the category should have only one bit set, meaning that
	     * the value of this property is a power of two in the range [1, 2^31]. Thus, there are 32
	     * different collision categories available.
	     *
	     * Each body also defines a collision bitmask, given by `collisionFilter.mask` which specifies
	     * the categories it collides with (the value is the bitwise AND value of all these categories).
	     *
	     * Using the category/mask rules, two bodies `A` and `B` collide if each includes the other's
	     * category in its mask, i.e. `(categoryA & maskB) !== 0` and `(categoryB & maskA) !== 0`
	     * are both true.
	     *
	     * @property collisionFilter
	     * @type object
	     */

	    /**
	     * An Integer `Number`, that specifies the collision group this body belongs to.
	     * See `body.collisionFilter` for more information.
	     *
	     * @property collisionFilter.group
	     * @type object
	     * @default 0
	     */

	    /**
	     * A bit field that specifies the collision category this body belongs to.
	     * The category value should have only one bit set, for example `0x0001`.
	     * This means there are up to 32 unique collision categories available.
	     * See `body.collisionFilter` for more information.
	     *
	     * @property collisionFilter.category
	     * @type object
	     * @default 1
	     */

	    /**
	     * A bit mask that specifies the collision categories this body may collide with.
	     * See `body.collisionFilter` for more information.
	     *
	     * @property collisionFilter.mask
	     * @type object
	     * @default -1
	     */

	    /**
	     * A `Number` that specifies a tolerance on how far a body is allowed to 'sink' or rotate into other bodies.
	     * Avoid changing this value unless you understand the purpose of `slop` in physics engines.
	     * The default should generally suffice, although very large bodies may require larger values for stable stacking.
	     *
	     * @property slop
	     * @type number
	     * @default 0.05
	     */

	    /**
	     * A `Number` that allows per-body time scaling, e.g. a force-field where bodies inside are in slow-motion, while others are at full speed.
	     *
	     * @property timeScale
	     * @type number
	     * @default 1
	     */

	    /**
	     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
	     *
	     * @property render
	     * @type object
	     */

	    /**
	     * A flag that indicates if the body should be rendered.
	     *
	     * @property render.visible
	     * @type boolean
	     * @default true
	     */

	    /**
	     * Sets the opacity to use when rendering.
	     *
	     * @property render.opacity
	     * @type number
	     * @default 1
	    */

	    /**
	     * An `Object` that defines the sprite properties to use when rendering, if any.
	     *
	     * @property render.sprite
	     * @type object
	     */

	    /**
	     * An `String` that defines the path to the image to use as the sprite texture, if any.
	     *
	     * @property render.sprite.texture
	     * @type string
	     */
	     
	    /**
	     * A `Number` that defines the scaling in the x-axis for the sprite, if any.
	     *
	     * @property render.sprite.xScale
	     * @type number
	     * @default 1
	     */

	    /**
	     * A `Number` that defines the scaling in the y-axis for the sprite, if any.
	     *
	     * @property render.sprite.yScale
	     * @type number
	     * @default 1
	     */

	     /**
	      * A `Number` that defines the offset in the x-axis for the sprite (normalised by texture width).
	      *
	      * @property render.sprite.xOffset
	      * @type number
	      * @default 0
	      */

	     /**
	      * A `Number` that defines the offset in the y-axis for the sprite (normalised by texture height).
	      *
	      * @property render.sprite.yOffset
	      * @type number
	      * @default 0
	      */

	    /**
	     * A `Number` that defines the line width to use when rendering the body outline (if a sprite is not defined).
	     * A value of `0` means no outline will be rendered.
	     *
	     * @property render.lineWidth
	     * @type number
	     * @default 1.5
	     */

	    /**
	     * A `String` that defines the fill style to use when rendering the body (if a sprite is not defined).
	     * It is the same as when using a canvas, so it accepts CSS style property values.
	     *
	     * @property render.fillStyle
	     * @type string
	     * @default a random colour
	     */

	    /**
	     * A `String` that defines the stroke style to use when rendering the body outline (if a sprite is not defined).
	     * It is the same as when using a canvas, so it accepts CSS style property values.
	     *
	     * @property render.strokeStyle
	     * @type string
	     * @default a random colour
	     */

	    /**
	     * An array of unique axis vectors (edge normals) used for collision detection.
	     * These are automatically calculated from the given convex hull (`vertices` array) in `Body.create`.
	     * They are constantly updated by `Body.update` during the simulation.
	     *
	     * @property axes
	     * @type vector[]
	     */
	     
	    /**
	     * A `Number` that _measures_ the area of the body's convex hull, calculated at creation by `Body.create`.
	     *
	     * @property area
	     * @type string
	     * @default 
	     */

	    /**
	     * A `Bounds` object that defines the AABB region for the body.
	     * It is automatically calculated from the given convex hull (`vertices` array) in `Body.create` and constantly updated by `Body.update` during simulation.
	     *
	     * @property bounds
	     * @type bounds
	     */

	})();

	},{"../core/Common":14,"../core/Sleeping":20,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27,"../render/Render":29}],2:[function(require,module,exports){
	/**
	* The `Matter.Composite` module contains methods for creating and manipulating composite bodies.
	* A composite body is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`, therefore composites form a tree structure.
	* It is important to use the functions in this module to modify composites, rather than directly modifying their properties.
	* Note that the `Matter.World` object is also a type of `Matter.Composite` and as such all composite methods here can also operate on a `Matter.World`.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Composite
	*/

	var Composite = {};

	module.exports = Composite;

	var Events = require('../core/Events');
	var Common = require('../core/Common');
	var Body = require('./Body');

	(function() {

	    /**
	     * Creates a new composite. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properites section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {} [options]
	     * @return {composite} A new composite
	     */
	    Composite.create = function(options) {
	        return Common.extend({ 
	            id: Common.nextId(),
	            type: 'composite',
	            parent: null,
	            isModified: false,
	            bodies: [], 
	            constraints: [], 
	            composites: [],
	            label: 'Composite'
	        }, options);
	    };

	    /**
	     * Sets the composite's `isModified` flag. 
	     * If `updateParents` is true, all parents will be set (default: false).
	     * If `updateChildren` is true, all children will be set (default: false).
	     * @method setModified
	     * @param {composite} composite
	     * @param {boolean} isModified
	     * @param {boolean} [updateParents=false]
	     * @param {boolean} [updateChildren=false]
	     */
	    Composite.setModified = function(composite, isModified, updateParents, updateChildren) {
	        composite.isModified = isModified;

	        if (updateParents && composite.parent) {
	            Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
	        }

	        if (updateChildren) {
	            for(var i = 0; i < composite.composites.length; i++) {
	                var childComposite = composite.composites[i];
	                Composite.setModified(childComposite, isModified, updateParents, updateChildren);
	            }
	        }
	    };

	    /**
	     * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
	     * Triggers `beforeAdd` and `afterAdd` events on the `composite`.
	     * @method add
	     * @param {composite} composite
	     * @param {} object
	     * @return {composite} The original composite with the objects added
	     */
	    Composite.add = function(composite, object) {
	        var objects = [].concat(object);

	        Events.trigger(composite, 'beforeAdd', { object: object });

	        for (var i = 0; i < objects.length; i++) {
	            var obj = objects[i];

	            switch (obj.type) {

	            case 'body':
	                // skip adding compound parts
	                if (obj.parent !== obj) {
	                    Common.log('Composite.add: skipped adding a compound body part (you must add its parent instead)', 'warn');
	                    break;
	                }

	                Composite.addBody(composite, obj);
	                break;
	            case 'constraint':
	                Composite.addConstraint(composite, obj);
	                break;
	            case 'composite':
	                Composite.addComposite(composite, obj);
	                break;
	            case 'mouseConstraint':
	                Composite.addConstraint(composite, obj.constraint);
	                break;

	            }
	        }

	        Events.trigger(composite, 'afterAdd', { object: object });

	        return composite;
	    };

	    /**
	     * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
	     * Optionally searching its children recursively.
	     * Triggers `beforeRemove` and `afterRemove` events on the `composite`.
	     * @method remove
	     * @param {composite} composite
	     * @param {} object
	     * @param {boolean} [deep=false]
	     * @return {composite} The original composite with the objects removed
	     */
	    Composite.remove = function(composite, object, deep) {
	        var objects = [].concat(object);

	        Events.trigger(composite, 'beforeRemove', { object: object });

	        for (var i = 0; i < objects.length; i++) {
	            var obj = objects[i];

	            switch (obj.type) {

	            case 'body':
	                Composite.removeBody(composite, obj, deep);
	                break;
	            case 'constraint':
	                Composite.removeConstraint(composite, obj, deep);
	                break;
	            case 'composite':
	                Composite.removeComposite(composite, obj, deep);
	                break;
	            case 'mouseConstraint':
	                Composite.removeConstraint(composite, obj.constraint);
	                break;

	            }
	        }

	        Events.trigger(composite, 'afterRemove', { object: object });

	        return composite;
	    };

	    /**
	     * Adds a composite to the given composite.
	     * @private
	     * @method addComposite
	     * @param {composite} compositeA
	     * @param {composite} compositeB
	     * @return {composite} The original compositeA with the objects from compositeB added
	     */
	    Composite.addComposite = function(compositeA, compositeB) {
	        compositeA.composites.push(compositeB);
	        compositeB.parent = compositeA;
	        Composite.setModified(compositeA, true, true, false);
	        return compositeA;
	    };

	    /**
	     * Removes a composite from the given composite, and optionally searching its children recursively.
	     * @private
	     * @method removeComposite
	     * @param {composite} compositeA
	     * @param {composite} compositeB
	     * @param {boolean} [deep=false]
	     * @return {composite} The original compositeA with the composite removed
	     */
	    Composite.removeComposite = function(compositeA, compositeB, deep) {
	        var position = Common.indexOf(compositeA.composites, compositeB);
	        if (position !== -1) {
	            Composite.removeCompositeAt(compositeA, position);
	            Composite.setModified(compositeA, true, true, false);
	        }

	        if (deep) {
	            for (var i = 0; i < compositeA.composites.length; i++){
	                Composite.removeComposite(compositeA.composites[i], compositeB, true);
	            }
	        }

	        return compositeA;
	    };

	    /**
	     * Removes a composite from the given composite.
	     * @private
	     * @method removeCompositeAt
	     * @param {composite} composite
	     * @param {number} position
	     * @return {composite} The original composite with the composite removed
	     */
	    Composite.removeCompositeAt = function(composite, position) {
	        composite.composites.splice(position, 1);
	        Composite.setModified(composite, true, true, false);
	        return composite;
	    };

	    /**
	     * Adds a body to the given composite.
	     * @private
	     * @method addBody
	     * @param {composite} composite
	     * @param {body} body
	     * @return {composite} The original composite with the body added
	     */
	    Composite.addBody = function(composite, body) {
	        composite.bodies.push(body);
	        Composite.setModified(composite, true, true, false);
	        return composite;
	    };

	    /**
	     * Removes a body from the given composite, and optionally searching its children recursively.
	     * @private
	     * @method removeBody
	     * @param {composite} composite
	     * @param {body} body
	     * @param {boolean} [deep=false]
	     * @return {composite} The original composite with the body removed
	     */
	    Composite.removeBody = function(composite, body, deep) {
	        var position = Common.indexOf(composite.bodies, body);
	        if (position !== -1) {
	            Composite.removeBodyAt(composite, position);
	            Composite.setModified(composite, true, true, false);
	        }

	        if (deep) {
	            for (var i = 0; i < composite.composites.length; i++){
	                Composite.removeBody(composite.composites[i], body, true);
	            }
	        }

	        return composite;
	    };

	    /**
	     * Removes a body from the given composite.
	     * @private
	     * @method removeBodyAt
	     * @param {composite} composite
	     * @param {number} position
	     * @return {composite} The original composite with the body removed
	     */
	    Composite.removeBodyAt = function(composite, position) {
	        composite.bodies.splice(position, 1);
	        Composite.setModified(composite, true, true, false);
	        return composite;
	    };

	    /**
	     * Adds a constraint to the given composite.
	     * @private
	     * @method addConstraint
	     * @param {composite} composite
	     * @param {constraint} constraint
	     * @return {composite} The original composite with the constraint added
	     */
	    Composite.addConstraint = function(composite, constraint) {
	        composite.constraints.push(constraint);
	        Composite.setModified(composite, true, true, false);
	        return composite;
	    };

	    /**
	     * Removes a constraint from the given composite, and optionally searching its children recursively.
	     * @private
	     * @method removeConstraint
	     * @param {composite} composite
	     * @param {constraint} constraint
	     * @param {boolean} [deep=false]
	     * @return {composite} The original composite with the constraint removed
	     */
	    Composite.removeConstraint = function(composite, constraint, deep) {
	        var position = Common.indexOf(composite.constraints, constraint);
	        if (position !== -1) {
	            Composite.removeConstraintAt(composite, position);
	        }

	        if (deep) {
	            for (var i = 0; i < composite.composites.length; i++){
	                Composite.removeConstraint(composite.composites[i], constraint, true);
	            }
	        }

	        return composite;
	    };

	    /**
	     * Removes a body from the given composite.
	     * @private
	     * @method removeConstraintAt
	     * @param {composite} composite
	     * @param {number} position
	     * @return {composite} The original composite with the constraint removed
	     */
	    Composite.removeConstraintAt = function(composite, position) {
	        composite.constraints.splice(position, 1);
	        Composite.setModified(composite, true, true, false);
	        return composite;
	    };

	    /**
	     * Removes all bodies, constraints and composites from the given composite.
	     * Optionally clearing its children recursively.
	     * @method clear
	     * @param {composite} composite
	     * @param {boolean} keepStatic
	     * @param {boolean} [deep=false]
	     */
	    Composite.clear = function(composite, keepStatic, deep) {
	        if (deep) {
	            for (var i = 0; i < composite.composites.length; i++){
	                Composite.clear(composite.composites[i], keepStatic, true);
	            }
	        }
	        
	        if (keepStatic) {
	            composite.bodies = composite.bodies.filter(function(body) { return body.isStatic; });
	        } else {
	            composite.bodies.length = 0;
	        }

	        composite.constraints.length = 0;
	        composite.composites.length = 0;
	        Composite.setModified(composite, true, true, false);

	        return composite;
	    };

	    /**
	     * Returns all bodies in the given composite, including all bodies in its children, recursively.
	     * @method allBodies
	     * @param {composite} composite
	     * @return {body[]} All the bodies
	     */
	    Composite.allBodies = function(composite) {
	        var bodies = [].concat(composite.bodies);

	        for (var i = 0; i < composite.composites.length; i++)
	            bodies = bodies.concat(Composite.allBodies(composite.composites[i]));

	        return bodies;
	    };

	    /**
	     * Returns all constraints in the given composite, including all constraints in its children, recursively.
	     * @method allConstraints
	     * @param {composite} composite
	     * @return {constraint[]} All the constraints
	     */
	    Composite.allConstraints = function(composite) {
	        var constraints = [].concat(composite.constraints);

	        for (var i = 0; i < composite.composites.length; i++)
	            constraints = constraints.concat(Composite.allConstraints(composite.composites[i]));

	        return constraints;
	    };

	    /**
	     * Returns all composites in the given composite, including all composites in its children, recursively.
	     * @method allComposites
	     * @param {composite} composite
	     * @return {composite[]} All the composites
	     */
	    Composite.allComposites = function(composite) {
	        var composites = [].concat(composite.composites);

	        for (var i = 0; i < composite.composites.length; i++)
	            composites = composites.concat(Composite.allComposites(composite.composites[i]));

	        return composites;
	    };

	    /**
	     * Searches the composite recursively for an object matching the type and id supplied, null if not found.
	     * @method get
	     * @param {composite} composite
	     * @param {number} id
	     * @param {string} type
	     * @return {object} The requested object, if found
	     */
	    Composite.get = function(composite, id, type) {
	        var objects,
	            object;

	        switch (type) {
	        case 'body':
	            objects = Composite.allBodies(composite);
	            break;
	        case 'constraint':
	            objects = Composite.allConstraints(composite);
	            break;
	        case 'composite':
	            objects = Composite.allComposites(composite).concat(composite);
	            break;
	        }

	        if (!objects)
	            return null;

	        object = objects.filter(function(object) { 
	            return object.id.toString() === id.toString(); 
	        });

	        return object.length === 0 ? null : object[0];
	    };

	    /**
	     * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add).
	     * @method move
	     * @param {compositeA} compositeA
	     * @param {object[]} objects
	     * @param {compositeB} compositeB
	     * @return {composite} Returns compositeA
	     */
	    Composite.move = function(compositeA, objects, compositeB) {
	        Composite.remove(compositeA, objects);
	        Composite.add(compositeB, objects);
	        return compositeA;
	    };

	    /**
	     * Assigns new ids for all objects in the composite, recursively.
	     * @method rebase
	     * @param {composite} composite
	     * @return {composite} Returns composite
	     */
	    Composite.rebase = function(composite) {
	        var objects = Composite.allBodies(composite)
	                        .concat(Composite.allConstraints(composite))
	                        .concat(Composite.allComposites(composite));

	        for (var i = 0; i < objects.length; i++) {
	            objects[i].id = Common.nextId();
	        }

	        Composite.setModified(composite, true, true, false);

	        return composite;
	    };

	    /**
	     * Translates all children in the composite by a given vector relative to their current positions, 
	     * without imparting any velocity.
	     * @method translate
	     * @param {composite} composite
	     * @param {vector} translation
	     * @param {bool} [recursive=true]
	     */
	    Composite.translate = function(composite, translation, recursive) {
	        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

	        for (var i = 0; i < bodies.length; i++) {
	            Body.translate(bodies[i], translation);
	        }

	        Composite.setModified(composite, true, true, false);

	        return composite;
	    };

	    /**
	     * Rotates all children in the composite by a given angle about the given point, without imparting any angular velocity.
	     * @method rotate
	     * @param {composite} composite
	     * @param {number} rotation
	     * @param {vector} point
	     * @param {bool} [recursive=true]
	     */
	    Composite.rotate = function(composite, rotation, point, recursive) {
	        var cos = Math.cos(rotation),
	            sin = Math.sin(rotation),
	            bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                dx = body.position.x - point.x,
	                dy = body.position.y - point.y;
	                
	            Body.setPosition(body, {
	                x: point.x + (dx * cos - dy * sin),
	                y: point.y + (dx * sin + dy * cos)
	            });

	            Body.rotate(body, rotation);
	        }

	        Composite.setModified(composite, true, true, false);

	        return composite;
	    };

	    /**
	     * Scales all children in the composite, including updating physical properties (mass, area, axes, inertia), from a world-space point.
	     * @method scale
	     * @param {composite} composite
	     * @param {number} scaleX
	     * @param {number} scaleY
	     * @param {vector} point
	     * @param {bool} [recursive=true]
	     */
	    Composite.scale = function(composite, scaleX, scaleY, point, recursive) {
	        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                dx = body.position.x - point.x,
	                dy = body.position.y - point.y;
	                
	            Body.setPosition(body, {
	                x: point.x + dx * scaleX,
	                y: point.y + dy * scaleY
	            });

	            Body.scale(body, scaleX, scaleY);
	        }

	        Composite.setModified(composite, true, true, false);

	        return composite;
	    };

	    /*
	    *
	    *  Events Documentation
	    *
	    */

	    /**
	    * Fired when a call to `Composite.add` is made, before objects have been added.
	    *
	    * @event beforeAdd
	    * @param {} event An event object
	    * @param {} event.object The object(s) to be added (may be a single body, constraint, composite or a mixed array of these)
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when a call to `Composite.add` is made, after objects have been added.
	    *
	    * @event afterAdd
	    * @param {} event An event object
	    * @param {} event.object The object(s) that have been added (may be a single body, constraint, composite or a mixed array of these)
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when a call to `Composite.remove` is made, before objects have been removed.
	    *
	    * @event beforeRemove
	    * @param {} event An event object
	    * @param {} event.object The object(s) to be removed (may be a single body, constraint, composite or a mixed array of these)
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when a call to `Composite.remove` is made, after objects have been removed.
	    *
	    * @event afterRemove
	    * @param {} event An event object
	    * @param {} event.object The object(s) that have been removed (may be a single body, constraint, composite or a mixed array of these)
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
	     *
	     * @property id
	     * @type number
	     */

	    /**
	     * A `String` denoting the type of object.
	     *
	     * @property type
	     * @type string
	     * @default "composite"
	     * @readOnly
	     */

	    /**
	     * An arbitrary `String` name to help the user identify and manage composites.
	     *
	     * @property label
	     * @type string
	     * @default "Composite"
	     */

	    /**
	     * A flag that specifies whether the composite has been modified during the current step.
	     * Most `Matter.Composite` methods will automatically set this flag to `true` to inform the engine of changes to be handled.
	     * If you need to change it manually, you should use the `Composite.setModified` method.
	     *
	     * @property isModified
	     * @type boolean
	     * @default false
	     */

	    /**
	     * The `Composite` that is the parent of this composite. It is automatically managed by the `Matter.Composite` methods.
	     *
	     * @property parent
	     * @type composite
	     * @default null
	     */

	    /**
	     * An array of `Body` that are _direct_ children of this composite.
	     * To add or remove bodies you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
	     * If you wish to recursively find all descendants, you should use the `Composite.allBodies` method.
	     *
	     * @property bodies
	     * @type body[]
	     * @default []
	     */

	    /**
	     * An array of `Constraint` that are _direct_ children of this composite.
	     * To add or remove constraints you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
	     * If you wish to recursively find all descendants, you should use the `Composite.allConstraints` method.
	     *
	     * @property constraints
	     * @type constraint[]
	     * @default []
	     */

	    /**
	     * An array of `Composite` that are _direct_ children of this composite.
	     * To add or remove composites you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
	     * If you wish to recursively find all descendants, you should use the `Composite.allComposites` method.
	     *
	     * @property composites
	     * @type composite[]
	     * @default []
	     */

	})();

	},{"../core/Common":14,"../core/Events":16,"./Body":1}],3:[function(require,module,exports){
	/**
	* The `Matter.World` module contains methods for creating and manipulating the world composite.
	* A `Matter.World` is a `Matter.Composite` body, which is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`.
	* A `Matter.World` has a few additional properties including `gravity` and `bounds`.
	* It is important to use the functions in the `Matter.Composite` module to modify the world composite, rather than directly modifying its properties.
	* There are also a few methods here that alias those in `Matter.Composite` for easier readability.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class World
	* @extends Composite
	*/

	var World = {};

	module.exports = World;

	var Composite = require('./Composite');
	var Constraint = require('../constraint/Constraint');
	var Common = require('../core/Common');

	(function() {

	    /**
	     * Creates a new world composite. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @constructor
	     * @param {} options
	     * @return {world} A new world
	     */
	    World.create = function(options) {
	        var composite = Composite.create();

	        var defaults = {
	            label: 'World',
	            gravity: {
	                x: 0,
	                y: 1,
	                scale: 0.001
	            },
	            bounds: { 
	                min: { x: -Infinity, y: -Infinity }, 
	                max: { x: Infinity, y: Infinity } 
	            }
	        };
	        
	        return Common.extend(composite, defaults, options);
	    };

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * The gravity to apply on the world.
	     *
	     * @property gravity
	     * @type object
	     */

	    /**
	     * The gravity x component.
	     *
	     * @property gravity.x
	     * @type object
	     * @default 0
	     */

	    /**
	     * The gravity y component.
	     *
	     * @property gravity.y
	     * @type object
	     * @default 1
	     */

	    /**
	     * The gravity scale factor.
	     *
	     * @property gravity.scale
	     * @type object
	     * @default 0.001
	     */

	    /**
	     * A `Bounds` object that defines the world bounds for collision detection.
	     *
	     * @property bounds
	     * @type bounds
	     * @default { min: { x: -Infinity, y: -Infinity }, max: { x: Infinity, y: Infinity } }
	     */

	    // World is a Composite body
	    // see src/module/Outro.js for these aliases:
	    
	    /**
	     * An alias for Composite.clear
	     * @method clear
	     * @param {world} world
	     * @param {boolean} keepStatic
	     */

	    /**
	     * An alias for Composite.add
	     * @method addComposite
	     * @param {world} world
	     * @param {composite} composite
	     * @return {world} The original world with the objects from composite added
	     */
	    
	     /**
	      * An alias for Composite.addBody
	      * @method addBody
	      * @param {world} world
	      * @param {body} body
	      * @return {world} The original world with the body added
	      */

	     /**
	      * An alias for Composite.addConstraint
	      * @method addConstraint
	      * @param {world} world
	      * @param {constraint} constraint
	      * @return {world} The original world with the constraint added
	      */

	})();

	},{"../constraint/Constraint":12,"../core/Common":14,"./Composite":2}],4:[function(require,module,exports){
	/**
	* The `Matter.Contact` module contains methods for creating and manipulating collision contacts.
	*
	* @class Contact
	*/

	var Contact = {};

	module.exports = Contact;

	(function() {

	    /**
	     * Creates a new contact.
	     * @method create
	     * @param {vertex} vertex
	     * @return {contact} A new contact
	     */
	    Contact.create = function(vertex) {
	        return {
	            id: Contact.id(vertex),
	            vertex: vertex,
	            normalImpulse: 0,
	            tangentImpulse: 0
	        };
	    };
	    
	    /**
	     * Generates a contact id.
	     * @method id
	     * @param {vertex} vertex
	     * @return {string} Unique contactID
	     */
	    Contact.id = function(vertex) {
	        return vertex.body.id + '_' + vertex.index;
	    };

	})();

	},{}],5:[function(require,module,exports){
	/**
	* The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
	*
	* @class Detector
	*/

	// TODO: speculative contacts

	var Detector = {};

	module.exports = Detector;

	var SAT = require('./SAT');
	var Pair = require('./Pair');
	var Bounds = require('../geometry/Bounds');

	(function() {

	    /**
	     * Finds all collisions given a list of pairs.
	     * @method collisions
	     * @param {pair[]} broadphasePairs
	     * @param {engine} engine
	     * @return {array} collisions
	     */
	    Detector.collisions = function(broadphasePairs, engine) {
	        var collisions = [],
	            pairsTable = engine.pairs.table;

	        
	        for (var i = 0; i < broadphasePairs.length; i++) {
	            var bodyA = broadphasePairs[i][0], 
	                bodyB = broadphasePairs[i][1];

	            if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
	                continue;
	            
	            if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
	                continue;


	            // mid phase
	            if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {
	                for (var j = bodyA.parts.length > 1 ? 1 : 0; j < bodyA.parts.length; j++) {
	                    var partA = bodyA.parts[j];

	                    for (var k = bodyB.parts.length > 1 ? 1 : 0; k < bodyB.parts.length; k++) {
	                        var partB = bodyB.parts[k];

	                        if ((partA === bodyA && partB === bodyB) || Bounds.overlaps(partA.bounds, partB.bounds)) {
	                            // find a previous collision we could reuse
	                            var pairId = Pair.id(partA, partB),
	                                pair = pairsTable[pairId],
	                                previousCollision;

	                            if (pair && pair.isActive) {
	                                previousCollision = pair.collision;
	                            } else {
	                                previousCollision = null;
	                            }

	                            // narrow phase
	                            var collision = SAT.collides(partA, partB, previousCollision);


	                            if (collision.collided) {
	                                collisions.push(collision);
	                            }
	                        }
	                    }
	                }
	            }
	        }

	        return collisions;
	    };

	    /**
	     * Returns `true` if both supplied collision filters will allow a collision to occur.
	     * See `body.collisionFilter` for more information.
	     * @method canCollide
	     * @param {} filterA
	     * @param {} filterB
	     * @return {bool} `true` if collision can occur
	     */
	    Detector.canCollide = function(filterA, filterB) {
	        if (filterA.group === filterB.group && filterA.group !== 0)
	            return filterA.group > 0;

	        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
	    };

	})();

	},{"../geometry/Bounds":24,"./Pair":7,"./SAT":11}],6:[function(require,module,exports){
	/**
	* The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
	*
	* @class Grid
	*/

	var Grid = {};

	module.exports = Grid;

	var Pair = require('./Pair');
	var Detector = require('./Detector');
	var Common = require('../core/Common');

	(function() {

	    /**
	     * Creates a new grid.
	     * @method create
	     * @param {} options
	     * @return {grid} A new grid
	     */
	    Grid.create = function(options) {
	        var defaults = {
	            controller: Grid,
	            detector: Detector.collisions,
	            buckets: {},
	            pairs: {},
	            pairsList: [],
	            bucketWidth: 48,
	            bucketHeight: 48
	        };

	        return Common.extend(defaults, options);
	    };

	    /**
	     * The width of a single grid bucket.
	     *
	     * @property bucketWidth
	     * @type number
	     * @default 48
	     */

	    /**
	     * The height of a single grid bucket.
	     *
	     * @property bucketHeight
	     * @type number
	     * @default 48
	     */

	    /**
	     * Updates the grid.
	     * @method update
	     * @param {grid} grid
	     * @param {body[]} bodies
	     * @param {engine} engine
	     * @param {boolean} forceUpdate
	     */
	    Grid.update = function(grid, bodies, engine, forceUpdate) {
	        var i, col, row,
	            world = engine.world,
	            buckets = grid.buckets,
	            bucket,
	            bucketId,
	            gridChanged = false;


	        for (i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (body.isSleeping && !forceUpdate)
	                continue;

	            // don't update out of world bodies
	            if (body.bounds.max.x < world.bounds.min.x || body.bounds.min.x > world.bounds.max.x
	                || body.bounds.max.y < world.bounds.min.y || body.bounds.min.y > world.bounds.max.y)
	                continue;

	            var newRegion = _getRegion(grid, body);

	            // if the body has changed grid region
	            if (!body.region || newRegion.id !== body.region.id || forceUpdate) {


	                if (!body.region || forceUpdate)
	                    body.region = newRegion;

	                var union = _regionUnion(newRegion, body.region);

	                // update grid buckets affected by region change
	                // iterate over the union of both regions
	                for (col = union.startCol; col <= union.endCol; col++) {
	                    for (row = union.startRow; row <= union.endRow; row++) {
	                        bucketId = _getBucketId(col, row);
	                        bucket = buckets[bucketId];

	                        var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
	                                                && row >= newRegion.startRow && row <= newRegion.endRow);

	                        var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
	                                                && row >= body.region.startRow && row <= body.region.endRow);

	                        // remove from old region buckets
	                        if (!isInsideNewRegion && isInsideOldRegion) {
	                            if (isInsideOldRegion) {
	                                if (bucket)
	                                    _bucketRemoveBody(grid, bucket, body);
	                            }
	                        }

	                        // add to new region buckets
	                        if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
	                            if (!bucket)
	                                bucket = _createBucket(buckets, bucketId);
	                            _bucketAddBody(grid, bucket, body);
	                        }
	                    }
	                }

	                // set the new region
	                body.region = newRegion;

	                // flag changes so we can update pairs
	                gridChanged = true;
	            }
	        }

	        // update pairs list only if pairs changed (i.e. a body changed region)
	        if (gridChanged)
	            grid.pairsList = _createActivePairsList(grid);
	    };

	    /**
	     * Clears the grid.
	     * @method clear
	     * @param {grid} grid
	     */
	    Grid.clear = function(grid) {
	        grid.buckets = {};
	        grid.pairs = {};
	        grid.pairsList = [];
	    };

	    /**
	     * Finds the union of two regions.
	     * @method _regionUnion
	     * @private
	     * @param {} regionA
	     * @param {} regionB
	     * @return {} region
	     */
	    var _regionUnion = function(regionA, regionB) {
	        var startCol = Math.min(regionA.startCol, regionB.startCol),
	            endCol = Math.max(regionA.endCol, regionB.endCol),
	            startRow = Math.min(regionA.startRow, regionB.startRow),
	            endRow = Math.max(regionA.endRow, regionB.endRow);

	        return _createRegion(startCol, endCol, startRow, endRow);
	    };

	    /**
	     * Gets the region a given body falls in for a given grid.
	     * @method _getRegion
	     * @private
	     * @param {} grid
	     * @param {} body
	     * @return {} region
	     */
	    var _getRegion = function(grid, body) {
	        var bounds = body.bounds,
	            startCol = Math.floor(bounds.min.x / grid.bucketWidth),
	            endCol = Math.floor(bounds.max.x / grid.bucketWidth),
	            startRow = Math.floor(bounds.min.y / grid.bucketHeight),
	            endRow = Math.floor(bounds.max.y / grid.bucketHeight);

	        return _createRegion(startCol, endCol, startRow, endRow);
	    };

	    /**
	     * Creates a region.
	     * @method _createRegion
	     * @private
	     * @param {} startCol
	     * @param {} endCol
	     * @param {} startRow
	     * @param {} endRow
	     * @return {} region
	     */
	    var _createRegion = function(startCol, endCol, startRow, endRow) {
	        return { 
	            id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
	            startCol: startCol, 
	            endCol: endCol, 
	            startRow: startRow, 
	            endRow: endRow 
	        };
	    };

	    /**
	     * Gets the bucket id at the given position.
	     * @method _getBucketId
	     * @private
	     * @param {} column
	     * @param {} row
	     * @return {string} bucket id
	     */
	    var _getBucketId = function(column, row) {
	        return column + ',' + row;
	    };

	    /**
	     * Creates a bucket.
	     * @method _createBucket
	     * @private
	     * @param {} buckets
	     * @param {} bucketId
	     * @return {} bucket
	     */
	    var _createBucket = function(buckets, bucketId) {
	        var bucket = buckets[bucketId] = [];
	        return bucket;
	    };

	    /**
	     * Adds a body to a bucket.
	     * @method _bucketAddBody
	     * @private
	     * @param {} grid
	     * @param {} bucket
	     * @param {} body
	     */
	    var _bucketAddBody = function(grid, bucket, body) {
	        // add new pairs
	        for (var i = 0; i < bucket.length; i++) {
	            var bodyB = bucket[i];

	            if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
	                continue;

	            // keep track of the number of buckets the pair exists in
	            // important for Grid.update to work
	            var pairId = Pair.id(body, bodyB),
	                pair = grid.pairs[pairId];

	            if (pair) {
	                pair[2] += 1;
	            } else {
	                grid.pairs[pairId] = [body, bodyB, 1];
	            }
	        }

	        // add to bodies (after pairs, otherwise pairs with self)
	        bucket.push(body);
	    };

	    /**
	     * Removes a body from a bucket.
	     * @method _bucketRemoveBody
	     * @private
	     * @param {} grid
	     * @param {} bucket
	     * @param {} body
	     */
	    var _bucketRemoveBody = function(grid, bucket, body) {
	        // remove from bucket
	        bucket.splice(Common.indexOf(bucket, body), 1);

	        // update pair counts
	        for (var i = 0; i < bucket.length; i++) {
	            // keep track of the number of buckets the pair exists in
	            // important for _createActivePairsList to work
	            var bodyB = bucket[i],
	                pairId = Pair.id(body, bodyB),
	                pair = grid.pairs[pairId];

	            if (pair)
	                pair[2] -= 1;
	        }
	    };

	    /**
	     * Generates a list of the active pairs in the grid.
	     * @method _createActivePairsList
	     * @private
	     * @param {} grid
	     * @return [] pairs
	     */
	    var _createActivePairsList = function(grid) {
	        var pairKeys,
	            pair,
	            pairs = [];

	        // grid.pairs is used as a hashmap
	        pairKeys = Common.keys(grid.pairs);

	        // iterate over grid.pairs
	        for (var k = 0; k < pairKeys.length; k++) {
	            pair = grid.pairs[pairKeys[k]];

	            // if pair exists in at least one bucket
	            // it is a pair that needs further collision testing so push it
	            if (pair[2] > 0) {
	                pairs.push(pair);
	            } else {
	                delete grid.pairs[pairKeys[k]];
	            }
	        }

	        return pairs;
	    };
	    
	})();

	},{"../core/Common":14,"./Detector":5,"./Pair":7}],7:[function(require,module,exports){
	/**
	* The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
	*
	* @class Pair
	*/

	var Pair = {};

	module.exports = Pair;

	var Contact = require('./Contact');

	(function() {
	    
	    /**
	     * Creates a pair.
	     * @method create
	     * @param {collision} collision
	     * @param {number} timestamp
	     * @return {pair} A new pair
	     */
	    Pair.create = function(collision, timestamp) {
	        var bodyA = collision.bodyA,
	            bodyB = collision.bodyB,
	            parentA = collision.parentA,
	            parentB = collision.parentB;

	        var pair = {
	            id: Pair.id(bodyA, bodyB),
	            bodyA: bodyA,
	            bodyB: bodyB,
	            contacts: {},
	            activeContacts: [],
	            separation: 0,
	            isActive: true,
	            isSensor: bodyA.isSensor || bodyB.isSensor,
	            timeCreated: timestamp,
	            timeUpdated: timestamp,
	            inverseMass: parentA.inverseMass + parentB.inverseMass,
	            friction: Math.min(parentA.friction, parentB.friction),
	            frictionStatic: Math.max(parentA.frictionStatic, parentB.frictionStatic),
	            restitution: Math.max(parentA.restitution, parentB.restitution),
	            slop: Math.max(parentA.slop, parentB.slop)
	        };

	        Pair.update(pair, collision, timestamp);

	        return pair;
	    };

	    /**
	     * Updates a pair given a collision.
	     * @method update
	     * @param {pair} pair
	     * @param {collision} collision
	     * @param {number} timestamp
	     */
	    Pair.update = function(pair, collision, timestamp) {
	        var contacts = pair.contacts,
	            supports = collision.supports,
	            activeContacts = pair.activeContacts,
	            parentA = collision.parentA,
	            parentB = collision.parentB;
	        
	        pair.collision = collision;
	        pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
	        pair.friction = Math.min(parentA.friction, parentB.friction);
	        pair.frictionStatic = Math.max(parentA.frictionStatic, parentB.frictionStatic);
	        pair.restitution = Math.max(parentA.restitution, parentB.restitution);
	        pair.slop = Math.max(parentA.slop, parentB.slop);
	        activeContacts.length = 0;
	        
	        if (collision.collided) {
	            for (var i = 0; i < supports.length; i++) {
	                var support = supports[i],
	                    contactId = Contact.id(support),
	                    contact = contacts[contactId];

	                if (contact) {
	                    activeContacts.push(contact);
	                } else {
	                    activeContacts.push(contacts[contactId] = Contact.create(support));
	                }
	            }

	            pair.separation = collision.depth;
	            Pair.setActive(pair, true, timestamp);
	        } else {
	            if (pair.isActive === true)
	                Pair.setActive(pair, false, timestamp);
	        }
	    };
	    
	    /**
	     * Set a pair as active or inactive.
	     * @method setActive
	     * @param {pair} pair
	     * @param {bool} isActive
	     * @param {number} timestamp
	     */
	    Pair.setActive = function(pair, isActive, timestamp) {
	        if (isActive) {
	            pair.isActive = true;
	            pair.timeUpdated = timestamp;
	        } else {
	            pair.isActive = false;
	            pair.activeContacts.length = 0;
	        }
	    };

	    /**
	     * Get the id for the given pair.
	     * @method id
	     * @param {body} bodyA
	     * @param {body} bodyB
	     * @return {string} Unique pairId
	     */
	    Pair.id = function(bodyA, bodyB) {
	        if (bodyA.id < bodyB.id) {
	            return bodyA.id + '_' + bodyB.id;
	        } else {
	            return bodyB.id + '_' + bodyA.id;
	        }
	    };

	})();

	},{"./Contact":4}],8:[function(require,module,exports){
	/**
	* The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
	*
	* @class Pairs
	*/

	var Pairs = {};

	module.exports = Pairs;

	var Pair = require('./Pair');
	var Common = require('../core/Common');

	(function() {
	    
	    var _pairMaxIdleLife = 1000;

	    /**
	     * Creates a new pairs structure.
	     * @method create
	     * @param {object} options
	     * @return {pairs} A new pairs structure
	     */
	    Pairs.create = function(options) {
	        return Common.extend({ 
	            table: {},
	            list: [],
	            collisionStart: [],
	            collisionActive: [],
	            collisionEnd: []
	        }, options);
	    };

	    /**
	     * Updates pairs given a list of collisions.
	     * @method update
	     * @param {object} pairs
	     * @param {collision[]} collisions
	     * @param {number} timestamp
	     */
	    Pairs.update = function(pairs, collisions, timestamp) {
	        var pairsList = pairs.list,
	            pairsTable = pairs.table,
	            collisionStart = pairs.collisionStart,
	            collisionEnd = pairs.collisionEnd,
	            collisionActive = pairs.collisionActive,
	            activePairIds = [],
	            collision,
	            pairId,
	            pair,
	            i;

	        // clear collision state arrays, but maintain old reference
	        collisionStart.length = 0;
	        collisionEnd.length = 0;
	        collisionActive.length = 0;

	        for (i = 0; i < collisions.length; i++) {
	            collision = collisions[i];

	            if (collision.collided) {
	                pairId = Pair.id(collision.bodyA, collision.bodyB);
	                activePairIds.push(pairId);

	                pair = pairsTable[pairId];
	                
	                if (pair) {
	                    // pair already exists (but may or may not be active)
	                    if (pair.isActive) {
	                        // pair exists and is active
	                        collisionActive.push(pair);
	                    } else {
	                        // pair exists but was inactive, so a collision has just started again
	                        collisionStart.push(pair);
	                    }

	                    // update the pair
	                    Pair.update(pair, collision, timestamp);
	                } else {
	                    // pair did not exist, create a new pair
	                    pair = Pair.create(collision, timestamp);
	                    pairsTable[pairId] = pair;

	                    // push the new pair
	                    collisionStart.push(pair);
	                    pairsList.push(pair);
	                }
	            }
	        }

	        // deactivate previously active pairs that are now inactive
	        for (i = 0; i < pairsList.length; i++) {
	            pair = pairsList[i];
	            if (pair.isActive && Common.indexOf(activePairIds, pair.id) === -1) {
	                Pair.setActive(pair, false, timestamp);
	                collisionEnd.push(pair);
	            }
	        }
	    };
	    
	    /**
	     * Finds and removes pairs that have been inactive for a set amount of time.
	     * @method removeOld
	     * @param {object} pairs
	     * @param {number} timestamp
	     */
	    Pairs.removeOld = function(pairs, timestamp) {
	        var pairsList = pairs.list,
	            pairsTable = pairs.table,
	            indexesToRemove = [],
	            pair,
	            collision,
	            pairIndex,
	            i;

	        for (i = 0; i < pairsList.length; i++) {
	            pair = pairsList[i];
	            collision = pair.collision;
	            
	            // never remove sleeping pairs
	            if (collision.bodyA.isSleeping || collision.bodyB.isSleeping) {
	                pair.timeUpdated = timestamp;
	                continue;
	            }

	            // if pair is inactive for too long, mark it to be removed
	            if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
	                indexesToRemove.push(i);
	            }
	        }

	        // remove marked pairs
	        for (i = 0; i < indexesToRemove.length; i++) {
	            pairIndex = indexesToRemove[i] - i;
	            pair = pairsList[pairIndex];
	            delete pairsTable[pair.id];
	            pairsList.splice(pairIndex, 1);
	        }
	    };

	    /**
	     * Clears the given pairs structure.
	     * @method clear
	     * @param {pairs} pairs
	     * @return {pairs} pairs
	     */
	    Pairs.clear = function(pairs) {
	        pairs.table = {};
	        pairs.list.length = 0;
	        pairs.collisionStart.length = 0;
	        pairs.collisionActive.length = 0;
	        pairs.collisionEnd.length = 0;
	        return pairs;
	    };

	})();

	},{"../core/Common":14,"./Pair":7}],9:[function(require,module,exports){
	/**
	* The `Matter.Query` module contains methods for performing collision queries.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Query
	*/

	var Query = {};

	module.exports = Query;

	var Vector = require('../geometry/Vector');
	var SAT = require('./SAT');
	var Bounds = require('../geometry/Bounds');
	var Bodies = require('../factory/Bodies');
	var Vertices = require('../geometry/Vertices');

	(function() {

	    /**
	     * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
	     * @method ray
	     * @param {body[]} bodies
	     * @param {vector} startPoint
	     * @param {vector} endPoint
	     * @param {number} [rayWidth]
	     * @return {object[]} Collisions
	     */
	    Query.ray = function(bodies, startPoint, endPoint, rayWidth) {
	        rayWidth = rayWidth || 1e-100;

	        var rayAngle = Vector.angle(startPoint, endPoint),
	            rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
	            rayX = (endPoint.x + startPoint.x) * 0.5,
	            rayY = (endPoint.y + startPoint.y) * 0.5,
	            ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
	            collisions = [];

	        for (var i = 0; i < bodies.length; i++) {
	            var bodyA = bodies[i];
	            
	            if (Bounds.overlaps(bodyA.bounds, ray.bounds)) {
	                for (var j = bodyA.parts.length === 1 ? 0 : 1; j < bodyA.parts.length; j++) {
	                    var part = bodyA.parts[j];

	                    if (Bounds.overlaps(part.bounds, ray.bounds)) {
	                        var collision = SAT.collides(part, ray);
	                        if (collision.collided) {
	                            collision.body = collision.bodyA = collision.bodyB = bodyA;
	                            collisions.push(collision);
	                            break;
	                        }
	                    }
	                }
	            }
	        }

	        return collisions;
	    };

	    /**
	     * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
	     * @method region
	     * @param {body[]} bodies
	     * @param {bounds} bounds
	     * @param {bool} [outside=false]
	     * @return {body[]} The bodies matching the query
	     */
	    Query.region = function(bodies, bounds, outside) {
	        var result = [];

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                overlaps = Bounds.overlaps(body.bounds, bounds);
	            if ((overlaps && !outside) || (!overlaps && outside))
	                result.push(body);
	        }

	        return result;
	    };

	    /**
	     * Returns all bodies whose vertices contain the given point, from the given set of bodies.
	     * @method point
	     * @param {body[]} bodies
	     * @param {vector} point
	     * @return {body[]} The bodies matching the query
	     */
	    Query.point = function(bodies, point) {
	        var result = [];

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];
	            
	            if (Bounds.contains(body.bounds, point)) {
	                for (var j = body.parts.length === 1 ? 0 : 1; j < body.parts.length; j++) {
	                    var part = body.parts[j];

	                    if (Bounds.contains(part.bounds, point)
	                        && Vertices.contains(part.vertices, point)) {
	                        result.push(body);
	                        break;
	                    }
	                }
	            }
	        }

	        return result;
	    };

	})();

	},{"../factory/Bodies":21,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27,"./SAT":11}],10:[function(require,module,exports){
	/**
	* The `Matter.Resolver` module contains methods for resolving collision pairs.
	*
	* @class Resolver
	*/

	var Resolver = {};

	module.exports = Resolver;

	var Vertices = require('../geometry/Vertices');
	var Vector = require('../geometry/Vector');
	var Common = require('../core/Common');
	var Bounds = require('../geometry/Bounds');

	(function() {

	    Resolver._restingThresh = 4;
	    Resolver._restingThreshTangent = 6;
	    Resolver._positionDampen = 0.9;
	    Resolver._positionWarming = 0.8;
	    Resolver._frictionNormalMultiplier = 5;

	    /**
	     * Prepare pairs for position solving.
	     * @method preSolvePosition
	     * @param {pair[]} pairs
	     */
	    Resolver.preSolvePosition = function(pairs) {
	        var i,
	            pair,
	            activeCount;

	        // find total contacts on each body
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];
	            
	            if (!pair.isActive)
	                continue;
	            
	            activeCount = pair.activeContacts.length;
	            pair.collision.parentA.totalContacts += activeCount;
	            pair.collision.parentB.totalContacts += activeCount;
	        }
	    };

	    /**
	     * Find a solution for pair positions.
	     * @method solvePosition
	     * @param {pair[]} pairs
	     * @param {number} timeScale
	     */
	    Resolver.solvePosition = function(pairs, timeScale) {
	        var i,
	            pair,
	            collision,
	            bodyA,
	            bodyB,
	            normal,
	            bodyBtoA,
	            contactShare,
	            positionImpulse,
	            tempA = Vector._temp[0],
	            tempB = Vector._temp[1],
	            tempC = Vector._temp[2],
	            tempD = Vector._temp[3];

	        // find impulses required to resolve penetration
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];
	            
	            if (!pair.isActive || pair.isSensor)
	                continue;

	            collision = pair.collision;
	            bodyA = collision.parentA;
	            bodyB = collision.parentB;
	            normal = collision.normal;

	            // get current separation between body edges involved in collision
	            bodyBtoA = Vector.sub(Vector.add(bodyB.positionImpulse, bodyB.position, tempA), 
	                                    Vector.add(bodyA.positionImpulse, 
	                                        Vector.sub(bodyB.position, collision.penetration, tempB), tempC), tempD);

	            pair.separation = Vector.dot(normal, bodyBtoA);
	        }
	        
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];

	            if (!pair.isActive || pair.isSensor || pair.separation < 0)
	                continue;
	            
	            collision = pair.collision;
	            bodyA = collision.parentA;
	            bodyB = collision.parentB;
	            normal = collision.normal;
	            positionImpulse = (pair.separation - pair.slop) * timeScale;

	            if (bodyA.isStatic || bodyB.isStatic)
	                positionImpulse *= 2;
	            
	            if (!(bodyA.isStatic || bodyA.isSleeping)) {
	                contactShare = Resolver._positionDampen / bodyA.totalContacts;
	                bodyA.positionImpulse.x += normal.x * positionImpulse * contactShare;
	                bodyA.positionImpulse.y += normal.y * positionImpulse * contactShare;
	            }

	            if (!(bodyB.isStatic || bodyB.isSleeping)) {
	                contactShare = Resolver._positionDampen / bodyB.totalContacts;
	                bodyB.positionImpulse.x -= normal.x * positionImpulse * contactShare;
	                bodyB.positionImpulse.y -= normal.y * positionImpulse * contactShare;
	            }
	        }
	    };

	    /**
	     * Apply position resolution.
	     * @method postSolvePosition
	     * @param {body[]} bodies
	     */
	    Resolver.postSolvePosition = function(bodies) {
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            // reset contact count
	            body.totalContacts = 0;

	            if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
	                // update body geometry
	                for (var j = 0; j < body.parts.length; j++) {
	                    var part = body.parts[j];
	                    Vertices.translate(part.vertices, body.positionImpulse);
	                    Bounds.update(part.bounds, part.vertices, body.velocity);
	                    part.position.x += body.positionImpulse.x;
	                    part.position.y += body.positionImpulse.y;
	                }

	                // move the body without changing velocity
	                body.positionPrev.x += body.positionImpulse.x;
	                body.positionPrev.y += body.positionImpulse.y;

	                if (Vector.dot(body.positionImpulse, body.velocity) < 0) {
	                    // reset cached impulse if the body has velocity along it
	                    body.positionImpulse.x = 0;
	                    body.positionImpulse.y = 0;
	                } else {
	                    // warm the next iteration
	                    body.positionImpulse.x *= Resolver._positionWarming;
	                    body.positionImpulse.y *= Resolver._positionWarming;
	                }
	            }
	        }
	    };

	    /**
	     * Prepare pairs for velocity solving.
	     * @method preSolveVelocity
	     * @param {pair[]} pairs
	     */
	    Resolver.preSolveVelocity = function(pairs) {
	        var i,
	            j,
	            pair,
	            contacts,
	            collision,
	            bodyA,
	            bodyB,
	            normal,
	            tangent,
	            contact,
	            contactVertex,
	            normalImpulse,
	            tangentImpulse,
	            offset,
	            impulse = Vector._temp[0],
	            tempA = Vector._temp[1];
	        
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];
	            
	            if (!pair.isActive || pair.isSensor)
	                continue;
	            
	            contacts = pair.activeContacts;
	            collision = pair.collision;
	            bodyA = collision.parentA;
	            bodyB = collision.parentB;
	            normal = collision.normal;
	            tangent = collision.tangent;

	            // resolve each contact
	            for (j = 0; j < contacts.length; j++) {
	                contact = contacts[j];
	                contactVertex = contact.vertex;
	                normalImpulse = contact.normalImpulse;
	                tangentImpulse = contact.tangentImpulse;

	                if (normalImpulse !== 0 || tangentImpulse !== 0) {
	                    // total impulse from contact
	                    impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
	                    impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
	                    
	                    // apply impulse from contact
	                    if (!(bodyA.isStatic || bodyA.isSleeping)) {
	                        offset = Vector.sub(contactVertex, bodyA.position, tempA);
	                        bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
	                        bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
	                        bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
	                    }

	                    if (!(bodyB.isStatic || bodyB.isSleeping)) {
	                        offset = Vector.sub(contactVertex, bodyB.position, tempA);
	                        bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
	                        bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
	                        bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
	                    }
	                }
	            }
	        }
	    };

	    /**
	     * Find a solution for pair velocities.
	     * @method solveVelocity
	     * @param {pair[]} pairs
	     * @param {number} timeScale
	     */
	    Resolver.solveVelocity = function(pairs, timeScale) {
	        var timeScaleSquared = timeScale * timeScale,
	            impulse = Vector._temp[0],
	            tempA = Vector._temp[1],
	            tempB = Vector._temp[2],
	            tempC = Vector._temp[3],
	            tempD = Vector._temp[4],
	            tempE = Vector._temp[5];
	        
	        for (var i = 0; i < pairs.length; i++) {
	            var pair = pairs[i];
	            
	            if (!pair.isActive || pair.isSensor)
	                continue;
	            
	            var collision = pair.collision,
	                bodyA = collision.parentA,
	                bodyB = collision.parentB,
	                normal = collision.normal,
	                tangent = collision.tangent,
	                contacts = pair.activeContacts,
	                contactShare = 1 / contacts.length;

	            // update body velocities
	            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
	            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
	            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
	            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
	            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
	            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

	            // resolve each contact
	            for (var j = 0; j < contacts.length; j++) {
	                var contact = contacts[j],
	                    contactVertex = contact.vertex,
	                    offsetA = Vector.sub(contactVertex, bodyA.position, tempA),
	                    offsetB = Vector.sub(contactVertex, bodyB.position, tempB),
	                    velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity), tempC),
	                    velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity), tempD), 
	                    relativeVelocity = Vector.sub(velocityPointA, velocityPointB, tempE),
	                    normalVelocity = Vector.dot(normal, relativeVelocity);

	                var tangentVelocity = Vector.dot(tangent, relativeVelocity),
	                    tangentSpeed = Math.abs(tangentVelocity),
	                    tangentVelocityDirection = Common.sign(tangentVelocity);

	                // raw impulses
	                var normalImpulse = (1 + pair.restitution) * normalVelocity,
	                    normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1) * Resolver._frictionNormalMultiplier;

	                // coulomb friction
	                var tangentImpulse = tangentVelocity,
	                    maxFriction = Infinity;

	                if (tangentSpeed > pair.friction * pair.frictionStatic * normalForce * timeScaleSquared) {
	                    maxFriction = tangentSpeed;
	                    tangentImpulse = Common.clamp(
	                        pair.friction * tangentVelocityDirection * timeScaleSquared,
	                        -maxFriction, maxFriction
	                    );
	                }

	                // modify impulses accounting for mass, inertia and offset
	                var oAcN = Vector.cross(offsetA, normal),
	                    oBcN = Vector.cross(offsetB, normal),
	                    share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);

	                normalImpulse *= share;
	                tangentImpulse *= share;

	                // handle high velocity and resting collisions separately
	                if (normalVelocity < 0 && normalVelocity * normalVelocity > Resolver._restingThresh * timeScaleSquared) {
	                    // high normal velocity so clear cached contact normal impulse
	                    contact.normalImpulse = 0;
	                } else {
	                    // solve resting collision constraints using Erin Catto's method (GDC08)
	                    // impulse constraint tends to 0
	                    var contactNormalImpulse = contact.normalImpulse;
	                    contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
	                    normalImpulse = contact.normalImpulse - contactNormalImpulse;
	                }

	                // handle high velocity and resting collisions separately
	                if (tangentVelocity * tangentVelocity > Resolver._restingThreshTangent * timeScaleSquared) {
	                    // high tangent velocity so clear cached contact tangent impulse
	                    contact.tangentImpulse = 0;
	                } else {
	                    // solve resting collision constraints using Erin Catto's method (GDC08)
	                    // tangent impulse tends to -tangentSpeed or +tangentSpeed
	                    var contactTangentImpulse = contact.tangentImpulse;
	                    contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
	                    tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
	                }

	                // total impulse from contact
	                impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
	                impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
	                
	                // apply impulse from contact
	                if (!(bodyA.isStatic || bodyA.isSleeping)) {
	                    bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
	                    bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
	                    bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
	                }

	                if (!(bodyB.isStatic || bodyB.isSleeping)) {
	                    bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
	                    bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
	                    bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
	                }
	            }
	        }
	    };

	})();

	},{"../core/Common":14,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],11:[function(require,module,exports){
	/**
	* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
	*
	* @class SAT
	*/

	// TODO: true circles and curves

	var SAT = {};

	module.exports = SAT;

	var Vertices = require('../geometry/Vertices');
	var Vector = require('../geometry/Vector');

	(function() {

	    /**
	     * Detect collision between two bodies using the Separating Axis Theorem.
	     * @method collides
	     * @param {body} bodyA
	     * @param {body} bodyB
	     * @param {collision} previousCollision
	     * @return {collision} collision
	     */
	    SAT.collides = function(bodyA, bodyB, previousCollision) {
	        var overlapAB,
	            overlapBA, 
	            minOverlap,
	            collision,
	            prevCol = previousCollision,
	            canReusePrevCol = false;

	        if (prevCol) {
	            // estimate total motion
	            var parentA = bodyA.parent,
	                parentB = bodyB.parent,
	                motion = parentA.speed * parentA.speed + parentA.angularSpeed * parentA.angularSpeed
	                       + parentB.speed * parentB.speed + parentB.angularSpeed * parentB.angularSpeed;

	            // we may be able to (partially) reuse collision result 
	            // but only safe if collision was resting
	            canReusePrevCol = prevCol && prevCol.collided && motion < 0.2;

	            // reuse collision object
	            collision = prevCol;
	        } else {
	            collision = { collided: false, bodyA: bodyA, bodyB: bodyB };
	        }

	        if (prevCol && canReusePrevCol) {
	            // if we can reuse the collision result
	            // we only need to test the previously found axis
	            var axisBodyA = collision.axisBody,
	                axisBodyB = axisBodyA === bodyA ? bodyB : bodyA,
	                axes = [axisBodyA.axes[prevCol.axisNumber]];

	            minOverlap = _overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
	            collision.reused = true;

	            if (minOverlap.overlap <= 0) {
	                collision.collided = false;
	                return collision;
	            }
	        } else {
	            // if we can't reuse a result, perform a full SAT test

	            overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

	            if (overlapAB.overlap <= 0) {
	                collision.collided = false;
	                return collision;
	            }

	            overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

	            if (overlapBA.overlap <= 0) {
	                collision.collided = false;
	                return collision;
	            }

	            if (overlapAB.overlap < overlapBA.overlap) {
	                minOverlap = overlapAB;
	                collision.axisBody = bodyA;
	            } else {
	                minOverlap = overlapBA;
	                collision.axisBody = bodyB;
	            }

	            // important for reuse later
	            collision.axisNumber = minOverlap.axisNumber;
	        }

	        collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
	        collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
	        collision.collided = true;
	        collision.normal = minOverlap.axis;
	        collision.depth = minOverlap.overlap;
	        collision.parentA = collision.bodyA.parent;
	        collision.parentB = collision.bodyB.parent;
	        
	        bodyA = collision.bodyA;
	        bodyB = collision.bodyB;

	        // ensure normal is facing away from bodyA
	        if (Vector.dot(collision.normal, Vector.sub(bodyB.position, bodyA.position)) > 0) 
	            collision.normal = Vector.neg(collision.normal);

	        collision.tangent = Vector.perp(collision.normal);

	        collision.penetration = { 
	            x: collision.normal.x * collision.depth, 
	            y: collision.normal.y * collision.depth 
	        };

	        // find support points, there is always either exactly one or two
	        var verticesB = _findSupports(bodyA, bodyB, collision.normal),
	            supports = collision.supports || [];
	        supports.length = 0;

	        // find the supports from bodyB that are inside bodyA
	        if (Vertices.contains(bodyA.vertices, verticesB[0]))
	            supports.push(verticesB[0]);

	        if (Vertices.contains(bodyA.vertices, verticesB[1]))
	            supports.push(verticesB[1]);

	        // find the supports from bodyA that are inside bodyB
	        if (supports.length < 2) {
	            var verticesA = _findSupports(bodyB, bodyA, Vector.neg(collision.normal));
	                
	            if (Vertices.contains(bodyB.vertices, verticesA[0]))
	                supports.push(verticesA[0]);

	            if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
	                supports.push(verticesA[1]);
	        }

	        // account for the edge case of overlapping but no vertex containment
	        if (supports.length < 1)
	            supports = [verticesB[0]];
	        
	        collision.supports = supports;

	        return collision;
	    };

	    /**
	     * Find the overlap between two sets of vertices.
	     * @method _overlapAxes
	     * @private
	     * @param {} verticesA
	     * @param {} verticesB
	     * @param {} axes
	     * @return result
	     */
	    var _overlapAxes = function(verticesA, verticesB, axes) {
	        var projectionA = Vector._temp[0], 
	            projectionB = Vector._temp[1],
	            result = { overlap: Number.MAX_VALUE },
	            overlap,
	            axis;

	        for (var i = 0; i < axes.length; i++) {
	            axis = axes[i];

	            _projectToAxis(projectionA, verticesA, axis);
	            _projectToAxis(projectionB, verticesB, axis);

	            overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

	            if (overlap <= 0) {
	                result.overlap = overlap;
	                return result;
	            }

	            if (overlap < result.overlap) {
	                result.overlap = overlap;
	                result.axis = axis;
	                result.axisNumber = i;
	            }
	        }

	        return result;
	    };

	    /**
	     * Projects vertices on an axis and returns an interval.
	     * @method _projectToAxis
	     * @private
	     * @param {} projection
	     * @param {} vertices
	     * @param {} axis
	     */
	    var _projectToAxis = function(projection, vertices, axis) {
	        var min = Vector.dot(vertices[0], axis),
	            max = min;

	        for (var i = 1; i < vertices.length; i += 1) {
	            var dot = Vector.dot(vertices[i], axis);

	            if (dot > max) { 
	                max = dot; 
	            } else if (dot < min) { 
	                min = dot; 
	            }
	        }

	        projection.min = min;
	        projection.max = max;
	    };
	    
	    /**
	     * Finds supporting vertices given two bodies along a given direction using hill-climbing.
	     * @method _findSupports
	     * @private
	     * @param {} bodyA
	     * @param {} bodyB
	     * @param {} normal
	     * @return [vector]
	     */
	    var _findSupports = function(bodyA, bodyB, normal) {
	        var nearestDistance = Number.MAX_VALUE,
	            vertexToBody = Vector._temp[0],
	            vertices = bodyB.vertices,
	            bodyAPosition = bodyA.position,
	            distance,
	            vertex,
	            vertexA,
	            vertexB;

	        // find closest vertex on bodyB
	        for (var i = 0; i < vertices.length; i++) {
	            vertex = vertices[i];
	            vertexToBody.x = vertex.x - bodyAPosition.x;
	            vertexToBody.y = vertex.y - bodyAPosition.y;
	            distance = -Vector.dot(normal, vertexToBody);

	            if (distance < nearestDistance) {
	                nearestDistance = distance;
	                vertexA = vertex;
	            }
	        }

	        // find next closest vertex using the two connected to it
	        var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
	        vertex = vertices[prevIndex];
	        vertexToBody.x = vertex.x - bodyAPosition.x;
	        vertexToBody.y = vertex.y - bodyAPosition.y;
	        nearestDistance = -Vector.dot(normal, vertexToBody);
	        vertexB = vertex;

	        var nextIndex = (vertexA.index + 1) % vertices.length;
	        vertex = vertices[nextIndex];
	        vertexToBody.x = vertex.x - bodyAPosition.x;
	        vertexToBody.y = vertex.y - bodyAPosition.y;
	        distance = -Vector.dot(normal, vertexToBody);
	        if (distance < nearestDistance) {
	            vertexB = vertex;
	        }

	        return [vertexA, vertexB];
	    };

	})();

	},{"../geometry/Vector":26,"../geometry/Vertices":27}],12:[function(require,module,exports){
	/**
	* The `Matter.Constraint` module contains methods for creating and manipulating constraints.
	* Constraints are used for specifying that a fixed distance must be maintained between two bodies (or a body and a fixed world-space position).
	* The stiffness of constraints can be modified to create springs or elastic.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Constraint
	*/

	// TODO: fix instability issues with torque
	// TODO: linked constraints
	// TODO: breakable constraints
	// TODO: collision constraints
	// TODO: allow constrained bodies to sleep
	// TODO: handle 0 length constraints properly
	// TODO: impulse caching and warming

	var Constraint = {};

	module.exports = Constraint;

	var Vertices = require('../geometry/Vertices');
	var Vector = require('../geometry/Vector');
	var Sleeping = require('../core/Sleeping');
	var Bounds = require('../geometry/Bounds');
	var Axes = require('../geometry/Axes');
	var Common = require('../core/Common');

	(function() {

	    var _minLength = 0.000001,
	        _minDifference = 0.001;

	    /**
	     * Creates a new constraint.
	     * All properties have default values, and many are pre-calculated automatically based on other properties.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {} options
	     * @return {constraint} constraint
	     */
	    Constraint.create = function(options) {
	        var constraint = options;

	        // if bodies defined but no points, use body centre
	        if (constraint.bodyA && !constraint.pointA)
	            constraint.pointA = { x: 0, y: 0 };
	        if (constraint.bodyB && !constraint.pointB)
	            constraint.pointB = { x: 0, y: 0 };

	        // calculate static length using initial world space points
	        var initialPointA = constraint.bodyA ? Vector.add(constraint.bodyA.position, constraint.pointA) : constraint.pointA,
	            initialPointB = constraint.bodyB ? Vector.add(constraint.bodyB.position, constraint.pointB) : constraint.pointB,
	            length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
	    
	        constraint.length = constraint.length || length || _minLength;

	        // render
	        var render = {
	            visible: true,
	            lineWidth: 2,
	            strokeStyle: '#666'
	        };
	        
	        constraint.render = Common.extend(render, constraint.render);

	        // option defaults
	        constraint.id = constraint.id || Common.nextId();
	        constraint.label = constraint.label || 'Constraint';
	        constraint.type = 'constraint';
	        constraint.stiffness = constraint.stiffness || 1;
	        constraint.angularStiffness = constraint.angularStiffness || 0;
	        constraint.angleA = constraint.bodyA ? constraint.bodyA.angle : constraint.angleA;
	        constraint.angleB = constraint.bodyB ? constraint.bodyB.angle : constraint.angleB;

	        return constraint;
	    };

	    /**
	     * Solves all constraints in a list of collisions.
	     * @private
	     * @method solveAll
	     * @param {constraint[]} constraints
	     * @param {number} timeScale
	     */
	    Constraint.solveAll = function(constraints, timeScale) {
	        for (var i = 0; i < constraints.length; i++) {
	            Constraint.solve(constraints[i], timeScale);
	        }
	    };

	    /**
	     * Solves a distance constraint with Gauss-Siedel method.
	     * @private
	     * @method solve
	     * @param {constraint} constraint
	     * @param {number} timeScale
	     */
	    Constraint.solve = function(constraint, timeScale) {
	        var bodyA = constraint.bodyA,
	            bodyB = constraint.bodyB,
	            pointA = constraint.pointA,
	            pointB = constraint.pointB;

	        // update reference angle
	        if (bodyA && !bodyA.isStatic) {
	            constraint.pointA = Vector.rotate(pointA, bodyA.angle - constraint.angleA);
	            constraint.angleA = bodyA.angle;
	        }
	        
	        // update reference angle
	        if (bodyB && !bodyB.isStatic) {
	            constraint.pointB = Vector.rotate(pointB, bodyB.angle - constraint.angleB);
	            constraint.angleB = bodyB.angle;
	        }

	        var pointAWorld = pointA,
	            pointBWorld = pointB;

	        if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
	        if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);

	        if (!pointAWorld || !pointBWorld)
	            return;

	        var delta = Vector.sub(pointAWorld, pointBWorld),
	            currentLength = Vector.magnitude(delta);

	        // prevent singularity
	        if (currentLength === 0)
	            currentLength = _minLength;

	        // solve distance constraint with Gauss-Siedel method
	        var difference = (currentLength - constraint.length) / currentLength,
	            normal = Vector.div(delta, currentLength),
	            force = Vector.mult(delta, difference * 0.5 * constraint.stiffness * timeScale * timeScale);
	        
	        // if difference is very small, we can skip
	        if (Math.abs(1 - (currentLength / constraint.length)) < _minDifference * timeScale)
	            return;

	        var velocityPointA,
	            velocityPointB,
	            offsetA,
	            offsetB,
	            oAn,
	            oBn,
	            bodyADenom,
	            bodyBDenom;
	    
	        if (bodyA && !bodyA.isStatic) {
	            // point body offset
	            offsetA = { 
	                x: pointAWorld.x - bodyA.position.x + force.x, 
	                y: pointAWorld.y - bodyA.position.y + force.y
	            };
	            
	            // update velocity
	            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
	            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
	            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
	            
	            // find point velocity and body mass
	            velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity));
	            oAn = Vector.dot(offsetA, normal);
	            bodyADenom = bodyA.inverseMass + bodyA.inverseInertia * oAn * oAn;
	        } else {
	            velocityPointA = { x: 0, y: 0 };
	            bodyADenom = bodyA ? bodyA.inverseMass : 0;
	        }
	            
	        if (bodyB && !bodyB.isStatic) {
	            // point body offset
	            offsetB = { 
	                x: pointBWorld.x - bodyB.position.x - force.x, 
	                y: pointBWorld.y - bodyB.position.y - force.y 
	            };
	            
	            // update velocity
	            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
	            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
	            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

	            // find point velocity and body mass
	            velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity));
	            oBn = Vector.dot(offsetB, normal);
	            bodyBDenom = bodyB.inverseMass + bodyB.inverseInertia * oBn * oBn;
	        } else {
	            velocityPointB = { x: 0, y: 0 };
	            bodyBDenom = bodyB ? bodyB.inverseMass : 0;
	        }
	        
	        var relativeVelocity = Vector.sub(velocityPointB, velocityPointA),
	            normalImpulse = Vector.dot(normal, relativeVelocity) / (bodyADenom + bodyBDenom);
	    
	        if (normalImpulse > 0) normalImpulse = 0;
	    
	        var normalVelocity = {
	            x: normal.x * normalImpulse, 
	            y: normal.y * normalImpulse
	        };

	        var torque;
	 
	        if (bodyA && !bodyA.isStatic) {
	            torque = Vector.cross(offsetA, normalVelocity) * bodyA.inverseInertia * (1 - constraint.angularStiffness);

	            // keep track of applied impulses for post solving
	            bodyA.constraintImpulse.x -= force.x;
	            bodyA.constraintImpulse.y -= force.y;
	            bodyA.constraintImpulse.angle += torque;

	            // apply forces
	            bodyA.position.x -= force.x;
	            bodyA.position.y -= force.y;
	            bodyA.angle += torque;
	        }

	        if (bodyB && !bodyB.isStatic) {
	            torque = Vector.cross(offsetB, normalVelocity) * bodyB.inverseInertia * (1 - constraint.angularStiffness);

	            // keep track of applied impulses for post solving
	            bodyB.constraintImpulse.x += force.x;
	            bodyB.constraintImpulse.y += force.y;
	            bodyB.constraintImpulse.angle -= torque;
	            
	            // apply forces
	            bodyB.position.x += force.x;
	            bodyB.position.y += force.y;
	            bodyB.angle -= torque;
	        }

	    };

	    /**
	     * Performs body updates required after solving constraints.
	     * @private
	     * @method postSolveAll
	     * @param {body[]} bodies
	     */
	    Constraint.postSolveAll = function(bodies) {
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                impulse = body.constraintImpulse;

	            if (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0) {
	                continue;
	            }

	            Sleeping.set(body, false);

	            // update geometry and reset
	            for (var j = 0; j < body.parts.length; j++) {
	                var part = body.parts[j];
	                
	                Vertices.translate(part.vertices, impulse);

	                if (j > 0) {
	                    part.position.x += impulse.x;
	                    part.position.y += impulse.y;
	                }

	                if (impulse.angle !== 0) {
	                    Vertices.rotate(part.vertices, impulse.angle, body.position);
	                    Axes.rotate(part.axes, impulse.angle);
	                    if (j > 0) {
	                        Vector.rotateAbout(part.position, impulse.angle, body.position, part.position);
	                    }
	                }

	                Bounds.update(part.bounds, part.vertices, body.velocity);
	            }

	            impulse.angle = 0;
	            impulse.x = 0;
	            impulse.y = 0;
	        }
	    };

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
	     *
	     * @property id
	     * @type number
	     */

	    /**
	     * A `String` denoting the type of object.
	     *
	     * @property type
	     * @type string
	     * @default "constraint"
	     * @readOnly
	     */

	    /**
	     * An arbitrary `String` name to help the user identify and manage bodies.
	     *
	     * @property label
	     * @type string
	     * @default "Constraint"
	     */

	    /**
	     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
	     *
	     * @property render
	     * @type object
	     */

	    /**
	     * A flag that indicates if the constraint should be rendered.
	     *
	     * @property render.visible
	     * @type boolean
	     * @default true
	     */

	    /**
	     * A `Number` that defines the line width to use when rendering the constraint outline.
	     * A value of `0` means no outline will be rendered.
	     *
	     * @property render.lineWidth
	     * @type number
	     * @default 2
	     */

	    /**
	     * A `String` that defines the stroke style to use when rendering the constraint outline.
	     * It is the same as when using a canvas, so it accepts CSS style property values.
	     *
	     * @property render.strokeStyle
	     * @type string
	     * @default a random colour
	     */

	    /**
	     * The first possible `Body` that this constraint is attached to.
	     *
	     * @property bodyA
	     * @type body
	     * @default null
	     */

	    /**
	     * The second possible `Body` that this constraint is attached to.
	     *
	     * @property bodyB
	     * @type body
	     * @default null
	     */

	    /**
	     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
	     *
	     * @property pointA
	     * @type vector
	     * @default { x: 0, y: 0 }
	     */

	    /**
	     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
	     *
	     * @property pointB
	     * @type vector
	     * @default { x: 0, y: 0 }
	     */

	    /**
	     * A `Number` that specifies the stiffness of the constraint, i.e. the rate at which it returns to its resting `constraint.length`.
	     * A value of `1` means the constraint should be very stiff.
	     * A value of `0.2` means the constraint acts like a soft spring.
	     *
	     * @property stiffness
	     * @type number
	     * @default 1
	     */

	    /**
	     * A `Number` that specifies the target resting length of the constraint. 
	     * It is calculated automatically in `Constraint.create` from initial positions of the `constraint.bodyA` and `constraint.bodyB`.
	     *
	     * @property length
	     * @type number
	     */

	})();

	},{"../core/Common":14,"../core/Sleeping":20,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],13:[function(require,module,exports){
	/**
	* The `Matter.MouseConstraint` module contains methods for creating mouse constraints.
	* Mouse constraints are used for allowing user interaction, providing the ability to move bodies via the mouse or touch.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class MouseConstraint
	*/

	var MouseConstraint = {};

	module.exports = MouseConstraint;

	var Vertices = require('../geometry/Vertices');
	var Sleeping = require('../core/Sleeping');
	var Mouse = require('../core/Mouse');
	var Events = require('../core/Events');
	var Detector = require('../collision/Detector');
	var Constraint = require('./Constraint');
	var Composite = require('../body/Composite');
	var Common = require('../core/Common');
	var Bounds = require('../geometry/Bounds');

	(function() {

	    /**
	     * Creates a new mouse constraint.
	     * All properties have default values, and many are pre-calculated automatically based on other properties.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {engine} engine
	     * @param {} options
	     * @return {MouseConstraint} A new MouseConstraint
	     */
	    MouseConstraint.create = function(engine, options) {
	        var mouse = (engine ? engine.mouse : null) || (options ? options.mouse : null);

	        if (!mouse) {
	            if (engine && engine.render && engine.render.canvas) {
	                mouse = Mouse.create(engine.render.canvas);
	            } else if (options && options.element) {
	                mouse = Mouse.create(options.element);
	            } else {
	                mouse = Mouse.create();
	                Common.log('MouseConstraint.create: options.mouse was undefined, options.element was undefined, may not function as expected', 'warn');
	            }
	        }

	        var constraint = Constraint.create({ 
	            label: 'Mouse Constraint',
	            pointA: mouse.position,
	            pointB: { x: 0, y: 0 },
	            length: 0.01, 
	            stiffness: 0.1,
	            angularStiffness: 1,
	            render: {
	                strokeStyle: '#90EE90',
	                lineWidth: 3
	            }
	        });

	        var defaults = {
	            type: 'mouseConstraint',
	            mouse: mouse,
	            element: null,
	            body: null,
	            constraint: constraint,
	            collisionFilter: {
	                category: 0x0001,
	                mask: 0xFFFFFFFF,
	                group: 0
	            }
	        };

	        var mouseConstraint = Common.extend(defaults, options);

	        Events.on(engine, 'tick', function() {
	            var allBodies = Composite.allBodies(engine.world);
	            MouseConstraint.update(mouseConstraint, allBodies);
	            _triggerEvents(mouseConstraint);
	        });

	        return mouseConstraint;
	    };

	    /**
	     * Updates the given mouse constraint.
	     * @private
	     * @method update
	     * @param {MouseConstraint} mouseConstraint
	     * @param {body[]} bodies
	     */
	    MouseConstraint.update = function(mouseConstraint, bodies) {
	        var mouse = mouseConstraint.mouse,
	            constraint = mouseConstraint.constraint,
	            body = mouseConstraint.body;

	        if (mouse.button === 0) {
	            if (!constraint.bodyB) {
	                for (var i = 0; i < bodies.length; i++) {
	                    body = bodies[i];
	                    if (Bounds.contains(body.bounds, mouse.position) 
	                            && Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter)) {
	                        for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
	                            var part = body.parts[j];
	                            if (Vertices.contains(part.vertices, mouse.position)) {
	                                constraint.pointA = mouse.position;
	                                constraint.bodyB = mouseConstraint.body = body;
	                                constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
	                                constraint.angleB = body.angle;

	                                Sleeping.set(body, false);
	                                Events.trigger(mouseConstraint, 'startdrag', { mouse: mouse, body: body });

	                                break;
	                            }
	                        }
	                    }
	                }
	            } else {
	                Sleeping.set(constraint.bodyB, false);
	                constraint.pointA = mouse.position;
	            }
	        } else {
	            constraint.bodyB = mouseConstraint.body = null;
	            constraint.pointB = null;

	            if (body)
	                Events.trigger(mouseConstraint, 'enddrag', { mouse: mouse, body: body });
	        }
	    };

	    /**
	     * Triggers mouse constraint events.
	     * @method _triggerEvents
	     * @private
	     * @param {mouse} mouseConstraint
	     */
	    var _triggerEvents = function(mouseConstraint) {
	        var mouse = mouseConstraint.mouse,
	            mouseEvents = mouse.sourceEvents;

	        if (mouseEvents.mousemove)
	            Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });

	        if (mouseEvents.mousedown)
	            Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });

	        if (mouseEvents.mouseup)
	            Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });

	        // reset the mouse state ready for the next step
	        Mouse.clearSourceEvents(mouse);
	    };

	    /*
	    *
	    *  Events Documentation
	    *
	    */

	    /**
	    * Fired when the mouse has moved (or a touch moves) during the last step
	    *
	    * @event mousemove
	    * @param {} event An event object
	    * @param {mouse} event.mouse The engine's mouse instance
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when the mouse is down (or a touch has started) during the last step
	    *
	    * @event mousedown
	    * @param {} event An event object
	    * @param {mouse} event.mouse The engine's mouse instance
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when the mouse is up (or a touch has ended) during the last step
	    *
	    * @event mouseup
	    * @param {} event An event object
	    * @param {mouse} event.mouse The engine's mouse instance
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when the user starts dragging a body
	    *
	    * @event startdrag
	    * @param {} event An event object
	    * @param {mouse} event.mouse The engine's mouse instance
	    * @param {body} event.body The body being dragged
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired when the user ends dragging a body
	    *
	    * @event enddrag
	    * @param {} event An event object
	    * @param {mouse} event.mouse The engine's mouse instance
	    * @param {body} event.body The body that has stopped being dragged
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * A `String` denoting the type of object.
	     *
	     * @property type
	     * @type string
	     * @default "constraint"
	     * @readOnly
	     */

	    /**
	     * The `Mouse` instance in use. If not supplied in `MouseConstraint.create`, one will be created.
	     *
	     * @property mouse
	     * @type mouse
	     * @default mouse
	     */

	    /**
	     * The `Body` that is currently being moved by the user, or `null` if no body.
	     *
	     * @property body
	     * @type body
	     * @default null
	     */

	    /**
	     * The `Constraint` object that is used to move the body during interaction.
	     *
	     * @property constraint
	     * @type constraint
	     */

	    /**
	     * An `Object` that specifies the collision filter properties.
	     * The collision filter allows the user to define which types of body this mouse constraint can interact with.
	     * See `body.collisionFilter` for more information.
	     *
	     * @property collisionFilter
	     * @type object
	     */

	})();

	},{"../body/Composite":2,"../collision/Detector":5,"../core/Common":14,"../core/Events":16,"../core/Mouse":18,"../core/Sleeping":20,"../geometry/Bounds":24,"../geometry/Vertices":27,"./Constraint":12}],14:[function(require,module,exports){
	/**
	* The `Matter.Common` module contains utility functions that are common to all modules.
	*
	* @class Common
	*/

	var Common = {};

	module.exports = Common;

	(function() {

	    Common._nextId = 0;
	    Common._seed = 0;

	    /**
	     * Extends the object in the first argument using the object in the second argument.
	     * @method extend
	     * @param {} obj
	     * @param {boolean} deep
	     * @return {} obj extended
	     */
	    Common.extend = function(obj, deep) {
	        var argsStart,
	            args,
	            deepClone;

	        if (typeof deep === 'boolean') {
	            argsStart = 2;
	            deepClone = deep;
	        } else {
	            argsStart = 1;
	            deepClone = true;
	        }

	        args = Array.prototype.slice.call(arguments, argsStart);

	        for (var i = 0; i < args.length; i++) {
	            var source = args[i];

	            if (source) {
	                for (var prop in source) {
	                    if (deepClone && source[prop] && source[prop].constructor === Object) {
	                        if (!obj[prop] || obj[prop].constructor === Object) {
	                            obj[prop] = obj[prop] || {};
	                            Common.extend(obj[prop], deepClone, source[prop]);
	                        } else {
	                            obj[prop] = source[prop];
	                        }
	                    } else {
	                        obj[prop] = source[prop];
	                    }
	                }
	            }
	        }
	        
	        return obj;
	    };

	    /**
	     * Creates a new clone of the object, if deep is true references will also be cloned.
	     * @method clone
	     * @param {} obj
	     * @param {bool} deep
	     * @return {} obj cloned
	     */
	    Common.clone = function(obj, deep) {
	        return Common.extend({}, deep, obj);
	    };

	    /**
	     * Returns the list of keys for the given object.
	     * @method keys
	     * @param {} obj
	     * @return {string[]} keys
	     */
	    Common.keys = function(obj) {
	        if (Object.keys)
	            return Object.keys(obj);

	        // avoid hasOwnProperty for performance
	        var keys = [];
	        for (var key in obj)
	            keys.push(key);
	        return keys;
	    };

	    /**
	     * Returns the list of values for the given object.
	     * @method values
	     * @param {} obj
	     * @return {array} Array of the objects property values
	     */
	    Common.values = function(obj) {
	        var values = [];
	        
	        if (Object.keys) {
	            var keys = Object.keys(obj);
	            for (var i = 0; i < keys.length; i++) {
	                values.push(obj[keys[i]]);
	            }
	            return values;
	        }
	        
	        // avoid hasOwnProperty for performance
	        for (var key in obj)
	            values.push(obj[key]);
	        return values;
	    };

	    /**
	     * Returns a hex colour string made by lightening or darkening color by percent.
	     * @method shadeColor
	     * @param {string} color
	     * @param {number} percent
	     * @return {string} A hex colour
	     */
	    Common.shadeColor = function(color, percent) {   
	        // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
	        var colorInteger = parseInt(color.slice(1),16), 
	            amount = Math.round(2.55 * percent), 
	            R = (colorInteger >> 16) + amount, 
	            B = (colorInteger >> 8 & 0x00FF) + amount, 
	            G = (colorInteger & 0x0000FF) + amount;
	        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R :255) * 0x10000 
	                + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 
	                + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
	    };

	    /**
	     * Shuffles the given array in-place.
	     * The function uses a seeded random generator.
	     * @method shuffle
	     * @param {array} array
	     * @return {array} array shuffled randomly
	     */
	    Common.shuffle = function(array) {
	        for (var i = array.length - 1; i > 0; i--) {
	            var j = Math.floor(Common.random() * (i + 1));
	            var temp = array[i];
	            array[i] = array[j];
	            array[j] = temp;
	        }
	        return array;
	    };

	    /**
	     * Randomly chooses a value from a list with equal probability.
	     * The function uses a seeded random generator.
	     * @method choose
	     * @param {array} choices
	     * @return {object} A random choice object from the array
	     */
	    Common.choose = function(choices) {
	        return choices[Math.floor(Common.random() * choices.length)];
	    };

	    /**
	     * Returns true if the object is a HTMLElement, otherwise false.
	     * @method isElement
	     * @param {object} obj
	     * @return {boolean} True if the object is a HTMLElement, otherwise false
	     */
	    Common.isElement = function(obj) {
	        // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
	        try {
	            return obj instanceof HTMLElement;
	        }
	        catch(e){
	            return (typeof obj==="object") &&
	              (obj.nodeType===1) && (typeof obj.style === "object") &&
	              (typeof obj.ownerDocument ==="object");
	        }
	    };

	    /**
	     * Returns true if the object is an array.
	     * @method isArray
	     * @param {object} obj
	     * @return {boolean} True if the object is an array, otherwise false
	     */
	    Common.isArray = function(obj) {
	        return Object.prototype.toString.call(obj) === '[object Array]';
	    };
	    
	    /**
	     * Returns the given value clamped between a minimum and maximum value.
	     * @method clamp
	     * @param {number} value
	     * @param {number} min
	     * @param {number} max
	     * @return {number} The value clamped between min and max inclusive
	     */
	    Common.clamp = function(value, min, max) {
	        if (value < min)
	            return min;
	        if (value > max)
	            return max;
	        return value;
	    };
	    
	    /**
	     * Returns the sign of the given value.
	     * @method sign
	     * @param {number} value
	     * @return {number} -1 if negative, +1 if 0 or positive
	     */
	    Common.sign = function(value) {
	        return value < 0 ? -1 : 1;
	    };
	    
	    /**
	     * Returns the current timestamp (high-res if available).
	     * @method now
	     * @return {number} the current timestamp (high-res if available)
	     */
	    Common.now = function() {
	        // http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
	        // https://gist.github.com/davidwaterston/2982531

	        var performance = window.performance || {};

	        performance.now = (function() {
	            return performance.now    ||
	            performance.webkitNow     ||
	            performance.msNow         ||
	            performance.oNow          ||
	            performance.mozNow        ||
	            function() { return +(new Date()); };
	        })();
	              
	        return performance.now();
	    };

	    
	    /**
	     * Returns a random value between a minimum and a maximum value inclusive.
	     * The function uses a seeded random generator.
	     * @method random
	     * @param {number} min
	     * @param {number} max
	     * @return {number} A random number between min and max inclusive
	     */
	    Common.random = function(min, max) {
	        min = (typeof min !== "undefined") ? min : 0;
	        max = (typeof max !== "undefined") ? max : 1;
	        return min + _seededRandom() * (max - min);
	    };

	    /**
	     * Converts a CSS hex colour string into an integer.
	     * @method colorToNumber
	     * @param {string} colorString
	     * @return {number} An integer representing the CSS hex string
	     */
	    Common.colorToNumber = function(colorString) {
	        colorString = colorString.replace('#','');

	        if (colorString.length == 3) {
	            colorString = colorString.charAt(0) + colorString.charAt(0)
	                        + colorString.charAt(1) + colorString.charAt(1)
	                        + colorString.charAt(2) + colorString.charAt(2);
	        }

	        return parseInt(colorString, 16);
	    };

	    /**
	     * A wrapper for console.log, for providing errors and warnings.
	     * @method log
	     * @param {string} message
	     * @param {string} type
	     */
	    Common.log = function(message, type) {
	        if (!console || !console.log || !console.warn)
	            return;

	        switch (type) {

	        case 'warn':
	            console.warn('Matter.js:', message);
	            break;
	        case 'error':
	            console.log('Matter.js:', message);
	            break;

	        }
	    };

	    /**
	     * Returns the next unique sequential ID.
	     * @method nextId
	     * @return {Number} Unique sequential ID
	     */
	    Common.nextId = function() {
	        return Common._nextId++;
	    };

	    /**
	     * A cross browser compatible indexOf implementation.
	     * @method indexOf
	     * @param {array} haystack
	     * @param {object} needle
	     */
	    Common.indexOf = function(haystack, needle) {
	        if (haystack.indexOf)
	            return haystack.indexOf(needle);

	        for (var i = 0; i < haystack.length; i++) {
	            if (haystack[i] === needle)
	                return i;
	        }

	        return -1;
	    };

	    var _seededRandom = function() {
	        // https://gist.github.com/ngryman/3830489
	        Common._seed = (Common._seed * 9301 + 49297) % 233280;
	        return Common._seed / 233280;
	    };

	})();

	},{}],15:[function(require,module,exports){
	/**
	* The `Matter.Engine` module contains methods for creating and manipulating engines.
	* An engine is a controller that manages updating the simulation of the world.
	* See `Matter.Runner` for an optional game loop utility.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Engine
	*/

	var Engine = {};

	module.exports = Engine;

	var World = require('../body/World');
	var Sleeping = require('./Sleeping');
	var Resolver = require('../collision/Resolver');
	var Render = require('../render/Render');
	var Pairs = require('../collision/Pairs');
	var Metrics = require('./Metrics');
	var Grid = require('../collision/Grid');
	var Events = require('./Events');
	var Composite = require('../body/Composite');
	var Constraint = require('../constraint/Constraint');
	var Common = require('./Common');
	var Body = require('../body/Body');

	(function() {

	    /**
	     * Creates a new engine. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * All properties have default values, and many are pre-calculated automatically based on other properties.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {object} [options]
	     * @return {engine} engine
	     */
	    Engine.create = function(element, options) {
	        // options may be passed as the first (and only) argument
	        options = Common.isElement(element) ? options : element;
	        element = Common.isElement(element) ? element : null;
	        options = options || {};

	        if (element || options.render) {
	            Common.log('Engine.create: engine.render is deprecated (see docs)', 'warn');
	        }

	        var defaults = {
	            positionIterations: 6,
	            velocityIterations: 4,
	            constraintIterations: 2,
	            enableSleeping: false,
	            events: [],
	            timing: {
	                timestamp: 0,
	                timeScale: 1
	            },
	            broadphase: {
	                controller: Grid
	            }
	        };

	        var engine = Common.extend(defaults, options);

	        // @deprecated
	        if (element || engine.render) {
	            var renderDefaults = {
	                element: element,
	                controller: Render
	            };
	            
	            engine.render = Common.extend(renderDefaults, engine.render);
	        }

	        // @deprecated
	        if (engine.render && engine.render.controller) {
	            engine.render = engine.render.controller.create(engine.render);
	        }

	        // @deprecated
	        if (engine.render) {
	            engine.render.engine = engine;
	        }

	        engine.world = options.world || World.create(engine.world);
	        engine.pairs = Pairs.create();
	        engine.broadphase = engine.broadphase.controller.create(engine.broadphase);
	        engine.metrics = engine.metrics || { extended: false };


	        return engine;
	    };

	    /**
	     * Moves the simulation forward in time by `delta` ms.
	     * The `correction` argument is an optional `Number` that specifies the time correction factor to apply to the update.
	     * This can help improve the accuracy of the simulation in cases where `delta` is changing between updates.
	     * The value of `correction` is defined as `delta / lastDelta`, i.e. the percentage change of `delta` over the last step.
	     * Therefore the value is always `1` (no correction) when `delta` constant (or when no correction is desired, which is the default).
	     * See the paper on <a href="http://lonesock.net/article/verlet.html">Time Corrected Verlet</a> for more information.
	     *
	     * Triggers `beforeUpdate` and `afterUpdate` events.
	     * Triggers `collisionStart`, `collisionActive` and `collisionEnd` events.
	     * @method update
	     * @param {engine} engine
	     * @param {number} [delta=16.666]
	     * @param {number} [correction=1]
	     */
	    Engine.update = function(engine, delta, correction) {
	        delta = delta || 1000 / 60;
	        correction = correction || 1;

	        var world = engine.world,
	            timing = engine.timing,
	            broadphase = engine.broadphase,
	            broadphasePairs = [],
	            i;

	        // increment timestamp
	        timing.timestamp += delta * timing.timeScale;

	        // create an event object
	        var event = {
	            timestamp: timing.timestamp
	        };

	        Events.trigger(engine, 'beforeUpdate', event);

	        // get lists of all bodies and constraints, no matter what composites they are in
	        var allBodies = Composite.allBodies(world),
	            allConstraints = Composite.allConstraints(world);


	        // if sleeping enabled, call the sleeping controller
	        if (engine.enableSleeping)
	            Sleeping.update(allBodies, timing.timeScale);

	        // applies gravity to all bodies
	        _bodiesApplyGravity(allBodies, world.gravity);

	        // update all body position and rotation by integration
	        _bodiesUpdate(allBodies, delta, timing.timeScale, correction, world.bounds);

	        // update all constraints
	        for (i = 0; i < engine.constraintIterations; i++) {
	            Constraint.solveAll(allConstraints, timing.timeScale);
	        }
	        Constraint.postSolveAll(allBodies);

	        // broadphase pass: find potential collision pairs
	        if (broadphase.controller) {

	            // if world is dirty, we must flush the whole grid
	            if (world.isModified)
	                broadphase.controller.clear(broadphase);

	            // update the grid buckets based on current bodies
	            broadphase.controller.update(broadphase, allBodies, engine, world.isModified);
	            broadphasePairs = broadphase.pairsList;
	        } else {

	            // if no broadphase set, we just pass all bodies
	            broadphasePairs = allBodies;
	        }

	        // clear all composite modified flags
	        if (world.isModified) {
	            Composite.setModified(world, false, false, true);
	        }

	        // narrowphase pass: find actual collisions, then create or update collision pairs
	        var collisions = broadphase.detector(broadphasePairs, engine);

	        // update collision pairs
	        var pairs = engine.pairs,
	            timestamp = timing.timestamp;
	        Pairs.update(pairs, collisions, timestamp);
	        Pairs.removeOld(pairs, timestamp);

	        // wake up bodies involved in collisions
	        if (engine.enableSleeping)
	            Sleeping.afterCollisions(pairs.list, timing.timeScale);

	        // trigger collision events
	        if (pairs.collisionStart.length > 0)
	            Events.trigger(engine, 'collisionStart', { pairs: pairs.collisionStart });

	        // iteratively resolve position between collisions
	        Resolver.preSolvePosition(pairs.list);
	        for (i = 0; i < engine.positionIterations; i++) {
	            Resolver.solvePosition(pairs.list, timing.timeScale);
	        }
	        Resolver.postSolvePosition(allBodies);

	        // iteratively resolve velocity between collisions
	        Resolver.preSolveVelocity(pairs.list);
	        for (i = 0; i < engine.velocityIterations; i++) {
	            Resolver.solveVelocity(pairs.list, timing.timeScale);
	        }

	        // trigger collision events
	        if (pairs.collisionActive.length > 0)
	            Events.trigger(engine, 'collisionActive', { pairs: pairs.collisionActive });

	        if (pairs.collisionEnd.length > 0)
	            Events.trigger(engine, 'collisionEnd', { pairs: pairs.collisionEnd });


	        // clear force buffers
	        _bodiesClearForces(allBodies);

	        Events.trigger(engine, 'afterUpdate', event);

	        return engine;
	    };
	    
	    /**
	     * Merges two engines by keeping the configuration of `engineA` but replacing the world with the one from `engineB`.
	     * @method merge
	     * @param {engine} engineA
	     * @param {engine} engineB
	     */
	    Engine.merge = function(engineA, engineB) {
	        Common.extend(engineA, engineB);
	        
	        if (engineB.world) {
	            engineA.world = engineB.world;

	            Engine.clear(engineA);

	            var bodies = Composite.allBodies(engineA.world);

	            for (var i = 0; i < bodies.length; i++) {
	                var body = bodies[i];
	                Sleeping.set(body, false);
	                body.id = Common.nextId();
	            }
	        }
	    };

	    /**
	     * Clears the engine including the world, pairs and broadphase.
	     * @method clear
	     * @param {engine} engine
	     */
	    Engine.clear = function(engine) {
	        var world = engine.world;
	        
	        Pairs.clear(engine.pairs);

	        var broadphase = engine.broadphase;
	        if (broadphase.controller) {
	            var bodies = Composite.allBodies(world);
	            broadphase.controller.clear(broadphase);
	            broadphase.controller.update(broadphase, bodies, engine, true);
	        }
	    };

	    /**
	     * Zeroes the `body.force` and `body.torque` force buffers.
	     * @method bodiesClearForces
	     * @private
	     * @param {body[]} bodies
	     */
	    var _bodiesClearForces = function(bodies) {
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            // reset force buffers
	            body.force.x = 0;
	            body.force.y = 0;
	            body.torque = 0;
	        }
	    };

	    /**
	     * Applys a mass dependant force to all given bodies.
	     * @method bodiesApplyGravity
	     * @private
	     * @param {body[]} bodies
	     * @param {vector} gravity
	     */
	    var _bodiesApplyGravity = function(bodies, gravity) {
	        var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;

	        if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
	            return;
	        }
	        
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (body.isStatic || body.isSleeping)
	                continue;

	            // apply gravity
	            body.force.y += body.mass * gravity.y * gravityScale;
	            body.force.x += body.mass * gravity.x * gravityScale;
	        }
	    };

	    /**
	     * Applys `Body.update` to all given `bodies`.
	     * @method updateAll
	     * @private
	     * @param {body[]} bodies
	     * @param {number} deltaTime 
	     * The amount of time elapsed between updates
	     * @param {number} timeScale
	     * @param {number} correction 
	     * The Verlet correction factor (deltaTime / lastDeltaTime)
	     * @param {bounds} worldBounds
	     */
	    var _bodiesUpdate = function(bodies, deltaTime, timeScale, correction, worldBounds) {
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (body.isStatic || body.isSleeping)
	                continue;

	            Body.update(body, deltaTime, timeScale, correction);
	        }
	    };

	    /**
	     * An alias for `Runner.run`, see `Matter.Runner` for more information.
	     * @method run
	     * @param {engine} engine
	     */

	    /**
	    * Fired just before an update
	    *
	    * @event beforeUpdate
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after engine update and all collision events
	    *
	    * @event afterUpdate
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after engine update, provides a list of all pairs that have started to collide in the current tick (if any)
	    *
	    * @event collisionStart
	    * @param {} event An event object
	    * @param {} event.pairs List of affected pairs
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after engine update, provides a list of all pairs that are colliding in the current tick (if any)
	    *
	    * @event collisionActive
	    * @param {} event An event object
	    * @param {} event.pairs List of affected pairs
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after engine update, provides a list of all pairs that have ended collision in the current tick (if any)
	    *
	    * @event collisionEnd
	    * @param {} event An event object
	    * @param {} event.pairs List of affected pairs
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * An integer `Number` that specifies the number of position iterations to perform each update.
	     * The higher the value, the higher quality the simulation will be at the expense of performance.
	     *
	     * @property positionIterations
	     * @type number
	     * @default 6
	     */

	    /**
	     * An integer `Number` that specifies the number of velocity iterations to perform each update.
	     * The higher the value, the higher quality the simulation will be at the expense of performance.
	     *
	     * @property velocityIterations
	     * @type number
	     * @default 4
	     */

	    /**
	     * An integer `Number` that specifies the number of constraint iterations to perform each update.
	     * The higher the value, the higher quality the simulation will be at the expense of performance.
	     * The default value of `2` is usually very adequate.
	     *
	     * @property constraintIterations
	     * @type number
	     * @default 2
	     */

	    /**
	     * A flag that specifies whether the engine should allow sleeping via the `Matter.Sleeping` module.
	     * Sleeping can improve stability and performance, but often at the expense of accuracy.
	     *
	     * @property enableSleeping
	     * @type boolean
	     * @default false
	     */

	    /**
	     * An `Object` containing properties regarding the timing systems of the engine. 
	     *
	     * @property timing
	     * @type object
	     */

	    /**
	     * A `Number` that specifies the global scaling factor of time for all bodies.
	     * A value of `0` freezes the simulation.
	     * A value of `0.1` gives a slow-motion effect.
	     * A value of `1.2` gives a speed-up effect.
	     *
	     * @property timing.timeScale
	     * @type number
	     * @default 1
	     */

	    /**
	     * A `Number` that specifies the current simulation-time in milliseconds starting from `0`. 
	     * It is incremented on every `Engine.update` by the given `delta` argument. 
	     *
	     * @property timing.timestamp
	     * @type number
	     * @default 0
	     */

	    /**
	     * An instance of a `Render` controller. The default value is a `Matter.Render` instance created by `Engine.create`.
	     * One may also develop a custom renderer module based on `Matter.Render` and pass an instance of it to `Engine.create` via `options.render`.
	     *
	     * A minimal custom renderer object must define at least three functions: `create`, `clear` and `world` (see `Matter.Render`).
	     * It is also possible to instead pass the _module_ reference via `options.render.controller` and `Engine.create` will instantiate one for you.
	     *
	     * @property render
	     * @type render
	     * @deprecated see Demo.js for an example of creating a renderer
	     * @default a Matter.Render instance
	     */

	    /**
	     * An instance of a broadphase controller. The default value is a `Matter.Grid` instance created by `Engine.create`.
	     *
	     * @property broadphase
	     * @type grid
	     * @default a Matter.Grid instance
	     */

	    /**
	     * A `World` composite object that will contain all simulated bodies and constraints.
	     *
	     * @property world
	     * @type world
	     * @default a Matter.World instance
	     */

	})();

	},{"../body/Body":1,"../body/Composite":2,"../body/World":3,"../collision/Grid":6,"../collision/Pairs":8,"../collision/Resolver":10,"../constraint/Constraint":12,"../render/Render":29,"./Common":14,"./Events":16,"./Metrics":17,"./Sleeping":20}],16:[function(require,module,exports){
	/**
	* The `Matter.Events` module contains methods to fire and listen to events on other objects.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Events
	*/

	var Events = {};

	module.exports = Events;

	var Common = require('./Common');

	(function() {

	    /**
	     * Subscribes a callback function to the given object's `eventName`.
	     * @method on
	     * @param {} object
	     * @param {string} eventNames
	     * @param {function} callback
	     */
	    Events.on = function(object, eventNames, callback) {
	        var names = eventNames.split(' '),
	            name;

	        for (var i = 0; i < names.length; i++) {
	            name = names[i];
	            object.events = object.events || {};
	            object.events[name] = object.events[name] || [];
	            object.events[name].push(callback);
	        }

	        return callback;
	    };

	    /**
	     * Removes the given event callback. If no callback, clears all callbacks in `eventNames`. If no `eventNames`, clears all events.
	     * @method off
	     * @param {} object
	     * @param {string} eventNames
	     * @param {function} callback
	     */
	    Events.off = function(object, eventNames, callback) {
	        if (!eventNames) {
	            object.events = {};
	            return;
	        }

	        // handle Events.off(object, callback)
	        if (typeof eventNames === 'function') {
	            callback = eventNames;
	            eventNames = Common.keys(object.events).join(' ');
	        }

	        var names = eventNames.split(' ');

	        for (var i = 0; i < names.length; i++) {
	            var callbacks = object.events[names[i]],
	                newCallbacks = [];

	            if (callback && callbacks) {
	                for (var j = 0; j < callbacks.length; j++) {
	                    if (callbacks[j] !== callback)
	                        newCallbacks.push(callbacks[j]);
	                }
	            }

	            object.events[names[i]] = newCallbacks;
	        }
	    };

	    /**
	     * Fires all the callbacks subscribed to the given object's `eventName`, in the order they subscribed, if any.
	     * @method trigger
	     * @param {} object
	     * @param {string} eventNames
	     * @param {} event
	     */
	    Events.trigger = function(object, eventNames, event) {
	        var names,
	            name,
	            callbacks,
	            eventClone;

	        if (object.events) {
	            if (!event)
	                event = {};

	            names = eventNames.split(' ');

	            for (var i = 0; i < names.length; i++) {
	                name = names[i];
	                callbacks = object.events[name];

	                if (callbacks) {
	                    eventClone = Common.clone(event, false);
	                    eventClone.name = name;
	                    eventClone.source = object;

	                    for (var j = 0; j < callbacks.length; j++) {
	                        callbacks[j].apply(object, [eventClone]);
	                    }
	                }
	            }
	        }
	    };

	})();

	},{"./Common":14}],17:[function(require,module,exports){

	},{"../body/Composite":2,"./Common":14}],18:[function(require,module,exports){
	/**
	* The `Matter.Mouse` module contains methods for creating and manipulating mouse inputs.
	*
	* @class Mouse
	*/

	var Mouse = {};

	module.exports = Mouse;

	var Common = require('../core/Common');

	(function() {

	    /**
	     * Creates a mouse input.
	     * @method create
	     * @param {HTMLElement} element
	     * @return {mouse} A new mouse
	     */
	    Mouse.create = function(element) {
	        var mouse = {};

	        if (!element) {
	            Common.log('Mouse.create: element was undefined, defaulting to document.body', 'warn');
	        }
	        
	        mouse.element = element || document.body;
	        mouse.absolute = { x: 0, y: 0 };
	        mouse.position = { x: 0, y: 0 };
	        mouse.mousedownPosition = { x: 0, y: 0 };
	        mouse.mouseupPosition = { x: 0, y: 0 };
	        mouse.offset = { x: 0, y: 0 };
	        mouse.scale = { x: 1, y: 1 };
	        mouse.wheelDelta = 0;
	        mouse.button = -1;
	        mouse.pixelRatio = mouse.element.getAttribute('data-pixel-ratio') || 1;

	        mouse.sourceEvents = {
	            mousemove: null,
	            mousedown: null,
	            mouseup: null,
	            mousewheel: null
	        };
	        
	        mouse.mousemove = function(event) { 
	            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
	                touches = event.changedTouches;

	            if (touches) {
	                mouse.button = 0;
	                event.preventDefault();
	            }

	            mouse.absolute.x = position.x;
	            mouse.absolute.y = position.y;
	            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
	            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	            mouse.sourceEvents.mousemove = event;
	        };
	        
	        mouse.mousedown = function(event) {
	            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
	                touches = event.changedTouches;

	            if (touches) {
	                mouse.button = 0;
	                event.preventDefault();
	            } else {
	                mouse.button = event.button;
	            }

	            mouse.absolute.x = position.x;
	            mouse.absolute.y = position.y;
	            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
	            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	            mouse.mousedownPosition.x = mouse.position.x;
	            mouse.mousedownPosition.y = mouse.position.y;
	            mouse.sourceEvents.mousedown = event;
	        };
	        
	        mouse.mouseup = function(event) {
	            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
	                touches = event.changedTouches;

	            if (touches) {
	                event.preventDefault();
	            }
	            
	            mouse.button = -1;
	            mouse.absolute.x = position.x;
	            mouse.absolute.y = position.y;
	            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
	            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	            mouse.mouseupPosition.x = mouse.position.x;
	            mouse.mouseupPosition.y = mouse.position.y;
	            mouse.sourceEvents.mouseup = event;
	        };

	        mouse.mousewheel = function(event) {
	            mouse.wheelDelta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
	            event.preventDefault();
	        };

	        Mouse.setElement(mouse, mouse.element);

	        return mouse;
	    };

	    /**
	     * Sets the element the mouse is bound to (and relative to).
	     * @method setElement
	     * @param {mouse} mouse
	     * @param {HTMLElement} element
	     */
	    Mouse.setElement = function(mouse, element) {
	        mouse.element = element;

	        element.addEventListener('mousemove', mouse.mousemove);
	        element.addEventListener('mousedown', mouse.mousedown);
	        element.addEventListener('mouseup', mouse.mouseup);
	        
	        element.addEventListener('mousewheel', mouse.mousewheel);
	        element.addEventListener('DOMMouseScroll', mouse.mousewheel);

	        element.addEventListener('touchmove', mouse.mousemove);
	        element.addEventListener('touchstart', mouse.mousedown);
	        element.addEventListener('touchend', mouse.mouseup);
	    };

	    /**
	     * Clears all captured source events.
	     * @method clearSourceEvents
	     * @param {mouse} mouse
	     */
	    Mouse.clearSourceEvents = function(mouse) {
	        mouse.sourceEvents.mousemove = null;
	        mouse.sourceEvents.mousedown = null;
	        mouse.sourceEvents.mouseup = null;
	        mouse.sourceEvents.mousewheel = null;
	        mouse.wheelDelta = 0;
	    };

	    /**
	     * Sets the mouse position offset.
	     * @method setOffset
	     * @param {mouse} mouse
	     * @param {vector} offset
	     */
	    Mouse.setOffset = function(mouse, offset) {
	        mouse.offset.x = offset.x;
	        mouse.offset.y = offset.y;
	        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
	        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	    };

	    /**
	     * Sets the mouse position scale.
	     * @method setScale
	     * @param {mouse} mouse
	     * @param {vector} scale
	     */
	    Mouse.setScale = function(mouse, scale) {
	        mouse.scale.x = scale.x;
	        mouse.scale.y = scale.y;
	        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
	        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	    };
	    
	    /**
	     * Gets the mouse position relative to an element given a screen pixel ratio.
	     * @method _getRelativeMousePosition
	     * @private
	     * @param {} event
	     * @param {} element
	     * @param {number} pixelRatio
	     * @return {}
	     */
	    var _getRelativeMousePosition = function(event, element, pixelRatio) {
	        var elementBounds = element.getBoundingClientRect(),
	            rootNode = (document.documentElement || document.body.parentNode || document.body),
	            scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft,
	            scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop,
	            touches = event.changedTouches,
	            x, y;
	        
	        if (touches) {
	            x = touches[0].pageX - elementBounds.left - scrollX;
	            y = touches[0].pageY - elementBounds.top - scrollY;
	        } else {
	            x = event.pageX - elementBounds.left - scrollX;
	            y = event.pageY - elementBounds.top - scrollY;
	        }

	        return { 
	            x: x / (element.clientWidth / element.width * pixelRatio),
	            y: y / (element.clientHeight / element.height * pixelRatio)
	        };
	    };

	})();

	},{"../core/Common":14}],19:[function(require,module,exports){
	/**
	* The `Matter.Runner` module is an optional utility which provides a game loop, 
	* that handles continuously updating a `Matter.Engine` for you within a browser.
	* It is intended for development and debugging purposes, but may also be suitable for simple games.
	* If you are using your own game loop instead, then you do not need the `Matter.Runner` module.
	* Instead just call `Engine.update(engine, delta)` in your own loop.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Runner
	*/

	var Runner = {};

	module.exports = Runner;

	var Events = require('./Events');
	var Engine = require('./Engine');
	var Common = require('./Common');

	(function() {

	    var _requestAnimationFrame,
	        _cancelAnimationFrame;

	    if (typeof window !== 'undefined') {
	        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
	                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
	                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
	   
	        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
	                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
	    }

	    /**
	     * Creates a new Runner. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * @method create
	     * @param {} options
	     */
	    Runner.create = function(options) {
	        var defaults = {
	            fps: 60,
	            correction: 1,
	            deltaSampleSize: 60,
	            counterTimestamp: 0,
	            frameCounter: 0,
	            deltaHistory: [],
	            timePrev: null,
	            timeScalePrev: 1,
	            frameRequestId: null,
	            isFixed: false,
	            enabled: true
	        };

	        var runner = Common.extend(defaults, options);

	        runner.delta = runner.delta || 1000 / runner.fps;
	        runner.deltaMin = runner.deltaMin || 1000 / runner.fps;
	        runner.deltaMax = runner.deltaMax || 1000 / (runner.fps * 0.5);
	        runner.fps = 1000 / runner.delta;

	        return runner;
	    };

	    /**
	     * Continuously ticks a `Matter.Engine` by calling `Runner.tick` on the `requestAnimationFrame` event.
	     * @method run
	     * @param {engine} engine
	     */
	    Runner.run = function(runner, engine) {
	        // create runner if engine is first argument
	        if (typeof runner.positionIterations !== 'undefined') {
	            engine = runner;
	            runner = Runner.create();
	        }

	        (function render(time){
	            runner.frameRequestId = _requestAnimationFrame(render);

	            if (time && runner.enabled) {
	                Runner.tick(runner, engine, time);
	            }
	        })();

	        return runner;
	    };

	    /**
	     * A game loop utility that updates the engine and renderer by one step (a 'tick').
	     * Features delta smoothing, time correction and fixed or dynamic timing.
	     * Triggers `beforeTick`, `tick` and `afterTick` events on the engine.
	     * Consider just `Engine.update(engine, delta)` if you're using your own loop.
	     * @method tick
	     * @param {runner} runner
	     * @param {engine} engine
	     * @param {number} time
	     */
	    Runner.tick = function(runner, engine, time) {
	        var timing = engine.timing,
	            correction = 1,
	            delta;

	        // create an event object
	        var event = {
	            timestamp: timing.timestamp
	        };

	        Events.trigger(runner, 'beforeTick', event);
	        Events.trigger(engine, 'beforeTick', event); // @deprecated

	        if (runner.isFixed) {
	            // fixed timestep
	            delta = runner.delta;
	        } else {
	            // dynamic timestep based on wall clock between calls
	            delta = (time - runner.timePrev) || runner.delta;
	            runner.timePrev = time;

	            // optimistically filter delta over a few frames, to improve stability
	            runner.deltaHistory.push(delta);
	            runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize);
	            delta = Math.min.apply(null, runner.deltaHistory);
	            
	            // limit delta
	            delta = delta < runner.deltaMin ? runner.deltaMin : delta;
	            delta = delta > runner.deltaMax ? runner.deltaMax : delta;

	            // correction for delta
	            correction = delta / runner.delta;

	            // update engine timing object
	            runner.delta = delta;
	        }

	        // time correction for time scaling
	        if (runner.timeScalePrev !== 0)
	            correction *= timing.timeScale / runner.timeScalePrev;

	        if (timing.timeScale === 0)
	            correction = 0;

	        runner.timeScalePrev = timing.timeScale;
	        runner.correction = correction;

	        // fps counter
	        runner.frameCounter += 1;
	        if (time - runner.counterTimestamp >= 1000) {
	            runner.fps = runner.frameCounter * ((time - runner.counterTimestamp) / 1000);
	            runner.counterTimestamp = time;
	            runner.frameCounter = 0;
	        }

	        Events.trigger(runner, 'tick', event);
	        Events.trigger(engine, 'tick', event); // @deprecated

	        // if world has been modified, clear the render scene graph
	        if (engine.world.isModified 
	            && engine.render
	            && engine.render.controller
	            && engine.render.controller.clear) {
	            engine.render.controller.clear(engine.render);
	        }

	        // update
	        Events.trigger(runner, 'beforeUpdate', event);
	        Engine.update(engine, delta, correction);
	        Events.trigger(runner, 'afterUpdate', event);

	        // render
	        // @deprecated
	        if (engine.render && engine.render.controller) {
	            Events.trigger(runner, 'beforeRender', event);
	            Events.trigger(engine, 'beforeRender', event); // @deprecated

	            engine.render.controller.world(engine.render);

	            Events.trigger(runner, 'afterRender', event);
	            Events.trigger(engine, 'afterRender', event); // @deprecated
	        }

	        Events.trigger(runner, 'afterTick', event);
	        Events.trigger(engine, 'afterTick', event); // @deprecated
	    };

	    /**
	     * Ends execution of `Runner.run` on the given `runner`, by canceling the animation frame request event loop.
	     * If you wish to only temporarily pause the engine, see `engine.enabled` instead.
	     * @method stop
	     * @param {runner} runner
	     */
	    Runner.stop = function(runner) {
	        _cancelAnimationFrame(runner.frameRequestId);
	    };

	    /**
	     * Alias for `Runner.run`.
	     * @method start
	     * @param {runner} runner
	     * @param {engine} engine
	     */
	    Runner.start = function(runner, engine) {
	        Runner.run(runner, engine);
	    };

	    /*
	    *
	    *  Events Documentation
	    *
	    */

	    /**
	    * Fired at the start of a tick, before any updates to the engine or timing
	    *
	    * @event beforeTick
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after engine timing updated, but just before update
	    *
	    * @event tick
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired at the end of a tick, after engine update and after rendering
	    *
	    * @event afterTick
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired before update
	    *
	    * @event beforeUpdate
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after update
	    *
	    * @event afterUpdate
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired before rendering
	    *
	    * @event beforeRender
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    * @deprecated
	    */

	    /**
	    * Fired after rendering
	    *
	    * @event afterRender
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    * @deprecated
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * A flag that specifies whether the runner is running or not.
	     *
	     * @property enabled
	     * @type boolean
	     * @default true
	     */

	    /**
	     * A `Boolean` that specifies if the runner should use a fixed timestep (otherwise it is variable).
	     * If timing is fixed, then the apparent simulation speed will change depending on the frame rate (but behaviour will be deterministic).
	     * If the timing is variable, then the apparent simulation speed will be constant (approximately, but at the cost of determininism).
	     *
	     * @property isFixed
	     * @type boolean
	     * @default false
	     */

	    /**
	     * A `Number` that specifies the time step between updates in milliseconds.
	     * If `engine.timing.isFixed` is set to `true`, then `delta` is fixed.
	     * If it is `false`, then `delta` can dynamically change to maintain the correct apparent simulation speed.
	     *
	     * @property delta
	     * @type number
	     * @default 1000 / 60
	     */

	})();

	},{"./Common":14,"./Engine":15,"./Events":16}],20:[function(require,module,exports){
	/**
	* The `Matter.Sleeping` module contains methods to manage the sleeping state of bodies.
	*
	* @class Sleeping
	*/

	var Sleeping = {};

	module.exports = Sleeping;

	var Events = require('./Events');

	(function() {

	    Sleeping._motionWakeThreshold = 0.18;
	    Sleeping._motionSleepThreshold = 0.08;
	    Sleeping._minBias = 0.9;

	    /**
	     * Puts bodies to sleep or wakes them up depending on their motion.
	     * @method update
	     * @param {body[]} bodies
	     * @param {number} timeScale
	     */
	    Sleeping.update = function(bodies, timeScale) {
	        var timeFactor = timeScale * timeScale * timeScale;

	        // update bodies sleeping status
	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                motion = body.speed * body.speed + body.angularSpeed * body.angularSpeed;

	            // wake up bodies if they have a force applied
	            if (body.force.x !== 0 || body.force.y !== 0) {
	                Sleeping.set(body, false);
	                continue;
	            }

	            var minMotion = Math.min(body.motion, motion),
	                maxMotion = Math.max(body.motion, motion);
	        
	            // biased average motion estimation between frames
	            body.motion = Sleeping._minBias * minMotion + (1 - Sleeping._minBias) * maxMotion;
	            
	            if (body.sleepThreshold > 0 && body.motion < Sleeping._motionSleepThreshold * timeFactor) {
	                body.sleepCounter += 1;
	                
	                if (body.sleepCounter >= body.sleepThreshold)
	                    Sleeping.set(body, true);
	            } else if (body.sleepCounter > 0) {
	                body.sleepCounter -= 1;
	            }
	        }
	    };

	    /**
	     * Given a set of colliding pairs, wakes the sleeping bodies involved.
	     * @method afterCollisions
	     * @param {pair[]} pairs
	     * @param {number} timeScale
	     */
	    Sleeping.afterCollisions = function(pairs, timeScale) {
	        var timeFactor = timeScale * timeScale * timeScale;

	        // wake up bodies involved in collisions
	        for (var i = 0; i < pairs.length; i++) {
	            var pair = pairs[i];
	            
	            // don't wake inactive pairs
	            if (!pair.isActive)
	                continue;

	            var collision = pair.collision,
	                bodyA = collision.bodyA.parent, 
	                bodyB = collision.bodyB.parent;
	        
	            // don't wake if at least one body is static
	            if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
	                continue;
	        
	            if (bodyA.isSleeping || bodyB.isSleeping) {
	                var sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
	                    movingBody = sleepingBody === bodyA ? bodyB : bodyA;

	                if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) {
	                    Sleeping.set(sleepingBody, false);
	                }
	            }
	        }
	    };
	  
	    /**
	     * Set a body as sleeping or awake.
	     * @method set
	     * @param {body} body
	     * @param {boolean} isSleeping
	     */
	    Sleeping.set = function(body, isSleeping) {
	        var wasSleeping = body.isSleeping;

	        if (isSleeping) {
	            body.isSleeping = true;
	            body.sleepCounter = body.sleepThreshold;

	            body.positionImpulse.x = 0;
	            body.positionImpulse.y = 0;

	            body.positionPrev.x = body.position.x;
	            body.positionPrev.y = body.position.y;

	            body.anglePrev = body.angle;
	            body.speed = 0;
	            body.angularSpeed = 0;
	            body.motion = 0;

	            if (!wasSleeping) {
	                Events.trigger(body, 'sleepStart');
	            }
	        } else {
	            body.isSleeping = false;
	            body.sleepCounter = 0;

	            if (wasSleeping) {
	                Events.trigger(body, 'sleepEnd');
	            }
	        }
	    };

	})();

	},{"./Events":16}],21:[function(require,module,exports){
	/**
	* The `Matter.Bodies` module contains factory methods for creating rigid body models 
	* with commonly used body configurations (such as rectangles, circles and other polygons).
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Bodies
	*/

	// TODO: true circle bodies

	var Bodies = {};

	module.exports = Bodies;

	var Vertices = require('../geometry/Vertices');
	var Common = require('../core/Common');
	var Body = require('../body/Body');
	var Bounds = require('../geometry/Bounds');
	var Vector = require('../geometry/Vector');

	(function() {

	    /**
	     * Creates a new rigid body model with a rectangle hull. 
	     * The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
	     * @method rectangle
	     * @param {number} x
	     * @param {number} y
	     * @param {number} width
	     * @param {number} height
	     * @param {object} [options]
	     * @return {body} A new rectangle body
	     */
	    Bodies.rectangle = function(x, y, width, height, options) {
	        options = options || {};

	        var rectangle = { 
	            label: 'Rectangle Body',
	            position: { x: x, y: y },
	            vertices: Vertices.fromPath('L 0 0 L ' + width + ' 0 L ' + width + ' ' + height + ' L 0 ' + height)
	        };

	        if (options.chamfer) {
	            var chamfer = options.chamfer;
	            rectangle.vertices = Vertices.chamfer(rectangle.vertices, chamfer.radius, 
	                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
	            delete options.chamfer;
	        }

	        return Body.create(Common.extend({}, rectangle, options));
	    };
	    
	    /**
	     * Creates a new rigid body model with a trapezoid hull. 
	     * The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
	     * @method trapezoid
	     * @param {number} x
	     * @param {number} y
	     * @param {number} width
	     * @param {number} height
	     * @param {number} slope
	     * @param {object} [options]
	     * @return {body} A new trapezoid body
	     */
	    Bodies.trapezoid = function(x, y, width, height, slope, options) {
	        options = options || {};

	        slope *= 0.5;
	        var roof = (1 - (slope * 2)) * width;
	        
	        var x1 = width * slope,
	            x2 = x1 + roof,
	            x3 = x2 + x1,
	            verticesPath;

	        if (slope < 0.5) {
	            verticesPath = 'L 0 0 L ' + x1 + ' ' + (-height) + ' L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
	        } else {
	            verticesPath = 'L 0 0 L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
	        }

	        var trapezoid = { 
	            label: 'Trapezoid Body',
	            position: { x: x, y: y },
	            vertices: Vertices.fromPath(verticesPath)
	        };

	        if (options.chamfer) {
	            var chamfer = options.chamfer;
	            trapezoid.vertices = Vertices.chamfer(trapezoid.vertices, chamfer.radius, 
	                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
	            delete options.chamfer;
	        }

	        return Body.create(Common.extend({}, trapezoid, options));
	    };

	    /**
	     * Creates a new rigid body model with a circle hull. 
	     * The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
	     * @method circle
	     * @param {number} x
	     * @param {number} y
	     * @param {number} radius
	     * @param {object} [options]
	     * @param {number} [maxSides]
	     * @return {body} A new circle body
	     */
	    Bodies.circle = function(x, y, radius, options, maxSides) {
	        options = options || {};

	        var circle = {
	            label: 'Circle Body',
	            circleRadius: radius
	        };
	        
	        // approximate circles with polygons until true circles implemented in SAT
	        maxSides = maxSides || 25;
	        var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

	        // optimisation: always use even number of sides (half the number of unique axes)
	        if (sides % 2 === 1)
	            sides += 1;

	        return Bodies.polygon(x, y, sides, radius, Common.extend({}, circle, options));
	    };

	    /**
	     * Creates a new rigid body model with a regular polygon hull with the given number of sides. 
	     * The options parameter is an object that specifies any properties you wish to override the defaults.
	     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
	     * @method polygon
	     * @param {number} x
	     * @param {number} y
	     * @param {number} sides
	     * @param {number} radius
	     * @param {object} [options]
	     * @return {body} A new regular polygon body
	     */
	    Bodies.polygon = function(x, y, sides, radius, options) {
	        options = options || {};

	        if (sides < 3)
	            return Bodies.circle(x, y, radius, options);

	        var theta = 2 * Math.PI / sides,
	            path = '',
	            offset = theta * 0.5;

	        for (var i = 0; i < sides; i += 1) {
	            var angle = offset + (i * theta),
	                xx = Math.cos(angle) * radius,
	                yy = Math.sin(angle) * radius;

	            path += 'L ' + xx.toFixed(3) + ' ' + yy.toFixed(3) + ' ';
	        }

	        var polygon = { 
	            label: 'Polygon Body',
	            position: { x: x, y: y },
	            vertices: Vertices.fromPath(path)
	        };

	        if (options.chamfer) {
	            var chamfer = options.chamfer;
	            polygon.vertices = Vertices.chamfer(polygon.vertices, chamfer.radius, 
	                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
	            delete options.chamfer;
	        }

	        return Body.create(Common.extend({}, polygon, options));
	    };

	    /**
	     * Creates a body using the supplied vertices (or an array containing multiple sets of vertices).
	     * If the vertices are convex, they will pass through as supplied.
	     * Otherwise if the vertices are concave, they will be decomposed if [poly-decomp.js](https://github.com/schteppe/poly-decomp.js) is available.
	     * Note that this process is not guaranteed to support complex sets of vertices (e.g. those with holes may fail).
	     * By default the decomposition will discard collinear edges (to improve performance).
	     * It can also optionally discard any parts that have an area less than `minimumArea`.
	     * If the vertices can not be decomposed, the result will fall back to using the convex hull.
	     * The options parameter is an object that specifies any `Matter.Body` properties you wish to override the defaults.
	     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
	     * @method fromVertices
	     * @param {number} x
	     * @param {number} y
	     * @param [[vector]] vertexSets
	     * @param {object} [options]
	     * @param {bool} [flagInternal=false]
	     * @param {number} [removeCollinear=0.01]
	     * @param {number} [minimumArea=10]
	     * @return {body}
	     */
	    Bodies.fromVertices = function(x, y, vertexSets, options, flagInternal, removeCollinear, minimumArea) {
	        var body,
	            parts,
	            isConvex,
	            vertices,
	            i,
	            j,
	            k,
	            v,
	            z;

	        options = options || {};
	        parts = [];

	        flagInternal = typeof flagInternal !== 'undefined' ? flagInternal : false;
	        removeCollinear = typeof removeCollinear !== 'undefined' ? removeCollinear : 0.01;
	        minimumArea = typeof minimumArea !== 'undefined' ? minimumArea : 10;

	        if (!window.decomp) {
	            Common.log('Bodies.fromVertices: poly-decomp.js required. Could not decompose vertices. Fallback to convex hull.', 'warn');
	        }

	        // ensure vertexSets is an array of arrays
	        if (!Common.isArray(vertexSets[0])) {
	            vertexSets = [vertexSets];
	        }

	        for (v = 0; v < vertexSets.length; v += 1) {
	            vertices = vertexSets[v];
	            isConvex = Vertices.isConvex(vertices);

	            if (isConvex || !window.decomp) {
	                if (isConvex) {
	                    vertices = Vertices.clockwiseSort(vertices);
	                } else {
	                    // fallback to convex hull when decomposition is not possible
	                    vertices = Vertices.hull(vertices);
	                }

	                parts.push({
	                    position: { x: x, y: y },
	                    vertices: vertices
	                });
	            } else {
	                // initialise a decomposition
	                var concave = new decomp.Polygon();
	                for (i = 0; i < vertices.length; i++) {
	                    concave.vertices.push([vertices[i].x, vertices[i].y]);
	                }

	                // vertices are concave and simple, we can decompose into parts
	                concave.makeCCW();
	                if (removeCollinear !== false)
	                    concave.removeCollinearPoints(removeCollinear);

	                // use the quick decomposition algorithm (Bayazit)
	                var decomposed = concave.quickDecomp();

	                // for each decomposed chunk
	                for (i = 0; i < decomposed.length; i++) {
	                    var chunk = decomposed[i],
	                        chunkVertices = [];

	                    // convert vertices into the correct structure
	                    for (j = 0; j < chunk.vertices.length; j++) {
	                        chunkVertices.push({ x: chunk.vertices[j][0], y: chunk.vertices[j][1] });
	                    }

	                    // skip small chunks
	                    if (minimumArea > 0 && Vertices.area(chunkVertices) < minimumArea)
	                        continue;

	                    // create a compound part
	                    parts.push({
	                        position: Vertices.centre(chunkVertices),
	                        vertices: chunkVertices
	                    });
	                }
	            }
	        }

	        // create body parts
	        for (i = 0; i < parts.length; i++) {
	            parts[i] = Body.create(Common.extend(parts[i], options));
	        }

	        // flag internal edges (coincident part edges)
	        if (flagInternal) {
	            var coincident_max_dist = 5;

	            for (i = 0; i < parts.length; i++) {
	                var partA = parts[i];

	                for (j = i + 1; j < parts.length; j++) {
	                    var partB = parts[j];

	                    if (Bounds.overlaps(partA.bounds, partB.bounds)) {
	                        var pav = partA.vertices,
	                            pbv = partB.vertices;

	                        // iterate vertices of both parts
	                        for (k = 0; k < partA.vertices.length; k++) {
	                            for (z = 0; z < partB.vertices.length; z++) {
	                                // find distances between the vertices
	                                var da = Vector.magnitudeSquared(Vector.sub(pav[(k + 1) % pav.length], pbv[z])),
	                                    db = Vector.magnitudeSquared(Vector.sub(pav[k], pbv[(z + 1) % pbv.length]));

	                                // if both vertices are very close, consider the edge concident (internal)
	                                if (da < coincident_max_dist && db < coincident_max_dist) {
	                                    pav[k].isInternal = true;
	                                    pbv[z].isInternal = true;
	                                }
	                            }
	                        }

	                    }
	                }
	            }
	        }

	        if (parts.length > 1) {
	            // create the parent body to be returned, that contains generated compound parts
	            body = Body.create(Common.extend({ parts: parts.slice(0) }, options));
	            Body.setPosition(body, { x: x, y: y });

	            return body;
	        } else {
	            return parts[0];
	        }
	    };

	})();
	},{"../body/Body":1,"../core/Common":14,"../geometry/Bounds":24,"../geometry/Vector":26,"../geometry/Vertices":27}],22:[function(require,module,exports){
	/**
	* The `Matter.Composites` module contains factory methods for creating composite bodies
	* with commonly used configurations (such as stacks and chains).
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Composites
	*/

	var Composites = {};

	module.exports = Composites;

	var Composite = require('../body/Composite');
	var Constraint = require('../constraint/Constraint');
	var Common = require('../core/Common');
	var Body = require('../body/Body');
	var Bodies = require('./Bodies');

	(function() {

	    /**
	     * Create a new composite containing bodies created in the callback in a grid arrangement.
	     * This function uses the body's bounds to prevent overlaps.
	     * @method stack
	     * @param {number} xx
	     * @param {number} yy
	     * @param {number} columns
	     * @param {number} rows
	     * @param {number} columnGap
	     * @param {number} rowGap
	     * @param {function} callback
	     * @return {composite} A new composite containing objects created in the callback
	     */
	    Composites.stack = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
	        var stack = Composite.create({ label: 'Stack' }),
	            x = xx,
	            y = yy,
	            lastBody,
	            i = 0;

	        for (var row = 0; row < rows; row++) {
	            var maxHeight = 0;
	            
	            for (var column = 0; column < columns; column++) {
	                var body = callback(x, y, column, row, lastBody, i);
	                    
	                if (body) {
	                    var bodyHeight = body.bounds.max.y - body.bounds.min.y,
	                        bodyWidth = body.bounds.max.x - body.bounds.min.x; 

	                    if (bodyHeight > maxHeight)
	                        maxHeight = bodyHeight;
	                    
	                    Body.translate(body, { x: bodyWidth * 0.5, y: bodyHeight * 0.5 });

	                    x = body.bounds.max.x + columnGap;

	                    Composite.addBody(stack, body);
	                    
	                    lastBody = body;
	                    i += 1;
	                } else {
	                    x += columnGap;
	                }
	            }
	            
	            y += maxHeight + rowGap;
	            x = xx;
	        }

	        return stack;
	    };
	    
	    /**
	     * Chains all bodies in the given composite together using constraints.
	     * @method chain
	     * @param {composite} composite
	     * @param {number} xOffsetA
	     * @param {number} yOffsetA
	     * @param {number} xOffsetB
	     * @param {number} yOffsetB
	     * @param {object} options
	     * @return {composite} A new composite containing objects chained together with constraints
	     */
	    Composites.chain = function(composite, xOffsetA, yOffsetA, xOffsetB, yOffsetB, options) {
	        var bodies = composite.bodies;
	        
	        for (var i = 1; i < bodies.length; i++) {
	            var bodyA = bodies[i - 1],
	                bodyB = bodies[i],
	                bodyAHeight = bodyA.bounds.max.y - bodyA.bounds.min.y,
	                bodyAWidth = bodyA.bounds.max.x - bodyA.bounds.min.x, 
	                bodyBHeight = bodyB.bounds.max.y - bodyB.bounds.min.y,
	                bodyBWidth = bodyB.bounds.max.x - bodyB.bounds.min.x;
	        
	            var defaults = {
	                bodyA: bodyA,
	                pointA: { x: bodyAWidth * xOffsetA, y: bodyAHeight * yOffsetA },
	                bodyB: bodyB,
	                pointB: { x: bodyBWidth * xOffsetB, y: bodyBHeight * yOffsetB }
	            };
	            
	            var constraint = Common.extend(defaults, options);
	        
	            Composite.addConstraint(composite, Constraint.create(constraint));
	        }

	        composite.label += ' Chain';
	        
	        return composite;
	    };

	    /**
	     * Connects bodies in the composite with constraints in a grid pattern, with optional cross braces.
	     * @method mesh
	     * @param {composite} composite
	     * @param {number} columns
	     * @param {number} rows
	     * @param {boolean} crossBrace
	     * @param {object} options
	     * @return {composite} The composite containing objects meshed together with constraints
	     */
	    Composites.mesh = function(composite, columns, rows, crossBrace, options) {
	        var bodies = composite.bodies,
	            row,
	            col,
	            bodyA,
	            bodyB,
	            bodyC;
	        
	        for (row = 0; row < rows; row++) {
	            for (col = 1; col < columns; col++) {
	                bodyA = bodies[(col - 1) + (row * columns)];
	                bodyB = bodies[col + (row * columns)];
	                Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));
	            }

	            if (row > 0) {
	                for (col = 0; col < columns; col++) {
	                    bodyA = bodies[col + ((row - 1) * columns)];
	                    bodyB = bodies[col + (row * columns)];
	                    Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));

	                    if (crossBrace && col > 0) {
	                        bodyC = bodies[(col - 1) + ((row - 1) * columns)];
	                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
	                    }

	                    if (crossBrace && col < columns - 1) {
	                        bodyC = bodies[(col + 1) + ((row - 1) * columns)];
	                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
	                    }
	                }
	            }
	        }

	        composite.label += ' Mesh';
	        
	        return composite;
	    };
	    
	    /**
	     * Create a new composite containing bodies created in the callback in a pyramid arrangement.
	     * This function uses the body's bounds to prevent overlaps.
	     * @method pyramid
	     * @param {number} xx
	     * @param {number} yy
	     * @param {number} columns
	     * @param {number} rows
	     * @param {number} columnGap
	     * @param {number} rowGap
	     * @param {function} callback
	     * @return {composite} A new composite containing objects created in the callback
	     */
	    Composites.pyramid = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
	        return Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y, column, row, lastBody, i) {
	            var actualRows = Math.min(rows, Math.ceil(columns / 2)),
	                lastBodyWidth = lastBody ? lastBody.bounds.max.x - lastBody.bounds.min.x : 0;
	            
	            if (row > actualRows)
	                return;
	            
	            // reverse row order
	            row = actualRows - row;
	            
	            var start = row,
	                end = columns - 1 - row;

	            if (column < start || column > end)
	                return;
	            
	            // retroactively fix the first body's position, since width was unknown
	            if (i === 1) {
	                Body.translate(lastBody, { x: (column + (columns % 2 === 1 ? 1 : -1)) * lastBodyWidth, y: 0 });
	            }

	            var xOffset = lastBody ? column * lastBodyWidth : 0;
	            
	            return callback(xx + xOffset + column * columnGap, y, column, row, lastBody, i);
	        });
	    };

	    /**
	     * Creates a composite with a Newton's Cradle setup of bodies and constraints.
	     * @method newtonsCradle
	     * @param {number} xx
	     * @param {number} yy
	     * @param {number} number
	     * @param {number} size
	     * @param {number} length
	     * @return {composite} A new composite newtonsCradle body
	     */
	    Composites.newtonsCradle = function(xx, yy, number, size, length) {
	        var newtonsCradle = Composite.create({ label: 'Newtons Cradle' });

	        for (var i = 0; i < number; i++) {
	            var separation = 1.9,
	                circle = Bodies.circle(xx + i * (size * separation), yy + length, size, 
	                            { inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0.0001, slop: 1 }),
	                constraint = Constraint.create({ pointA: { x: xx + i * (size * separation), y: yy }, bodyB: circle });

	            Composite.addBody(newtonsCradle, circle);
	            Composite.addConstraint(newtonsCradle, constraint);
	        }

	        return newtonsCradle;
	    };
	    
	    /**
	     * Creates a composite with simple car setup of bodies and constraints.
	     * @method car
	     * @param {number} xx
	     * @param {number} yy
	     * @param {number} width
	     * @param {number} height
	     * @param {number} wheelSize
	     * @return {composite} A new composite car body
	     */
	    Composites.car = function(xx, yy, width, height, wheelSize) {
	        var group = Body.nextGroup(true),
	            wheelBase = -20,
	            wheelAOffset = -width * 0.5 + wheelBase,
	            wheelBOffset = width * 0.5 - wheelBase,
	            wheelYOffset = 0;
	    
	        var car = Composite.create({ label: 'Car' }),
	            body = Bodies.trapezoid(xx, yy, width, height, 0.3, { 
	                collisionFilter: {
	                    group: group
	                },
	                friction: 0.01,
	                chamfer: {
	                    radius: 10
	                }
	            });
	    
	        var wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, { 
	            collisionFilter: {
	                group: group
	            },
	            friction: 0.8,
	            density: 0.01
	        });
	                    
	        var wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, { 
	            collisionFilter: {
	                group: group
	            },
	            friction: 0.8,
	            density: 0.01
	        });
	                    
	        var axelA = Constraint.create({
	            bodyA: body,
	            pointA: { x: wheelAOffset, y: wheelYOffset },
	            bodyB: wheelA,
	            stiffness: 0.2
	        });
	                        
	        var axelB = Constraint.create({
	            bodyA: body,
	            pointA: { x: wheelBOffset, y: wheelYOffset },
	            bodyB: wheelB,
	            stiffness: 0.2
	        });
	        
	        Composite.addBody(car, body);
	        Composite.addBody(car, wheelA);
	        Composite.addBody(car, wheelB);
	        Composite.addConstraint(car, axelA);
	        Composite.addConstraint(car, axelB);

	        return car;
	    };

	    /**
	     * Creates a simple soft body like object.
	     * @method softBody
	     * @param {number} xx
	     * @param {number} yy
	     * @param {number} columns
	     * @param {number} rows
	     * @param {number} columnGap
	     * @param {number} rowGap
	     * @param {boolean} crossBrace
	     * @param {number} particleRadius
	     * @param {} particleOptions
	     * @param {} constraintOptions
	     * @return {composite} A new composite softBody
	     */
	    Composites.softBody = function(xx, yy, columns, rows, columnGap, rowGap, crossBrace, particleRadius, particleOptions, constraintOptions) {
	        particleOptions = Common.extend({ inertia: Infinity }, particleOptions);
	        constraintOptions = Common.extend({ stiffness: 0.4 }, constraintOptions);

	        var softBody = Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y) {
	            return Bodies.circle(x, y, particleRadius, particleOptions);
	        });

	        Composites.mesh(softBody, columns, rows, crossBrace, constraintOptions);

	        softBody.label = 'Soft Body';

	        return softBody;
	    };

	})();

	},{"../body/Body":1,"../body/Composite":2,"../constraint/Constraint":12,"../core/Common":14,"./Bodies":21}],23:[function(require,module,exports){
	/**
	* The `Matter.Axes` module contains methods for creating and manipulating sets of axes.
	*
	* @class Axes
	*/

	var Axes = {};

	module.exports = Axes;

	var Vector = require('../geometry/Vector');
	var Common = require('../core/Common');

	(function() {

	    /**
	     * Creates a new set of axes from the given vertices.
	     * @method fromVertices
	     * @param {vertices} vertices
	     * @return {axes} A new axes from the given vertices
	     */
	    Axes.fromVertices = function(vertices) {
	        var axes = {};

	        // find the unique axes, using edge normal gradients
	        for (var i = 0; i < vertices.length; i++) {
	            var j = (i + 1) % vertices.length, 
	                normal = Vector.normalise({ 
	                    x: vertices[j].y - vertices[i].y, 
	                    y: vertices[i].x - vertices[j].x
	                }),
	                gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);
	            
	            // limit precision
	            gradient = gradient.toFixed(3).toString();
	            axes[gradient] = normal;
	        }

	        return Common.values(axes);
	    };

	    /**
	     * Rotates a set of axes by the given angle.
	     * @method rotate
	     * @param {axes} axes
	     * @param {number} angle
	     */
	    Axes.rotate = function(axes, angle) {
	        if (angle === 0)
	            return;
	        
	        var cos = Math.cos(angle),
	            sin = Math.sin(angle);

	        for (var i = 0; i < axes.length; i++) {
	            var axis = axes[i],
	                xx;
	            xx = axis.x * cos - axis.y * sin;
	            axis.y = axis.x * sin + axis.y * cos;
	            axis.x = xx;
	        }
	    };

	})();

	},{"../core/Common":14,"../geometry/Vector":26}],24:[function(require,module,exports){
	/**
	* The `Matter.Bounds` module contains methods for creating and manipulating axis-aligned bounding boxes (AABB).
	*
	* @class Bounds
	*/

	var Bounds = {};

	module.exports = Bounds;

	(function() {

	    /**
	     * Creates a new axis-aligned bounding box (AABB) for the given vertices.
	     * @method create
	     * @param {vertices} vertices
	     * @return {bounds} A new bounds object
	     */
	    Bounds.create = function(vertices) {
	        var bounds = { 
	            min: { x: 0, y: 0 }, 
	            max: { x: 0, y: 0 }
	        };

	        if (vertices)
	            Bounds.update(bounds, vertices);
	        
	        return bounds;
	    };

	    /**
	     * Updates bounds using the given vertices and extends the bounds given a velocity.
	     * @method update
	     * @param {bounds} bounds
	     * @param {vertices} vertices
	     * @param {vector} velocity
	     */
	    Bounds.update = function(bounds, vertices, velocity) {
	        bounds.min.x = Infinity;
	        bounds.max.x = -Infinity;
	        bounds.min.y = Infinity;
	        bounds.max.y = -Infinity;

	        for (var i = 0; i < vertices.length; i++) {
	            var vertex = vertices[i];
	            if (vertex.x > bounds.max.x) bounds.max.x = vertex.x;
	            if (vertex.x < bounds.min.x) bounds.min.x = vertex.x;
	            if (vertex.y > bounds.max.y) bounds.max.y = vertex.y;
	            if (vertex.y < bounds.min.y) bounds.min.y = vertex.y;
	        }
	        
	        if (velocity) {
	            if (velocity.x > 0) {
	                bounds.max.x += velocity.x;
	            } else {
	                bounds.min.x += velocity.x;
	            }
	            
	            if (velocity.y > 0) {
	                bounds.max.y += velocity.y;
	            } else {
	                bounds.min.y += velocity.y;
	            }
	        }
	    };

	    /**
	     * Returns true if the bounds contains the given point.
	     * @method contains
	     * @param {bounds} bounds
	     * @param {vector} point
	     * @return {boolean} True if the bounds contain the point, otherwise false
	     */
	    Bounds.contains = function(bounds, point) {
	        return point.x >= bounds.min.x && point.x <= bounds.max.x 
	               && point.y >= bounds.min.y && point.y <= bounds.max.y;
	    };

	    /**
	     * Returns true if the two bounds intersect.
	     * @method overlaps
	     * @param {bounds} boundsA
	     * @param {bounds} boundsB
	     * @return {boolean} True if the bounds overlap, otherwise false
	     */
	    Bounds.overlaps = function(boundsA, boundsB) {
	        return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
	                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
	    };

	    /**
	     * Translates the bounds by the given vector.
	     * @method translate
	     * @param {bounds} bounds
	     * @param {vector} vector
	     */
	    Bounds.translate = function(bounds, vector) {
	        bounds.min.x += vector.x;
	        bounds.max.x += vector.x;
	        bounds.min.y += vector.y;
	        bounds.max.y += vector.y;
	    };

	    /**
	     * Shifts the bounds to the given position.
	     * @method shift
	     * @param {bounds} bounds
	     * @param {vector} position
	     */
	    Bounds.shift = function(bounds, position) {
	        var deltaX = bounds.max.x - bounds.min.x,
	            deltaY = bounds.max.y - bounds.min.y;
	            
	        bounds.min.x = position.x;
	        bounds.max.x = position.x + deltaX;
	        bounds.min.y = position.y;
	        bounds.max.y = position.y + deltaY;
	    };
	    
	})();

	},{}],25:[function(require,module,exports){
	/**
	* The `Matter.Svg` module contains methods for converting SVG images into an array of vector points.
	*
	* To use this module you also need the SVGPathSeg polyfill: https://github.com/progers/pathseg
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Svg
	*/

	var Svg = {};

	module.exports = Svg;

	var Bounds = require('../geometry/Bounds');

	(function() {

	    /**
	     * Converts an SVG path into an array of vector points.
	     * If the input path forms a concave shape, you must decompose the result into convex parts before use.
	     * See `Bodies.fromVertices` which provides support for this.
	     * Note that this function is not guaranteed to support complex paths (such as those with holes).
	     * @method pathToVertices
	     * @param {SVGPathElement} path
	     * @param {Number} [sampleLength=15]
	     * @return {Vector[]} points
	     */
	    Svg.pathToVertices = function(path, sampleLength) {
	        // https://github.com/wout/svg.topoly.js/blob/master/svg.topoly.js
	        var i, il, total, point, segment, segments, 
	            segmentsQueue, lastSegment, 
	            lastPoint, segmentIndex, points = [],
	            lx, ly, length = 0, x = 0, y = 0;

	        sampleLength = sampleLength || 15;

	        var addPoint = function(px, py, pathSegType) {
	            // all odd-numbered path types are relative except PATHSEG_CLOSEPATH (1)
	            var isRelative = pathSegType % 2 === 1 && pathSegType > 1;

	            // when the last point doesn't equal the current point add the current point
	            if (!lastPoint || px != lastPoint.x || py != lastPoint.y) {
	                if (lastPoint && isRelative) {
	                    lx = lastPoint.x;
	                    ly = lastPoint.y;
	                } else {
	                    lx = 0;
	                    ly = 0;
	                }

	                var point = {
	                    x: lx + px,
	                    y: ly + py
	                };

	                // set last point
	                if (isRelative || !lastPoint) {
	                    lastPoint = point;
	                }

	                points.push(point);

	                x = lx + px;
	                y = ly + py;
	            }
	        };

	        var addSegmentPoint = function(segment) {
	            var segType = segment.pathSegTypeAsLetter.toUpperCase();

	            // skip path ends
	            if (segType === 'Z') 
	                return;

	            // map segment to x and y
	            switch (segType) {

	            case 'M':
	            case 'L':
	            case 'T':
	            case 'C':
	            case 'S':
	            case 'Q':
	                x = segment.x;
	                y = segment.y;
	                break;
	            case 'H':
	                x = segment.x;
	                break;
	            case 'V':
	                y = segment.y;
	                break;
	            }

	            addPoint(x, y, segment.pathSegType);
	        };

	        // ensure path is absolute
	        _svgPathToAbsolute(path);

	        // get total length
	        total = path.getTotalLength();

	        // queue segments
	        segments = [];
	        for (i = 0; i < path.pathSegList.numberOfItems; i += 1)
	            segments.push(path.pathSegList.getItem(i));

	        segmentsQueue = segments.concat();

	        // sample through path
	        while (length < total) {
	            // get segment at position
	            segmentIndex = path.getPathSegAtLength(length);
	            segment = segments[segmentIndex];

	            // new segment
	            if (segment != lastSegment) {
	                while (segmentsQueue.length && segmentsQueue[0] != segment)
	                    addSegmentPoint(segmentsQueue.shift());

	                lastSegment = segment;
	            }

	            // add points in between when curving
	            // TODO: adaptive sampling
	            switch (segment.pathSegTypeAsLetter.toUpperCase()) {

	            case 'C':
	            case 'T':
	            case 'S':
	            case 'Q':
	            case 'A':
	                point = path.getPointAtLength(length);
	                addPoint(point.x, point.y, 0);
	                break;

	            }

	            // increment by sample value
	            length += sampleLength;
	        }

	        // add remaining segments not passed by sampling
	        for (i = 0, il = segmentsQueue.length; i < il; ++i)
	            addSegmentPoint(segmentsQueue[i]);

	        return points;
	    };

	    var _svgPathToAbsolute = function(path) {
	        // http://phrogz.net/convert-svg-path-to-all-absolute-commands
	        var x0, y0, x1, y1, x2, y2, segs = path.pathSegList,
	            x = 0, y = 0, len = segs.numberOfItems;

	        for (var i = 0; i < len; ++i) {
	            var seg = segs.getItem(i),
	                segType = seg.pathSegTypeAsLetter;

	            if (/[MLHVCSQTA]/.test(segType)) {
	                if ('x' in seg) x = seg.x;
	                if ('y' in seg) y = seg.y;
	            } else {
	                if ('x1' in seg) x1 = x + seg.x1;
	                if ('x2' in seg) x2 = x + seg.x2;
	                if ('y1' in seg) y1 = y + seg.y1;
	                if ('y2' in seg) y2 = y + seg.y2;
	                if ('x' in seg) x += seg.x;
	                if ('y' in seg) y += seg.y;

	                switch (segType) {

	                case 'm':
	                    segs.replaceItem(path.createSVGPathSegMovetoAbs(x, y), i);
	                    break;
	                case 'l':
	                    segs.replaceItem(path.createSVGPathSegLinetoAbs(x, y), i);
	                    break;
	                case 'h':
	                    segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x), i);
	                    break;
	                case 'v':
	                    segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y), i);
	                    break;
	                case 'c':
	                    segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2), i);
	                    break;
	                case 's':
	                    segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2), i);
	                    break;
	                case 'q':
	                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1), i);
	                    break;
	                case 't':
	                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y), i);
	                    break;
	                case 'a':
	                    segs.replaceItem(path.createSVGPathSegArcAbs(x, y, seg.r1, seg.r2, seg.angle, seg.largeArcFlag, seg.sweepFlag), i);
	                    break;
	                case 'z':
	                case 'Z':
	                    x = x0;
	                    y = y0;
	                    break;

	                }
	            }

	            if (segType == 'M' || segType == 'm') {
	                x0 = x;
	                y0 = y;
	            }
	        }
	    };

	})();
	},{"../geometry/Bounds":24}],26:[function(require,module,exports){
	/**
	* The `Matter.Vector` module contains methods for creating and manipulating vectors.
	* Vectors are the basis of all the geometry related operations in the engine.
	* A `Matter.Vector` object is of the form `{ x: 0, y: 0 }`.
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Vector
	*/

	// TODO: consider params for reusing vector objects

	var Vector = {};

	module.exports = Vector;

	(function() {

	    /**
	     * Creates a new vector.
	     * @method create
	     * @param {number} x
	     * @param {number} y
	     * @return {vector} A new vector
	     */
	    Vector.create = function(x, y) {
	        return { x: x || 0, y: y || 0 };
	    };

	    /**
	     * Returns a new vector with `x` and `y` copied from the given `vector`.
	     * @method clone
	     * @param {vector} vector
	     * @return {vector} A new cloned vector
	     */
	    Vector.clone = function(vector) {
	        return { x: vector.x, y: vector.y };
	    };

	    /**
	     * Returns the magnitude (length) of a vector.
	     * @method magnitude
	     * @param {vector} vector
	     * @return {number} The magnitude of the vector
	     */
	    Vector.magnitude = function(vector) {
	        return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
	    };

	    /**
	     * Returns the magnitude (length) of a vector (therefore saving a `sqrt` operation).
	     * @method magnitudeSquared
	     * @param {vector} vector
	     * @return {number} The squared magnitude of the vector
	     */
	    Vector.magnitudeSquared = function(vector) {
	        return (vector.x * vector.x) + (vector.y * vector.y);
	    };

	    /**
	     * Rotates the vector about (0, 0) by specified angle.
	     * @method rotate
	     * @param {vector} vector
	     * @param {number} angle
	     * @return {vector} A new vector rotated about (0, 0)
	     */
	    Vector.rotate = function(vector, angle) {
	        var cos = Math.cos(angle), sin = Math.sin(angle);
	        return {
	            x: vector.x * cos - vector.y * sin,
	            y: vector.x * sin + vector.y * cos
	        };
	    };

	    /**
	     * Rotates the vector about a specified point by specified angle.
	     * @method rotateAbout
	     * @param {vector} vector
	     * @param {number} angle
	     * @param {vector} point
	     * @param {vector} [output]
	     * @return {vector} A new vector rotated about the point
	     */
	    Vector.rotateAbout = function(vector, angle, point, output) {
	        var cos = Math.cos(angle), sin = Math.sin(angle);
	        if (!output) output = {};
	        var x = point.x + ((vector.x - point.x) * cos - (vector.y - point.y) * sin);
	        output.y = point.y + ((vector.x - point.x) * sin + (vector.y - point.y) * cos);
	        output.x = x;
	        return output;
	    };

	    /**
	     * Normalises a vector (such that its magnitude is `1`).
	     * @method normalise
	     * @param {vector} vector
	     * @return {vector} A new vector normalised
	     */
	    Vector.normalise = function(vector) {
	        var magnitude = Vector.magnitude(vector);
	        if (magnitude === 0)
	            return { x: 0, y: 0 };
	        return { x: vector.x / magnitude, y: vector.y / magnitude };
	    };

	    /**
	     * Returns the dot-product of two vectors.
	     * @method dot
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @return {number} The dot product of the two vectors
	     */
	    Vector.dot = function(vectorA, vectorB) {
	        return (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y);
	    };

	    /**
	     * Returns the cross-product of two vectors.
	     * @method cross
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @return {number} The cross product of the two vectors
	     */
	    Vector.cross = function(vectorA, vectorB) {
	        return (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
	    };

	    /**
	     * Returns the cross-product of three vectors.
	     * @method cross3
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @param {vector} vectorC
	     * @return {number} The cross product of the three vectors
	     */
	    Vector.cross3 = function(vectorA, vectorB, vectorC) {
	        return (vectorB.x - vectorA.x) * (vectorC.y - vectorA.y) - (vectorB.y - vectorA.y) * (vectorC.x - vectorA.x);
	    };

	    /**
	     * Adds the two vectors.
	     * @method add
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @param {vector} [output]
	     * @return {vector} A new vector of vectorA and vectorB added
	     */
	    Vector.add = function(vectorA, vectorB, output) {
	        if (!output) output = {};
	        output.x = vectorA.x + vectorB.x;
	        output.y = vectorA.y + vectorB.y;
	        return output;
	    };

	    /**
	     * Subtracts the two vectors.
	     * @method sub
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @param {vector} [output]
	     * @return {vector} A new vector of vectorA and vectorB subtracted
	     */
	    Vector.sub = function(vectorA, vectorB, output) {
	        if (!output) output = {};
	        output.x = vectorA.x - vectorB.x;
	        output.y = vectorA.y - vectorB.y;
	        return output;
	    };

	    /**
	     * Multiplies a vector and a scalar.
	     * @method mult
	     * @param {vector} vector
	     * @param {number} scalar
	     * @return {vector} A new vector multiplied by scalar
	     */
	    Vector.mult = function(vector, scalar) {
	        return { x: vector.x * scalar, y: vector.y * scalar };
	    };

	    /**
	     * Divides a vector and a scalar.
	     * @method div
	     * @param {vector} vector
	     * @param {number} scalar
	     * @return {vector} A new vector divided by scalar
	     */
	    Vector.div = function(vector, scalar) {
	        return { x: vector.x / scalar, y: vector.y / scalar };
	    };

	    /**
	     * Returns the perpendicular vector. Set `negate` to true for the perpendicular in the opposite direction.
	     * @method perp
	     * @param {vector} vector
	     * @param {bool} [negate=false]
	     * @return {vector} The perpendicular vector
	     */
	    Vector.perp = function(vector, negate) {
	        negate = negate === true ? -1 : 1;
	        return { x: negate * -vector.y, y: negate * vector.x };
	    };

	    /**
	     * Negates both components of a vector such that it points in the opposite direction.
	     * @method neg
	     * @param {vector} vector
	     * @return {vector} The negated vector
	     */
	    Vector.neg = function(vector) {
	        return { x: -vector.x, y: -vector.y };
	    };

	    /**
	     * Returns the angle in radians between the two vectors relative to the x-axis.
	     * @method angle
	     * @param {vector} vectorA
	     * @param {vector} vectorB
	     * @return {number} The angle in radians
	     */
	    Vector.angle = function(vectorA, vectorB) {
	        return Math.atan2(vectorB.y - vectorA.y, vectorB.x - vectorA.x);
	    };

	    /**
	     * Temporary vector pool (not thread-safe).
	     * @property _temp
	     * @type {vector[]}
	     * @private
	     */
	    Vector._temp = [Vector.create(), Vector.create(), 
	                    Vector.create(), Vector.create(), 
	                    Vector.create(), Vector.create()];

	})();
	},{}],27:[function(require,module,exports){
	/**
	* The `Matter.Vertices` module contains methods for creating and manipulating sets of vertices.
	* A set of vertices is an array of `Matter.Vector` with additional indexing properties inserted by `Vertices.create`.
	* A `Matter.Body` maintains a set of vertices to represent the shape of the object (its convex hull).
	*
	* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
	*
	* @class Vertices
	*/

	var Vertices = {};

	module.exports = Vertices;

	var Vector = require('../geometry/Vector');
	var Common = require('../core/Common');

	(function() {

	    /**
	     * Creates a new set of `Matter.Body` compatible vertices.
	     * The `points` argument accepts an array of `Matter.Vector` points orientated around the origin `(0, 0)`, for example:
	     *
	     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
	     *
	     * The `Vertices.create` method returns a new array of vertices, which are similar to Matter.Vector objects,
	     * but with some additional references required for efficient collision detection routines.
	     *
	     * Note that the `body` argument is not optional, a `Matter.Body` reference must be provided.
	     *
	     * @method create
	     * @param {vector[]} points
	     * @param {body} body
	     */
	    Vertices.create = function(points, body) {
	        var vertices = [];

	        for (var i = 0; i < points.length; i++) {
	            var point = points[i],
	                vertex = {
	                    x: point.x,
	                    y: point.y,
	                    index: i,
	                    body: body,
	                    isInternal: false
	                };

	            vertices.push(vertex);
	        }

	        return vertices;
	    };

	    /**
	     * Parses a string containing ordered x y pairs separated by spaces (and optionally commas), 
	     * into a `Matter.Vertices` object for the given `Matter.Body`.
	     * For parsing SVG paths, see `Svg.pathToVertices`.
	     * @method fromPath
	     * @param {string} path
	     * @param {body} body
	     * @return {vertices} vertices
	     */
	    Vertices.fromPath = function(path, body) {
	        var pathPattern = /L?\s*([\-\d\.e]+)[\s,]*([\-\d\.e]+)*/ig,
	            points = [];

	        path.replace(pathPattern, function(match, x, y) {
	            points.push({ x: parseFloat(x), y: parseFloat(y) });
	        });

	        return Vertices.create(points, body);
	    };

	    /**
	     * Returns the centre (centroid) of the set of vertices.
	     * @method centre
	     * @param {vertices} vertices
	     * @return {vector} The centre point
	     */
	    Vertices.centre = function(vertices) {
	        var area = Vertices.area(vertices, true),
	            centre = { x: 0, y: 0 },
	            cross,
	            temp,
	            j;

	        for (var i = 0; i < vertices.length; i++) {
	            j = (i + 1) % vertices.length;
	            cross = Vector.cross(vertices[i], vertices[j]);
	            temp = Vector.mult(Vector.add(vertices[i], vertices[j]), cross);
	            centre = Vector.add(centre, temp);
	        }

	        return Vector.div(centre, 6 * area);
	    };

	    /**
	     * Returns the average (mean) of the set of vertices.
	     * @method mean
	     * @param {vertices} vertices
	     * @return {vector} The average point
	     */
	    Vertices.mean = function(vertices) {
	        var average = { x: 0, y: 0 };

	        for (var i = 0; i < vertices.length; i++) {
	            average.x += vertices[i].x;
	            average.y += vertices[i].y;
	        }

	        return Vector.div(average, vertices.length);
	    };

	    /**
	     * Returns the area of the set of vertices.
	     * @method area
	     * @param {vertices} vertices
	     * @param {bool} signed
	     * @return {number} The area
	     */
	    Vertices.area = function(vertices, signed) {
	        var area = 0,
	            j = vertices.length - 1;

	        for (var i = 0; i < vertices.length; i++) {
	            area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
	            j = i;
	        }

	        if (signed)
	            return area / 2;

	        return Math.abs(area) / 2;
	    };

	    /**
	     * Returns the moment of inertia (second moment of area) of the set of vertices given the total mass.
	     * @method inertia
	     * @param {vertices} vertices
	     * @param {number} mass
	     * @return {number} The polygon's moment of inertia
	     */
	    Vertices.inertia = function(vertices, mass) {
	        var numerator = 0,
	            denominator = 0,
	            v = vertices,
	            cross,
	            j;

	        // find the polygon's moment of inertia, using second moment of area
	        // http://www.physicsforums.com/showthread.php?t=25293
	        for (var n = 0; n < v.length; n++) {
	            j = (n + 1) % v.length;
	            cross = Math.abs(Vector.cross(v[j], v[n]));
	            numerator += cross * (Vector.dot(v[j], v[j]) + Vector.dot(v[j], v[n]) + Vector.dot(v[n], v[n]));
	            denominator += cross;
	        }

	        return (mass / 6) * (numerator / denominator);
	    };

	    /**
	     * Translates the set of vertices in-place.
	     * @method translate
	     * @param {vertices} vertices
	     * @param {vector} vector
	     * @param {number} scalar
	     */
	    Vertices.translate = function(vertices, vector, scalar) {
	        var i;
	        if (scalar) {
	            for (i = 0; i < vertices.length; i++) {
	                vertices[i].x += vector.x * scalar;
	                vertices[i].y += vector.y * scalar;
	            }
	        } else {
	            for (i = 0; i < vertices.length; i++) {
	                vertices[i].x += vector.x;
	                vertices[i].y += vector.y;
	            }
	        }

	        return vertices;
	    };

	    /**
	     * Rotates the set of vertices in-place.
	     * @method rotate
	     * @param {vertices} vertices
	     * @param {number} angle
	     * @param {vector} point
	     */
	    Vertices.rotate = function(vertices, angle, point) {
	        if (angle === 0)
	            return;

	        var cos = Math.cos(angle),
	            sin = Math.sin(angle);

	        for (var i = 0; i < vertices.length; i++) {
	            var vertice = vertices[i],
	                dx = vertice.x - point.x,
	                dy = vertice.y - point.y;
	                
	            vertice.x = point.x + (dx * cos - dy * sin);
	            vertice.y = point.y + (dx * sin + dy * cos);
	        }

	        return vertices;
	    };

	    /**
	     * Returns `true` if the `point` is inside the set of `vertices`.
	     * @method contains
	     * @param {vertices} vertices
	     * @param {vector} point
	     * @return {boolean} True if the vertices contains point, otherwise false
	     */
	    Vertices.contains = function(vertices, point) {
	        for (var i = 0; i < vertices.length; i++) {
	            var vertice = vertices[i],
	                nextVertice = vertices[(i + 1) % vertices.length];
	            if ((point.x - vertice.x) * (nextVertice.y - vertice.y) + (point.y - vertice.y) * (vertice.x - nextVertice.x) > 0) {
	                return false;
	            }
	        }

	        return true;
	    };

	    /**
	     * Scales the vertices from a point (default is centre) in-place.
	     * @method scale
	     * @param {vertices} vertices
	     * @param {number} scaleX
	     * @param {number} scaleY
	     * @param {vector} point
	     */
	    Vertices.scale = function(vertices, scaleX, scaleY, point) {
	        if (scaleX === 1 && scaleY === 1)
	            return vertices;

	        point = point || Vertices.centre(vertices);

	        var vertex,
	            delta;

	        for (var i = 0; i < vertices.length; i++) {
	            vertex = vertices[i];
	            delta = Vector.sub(vertex, point);
	            vertices[i].x = point.x + delta.x * scaleX;
	            vertices[i].y = point.y + delta.y * scaleY;
	        }

	        return vertices;
	    };

	    /**
	     * Chamfers a set of vertices by giving them rounded corners, returns a new set of vertices.
	     * The radius parameter is a single number or an array to specify the radius for each vertex.
	     * @method chamfer
	     * @param {vertices} vertices
	     * @param {number[]} radius
	     * @param {number} quality
	     * @param {number} qualityMin
	     * @param {number} qualityMax
	     */
	    Vertices.chamfer = function(vertices, radius, quality, qualityMin, qualityMax) {
	        radius = radius || [8];

	        if (!radius.length)
	            radius = [radius];

	        // quality defaults to -1, which is auto
	        quality = (typeof quality !== 'undefined') ? quality : -1;
	        qualityMin = qualityMin || 2;
	        qualityMax = qualityMax || 14;

	        var newVertices = [];

	        for (var i = 0; i < vertices.length; i++) {
	            var prevVertex = vertices[i - 1 >= 0 ? i - 1 : vertices.length - 1],
	                vertex = vertices[i],
	                nextVertex = vertices[(i + 1) % vertices.length],
	                currentRadius = radius[i < radius.length ? i : radius.length - 1];

	            if (currentRadius === 0) {
	                newVertices.push(vertex);
	                continue;
	            }

	            var prevNormal = Vector.normalise({ 
	                x: vertex.y - prevVertex.y, 
	                y: prevVertex.x - vertex.x
	            });

	            var nextNormal = Vector.normalise({ 
	                x: nextVertex.y - vertex.y, 
	                y: vertex.x - nextVertex.x
	            });

	            var diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2)),
	                radiusVector = Vector.mult(Common.clone(prevNormal), currentRadius),
	                midNormal = Vector.normalise(Vector.mult(Vector.add(prevNormal, nextNormal), 0.5)),
	                scaledVertex = Vector.sub(vertex, Vector.mult(midNormal, diagonalRadius));

	            var precision = quality;

	            if (quality === -1) {
	                // automatically decide precision
	                precision = Math.pow(currentRadius, 0.32) * 1.75;
	            }

	            precision = Common.clamp(precision, qualityMin, qualityMax);

	            // use an even value for precision, more likely to reduce axes by using symmetry
	            if (precision % 2 === 1)
	                precision += 1;

	            var alpha = Math.acos(Vector.dot(prevNormal, nextNormal)),
	                theta = alpha / precision;

	            for (var j = 0; j < precision; j++) {
	                newVertices.push(Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex));
	            }
	        }

	        return newVertices;
	    };

	    /**
	     * Sorts the input vertices into clockwise order in place.
	     * @method clockwiseSort
	     * @param {vertices} vertices
	     * @return {vertices} vertices
	     */
	    Vertices.clockwiseSort = function(vertices) {
	        var centre = Vertices.mean(vertices);

	        vertices.sort(function(vertexA, vertexB) {
	            return Vector.angle(centre, vertexA) - Vector.angle(centre, vertexB);
	        });

	        return vertices;
	    };

	    /**
	     * Returns true if the vertices form a convex shape (vertices must be in clockwise order).
	     * @method isConvex
	     * @param {vertices} vertices
	     * @return {bool} `true` if the `vertices` are convex, `false` if not (or `null` if not computable).
	     */
	    Vertices.isConvex = function(vertices) {
	        // http://paulbourke.net/geometry/polygonmesh/

	        var flag = 0,
	            n = vertices.length,
	            i,
	            j,
	            k,
	            z;

	        if (n < 3)
	            return null;

	        for (i = 0; i < n; i++) {
	            j = (i + 1) % n;
	            k = (i + 2) % n;
	            z = (vertices[j].x - vertices[i].x) * (vertices[k].y - vertices[j].y);
	            z -= (vertices[j].y - vertices[i].y) * (vertices[k].x - vertices[j].x);

	            if (z < 0) {
	                flag |= 1;
	            } else if (z > 0) {
	                flag |= 2;
	            }

	            if (flag === 3) {
	                return false;
	            }
	        }

	        if (flag !== 0){
	            return true;
	        } else {
	            return null;
	        }
	    };

	    /**
	     * Returns the convex hull of the input vertices as a new array of points.
	     * @method hull
	     * @param {vertices} vertices
	     * @return [vertex] vertices
	     */
	    Vertices.hull = function(vertices) {
	        // http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain

	        var upper = [],
	            lower = [], 
	            vertex,
	            i;

	        // sort vertices on x-axis (y-axis for ties)
	        vertices = vertices.slice(0);
	        vertices.sort(function(vertexA, vertexB) {
	            var dx = vertexA.x - vertexB.x;
	            return dx !== 0 ? dx : vertexA.y - vertexB.y;
	        });

	        // build lower hull
	        for (i = 0; i < vertices.length; i++) {
	            vertex = vertices[i];

	            while (lower.length >= 2 
	                   && Vector.cross3(lower[lower.length - 2], lower[lower.length - 1], vertex) <= 0) {
	                lower.pop();
	            }

	            lower.push(vertex);
	        }

	        // build upper hull
	        for (i = vertices.length - 1; i >= 0; i--) {
	            vertex = vertices[i];

	            while (upper.length >= 2 
	                   && Vector.cross3(upper[upper.length - 2], upper[upper.length - 1], vertex) <= 0) {
	                upper.pop();
	            }

	            upper.push(vertex);
	        }

	        // concatenation of the lower and upper hulls gives the convex hull
	        // omit last points because they are repeated at the beginning of the other list
	        upper.pop();
	        lower.pop();

	        return upper.concat(lower);
	    };

	})();

	},{"../core/Common":14,"../geometry/Vector":26}],28:[function(require,module,exports){
	var Matter = module.exports = {};
	Matter.version = 'master';

	Matter.Body = require('../body/Body');
	Matter.Composite = require('../body/Composite');
	Matter.World = require('../body/World');

	Matter.Contact = require('../collision/Contact');
	Matter.Detector = require('../collision/Detector');
	Matter.Grid = require('../collision/Grid');
	Matter.Pairs = require('../collision/Pairs');
	Matter.Pair = require('../collision/Pair');
	Matter.Query = require('../collision/Query');
	Matter.Resolver = require('../collision/Resolver');
	Matter.SAT = require('../collision/SAT');

	Matter.Constraint = require('../constraint/Constraint');
	Matter.MouseConstraint = require('../constraint/MouseConstraint');

	Matter.Common = require('../core/Common');
	Matter.Engine = require('../core/Engine');
	Matter.Events = require('../core/Events');
	Matter.Mouse = require('../core/Mouse');
	Matter.Runner = require('../core/Runner');
	Matter.Sleeping = require('../core/Sleeping');


	Matter.Bodies = require('../factory/Bodies');
	Matter.Composites = require('../factory/Composites');

	Matter.Axes = require('../geometry/Axes');
	Matter.Bounds = require('../geometry/Bounds');
	Matter.Svg = require('../geometry/Svg');
	Matter.Vector = require('../geometry/Vector');
	Matter.Vertices = require('../geometry/Vertices');

	Matter.Render = require('../render/Render');
	Matter.RenderPixi = require('../render/RenderPixi');

	// aliases

	Matter.World.add = Matter.Composite.add;
	Matter.World.remove = Matter.Composite.remove;
	Matter.World.addComposite = Matter.Composite.addComposite;
	Matter.World.addBody = Matter.Composite.addBody;
	Matter.World.addConstraint = Matter.Composite.addConstraint;
	Matter.World.clear = Matter.Composite.clear;
	Matter.Engine.run = Matter.Runner.run;

	},{"../body/Body":1,"../body/Composite":2,"../body/World":3,"../collision/Contact":4,"../collision/Detector":5,"../collision/Grid":6,"../collision/Pair":7,"../collision/Pairs":8,"../collision/Query":9,"../collision/Resolver":10,"../collision/SAT":11,"../constraint/Constraint":12,"../constraint/MouseConstraint":13,"../core/Common":14,"../core/Engine":15,"../core/Events":16,"../core/Metrics":17,"../core/Mouse":18,"../core/Runner":19,"../core/Sleeping":20,"../factory/Bodies":21,"../factory/Composites":22,"../geometry/Axes":23,"../geometry/Bounds":24,"../geometry/Svg":25,"../geometry/Vector":26,"../geometry/Vertices":27,"../render/Render":29,"../render/RenderPixi":30}],29:[function(require,module,exports){
	/**
	* The `Matter.Render` module is a simple HTML5 canvas based renderer for visualising instances of `Matter.Engine`.
	* It is intended for development and debugging purposes, but may also be suitable for simple games.
	* It includes a number of drawing options including wireframe, vector with support for sprites and viewports.
	*
	* @class Render
	*/

	var Render = {};

	module.exports = Render;

	var Common = require('../core/Common');
	var Composite = require('../body/Composite');
	var Bounds = require('../geometry/Bounds');
	var Events = require('../core/Events');
	var Grid = require('../collision/Grid');
	var Vector = require('../geometry/Vector');

	(function() {
	    
	    var _requestAnimationFrame,
	        _cancelAnimationFrame;

	    if (typeof window !== 'undefined') {
	        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
	                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
	                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
	   
	        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
	                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
	    }

	    /**
	     * Creates a new renderer. The options parameter is an object that specifies any properties you wish to override the defaults.
	     * All properties have default values, and many are pre-calculated automatically based on other properties.
	     * See the properties section below for detailed information on what you can pass via the `options` object.
	     * @method create
	     * @param {object} [options]
	     * @return {render} A new renderer
	     */
	    Render.create = function(options) {
	        var defaults = {
	            controller: Render,
	            engine: null,
	            element: null,
	            canvas: null,
	            mouse: null,
	            frameRequestId: null,
	            options: {
	                width: 800,
	                height: 600,
	                pixelRatio: 1,
	                background: '#fafafa',
	                wireframeBackground: '#222',
	                hasBounds: !!options.bounds,
	                enabled: true,
	                wireframes: true,
	                showSleeping: true,
	                showDebug: false,
	                showBroadphase: false,
	                showBounds: false,
	                showVelocity: false,
	                showCollisions: false,
	                showSeparations: false,
	                showAxes: false,
	                showPositions: false,
	                showAngleIndicator: false,
	                showIds: false,
	                showShadows: false,
	                showVertexNumbers: false,
	                showConvexHulls: false,
	                showInternalEdges: false,
	                showMousePosition: false
	            }
	        };

	        var render = Common.extend(defaults, options);

	        if (render.canvas) {
	            render.canvas.width = render.options.width || render.canvas.width;
	            render.canvas.height = render.options.height || render.canvas.height;
	        }

	        render.mouse = options.mouse;
	        render.engine = options.engine;
	        render.canvas = render.canvas || _createCanvas(render.options.width, render.options.height);
	        render.context = render.canvas.getContext('2d');
	        render.textures = {};

	        render.bounds = render.bounds || { 
	            min: { 
	                x: 0,
	                y: 0
	            }, 
	            max: { 
	                x: render.canvas.width,
	                y: render.canvas.height
	            }
	        };

	        if (render.options.pixelRatio !== 1) {
	            Render.setPixelRatio(render, render.options.pixelRatio);
	        }

	        if (Common.isElement(render.element)) {
	            render.element.appendChild(render.canvas);
	        } else {
	            Common.log('Render.create: options.element was undefined, render.canvas was created but not appended', 'warn');
	        }

	        return render;
	    };

	    /**
	     * Continuously updates the render canvas on the `requestAnimationFrame` event.
	     * @method run
	     * @param {render} render
	     */
	    Render.run = function(render) {
	        (function loop(time){
	            render.frameRequestId = _requestAnimationFrame(loop);
	            Render.world(render);
	        })();
	    };

	    /**
	     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
	     * @method stop
	     * @param {render} render
	     */
	    Render.stop = function(render) {
	        _cancelAnimationFrame(render.frameRequestId);
	    };

	    /**
	     * Sets the pixel ratio of the renderer and updates the canvas.
	     * To automatically detect the correct ratio, pass the string `'auto'` for `pixelRatio`.
	     * @method setPixelRatio
	     * @param {render} render
	     * @param {number} pixelRatio
	     */
	    Render.setPixelRatio = function(render, pixelRatio) {
	        var options = render.options,
	            canvas = render.canvas;

	        if (pixelRatio === 'auto') {
	            pixelRatio = _getPixelRatio(canvas);
	        }

	        options.pixelRatio = pixelRatio;
	        canvas.setAttribute('data-pixel-ratio', pixelRatio);
	        canvas.width = options.width * pixelRatio;
	        canvas.height = options.height * pixelRatio;
	        canvas.style.width = options.width + 'px';
	        canvas.style.height = options.height + 'px';
	        render.context.scale(pixelRatio, pixelRatio);
	    };

	    /**
	     * Renders the given `engine`'s `Matter.World` object.
	     * This is the entry point for all rendering and should be called every time the scene changes.
	     * @method world
	     * @param {render} render
	     */
	    Render.world = function(render) {
	        var engine = render.engine,
	            world = engine.world,
	            canvas = render.canvas,
	            context = render.context,
	            options = render.options,
	            allBodies = Composite.allBodies(world),
	            allConstraints = Composite.allConstraints(world),
	            background = options.wireframes ? options.wireframeBackground : options.background,
	            bodies = [],
	            constraints = [],
	            i;

	        var event = {
	            timestamp: engine.timing.timestamp
	        };

	        Events.trigger(render, 'beforeRender', event);

	        // apply background if it has changed
	        if (render.currentBackground !== background)
	            _applyBackground(render, background);

	        // clear the canvas with a transparent fill, to allow the canvas background to show
	        context.globalCompositeOperation = 'source-in';
	        context.fillStyle = "transparent";
	        context.fillRect(0, 0, canvas.width, canvas.height);
	        context.globalCompositeOperation = 'source-over';

	        // handle bounds
	        if (options.hasBounds) {
	            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
	                boundsHeight = render.bounds.max.y - render.bounds.min.y,
	                boundsScaleX = boundsWidth / options.width,
	                boundsScaleY = boundsHeight / options.height;

	            // filter out bodies that are not in view
	            for (i = 0; i < allBodies.length; i++) {
	                var body = allBodies[i];
	                if (Bounds.overlaps(body.bounds, render.bounds))
	                    bodies.push(body);
	            }

	            // filter out constraints that are not in view
	            for (i = 0; i < allConstraints.length; i++) {
	                var constraint = allConstraints[i],
	                    bodyA = constraint.bodyA,
	                    bodyB = constraint.bodyB,
	                    pointAWorld = constraint.pointA,
	                    pointBWorld = constraint.pointB;

	                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
	                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

	                if (!pointAWorld || !pointBWorld)
	                    continue;

	                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
	                    constraints.push(constraint);
	            }

	            // transform the view
	            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
	            context.translate(-render.bounds.min.x, -render.bounds.min.y);
	        } else {
	            constraints = allConstraints;
	            bodies = allBodies;
	        }

	        if (!options.wireframes || (engine.enableSleeping && options.showSleeping)) {
	            // fully featured rendering of bodies
	            Render.bodies(render, bodies, context);
	        } else {
	            if (options.showConvexHulls)
	                Render.bodyConvexHulls(render, bodies, context);

	            // optimised method for wireframes only
	            Render.bodyWireframes(render, bodies, context);
	        }

	        if (options.showBounds)
	            Render.bodyBounds(render, bodies, context);

	        if (options.showAxes || options.showAngleIndicator)
	            Render.bodyAxes(render, bodies, context);
	        
	        if (options.showPositions)
	            Render.bodyPositions(render, bodies, context);

	        if (options.showVelocity)
	            Render.bodyVelocity(render, bodies, context);

	        if (options.showIds)
	            Render.bodyIds(render, bodies, context);

	        if (options.showSeparations)
	            Render.separations(render, engine.pairs.list, context);

	        if (options.showCollisions)
	            Render.collisions(render, engine.pairs.list, context);

	        if (options.showVertexNumbers)
	            Render.vertexNumbers(render, bodies, context);

	        if (options.showMousePosition)
	            Render.mousePosition(render, render.mouse, context);

	        Render.constraints(constraints, context);

	        if (options.showBroadphase && engine.broadphase.controller === Grid)
	            Render.grid(render, engine.broadphase, context);

	        if (options.showDebug)
	            Render.debug(render, context);

	        if (options.hasBounds) {
	            // revert view transforms
	            context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0);
	        }

	        Events.trigger(render, 'afterRender', event);
	    };

	    /**
	     * Description
	     * @private
	     * @method debug
	     * @param {render} render
	     * @param {RenderingContext} context
	     */
	    Render.debug = function(render, context) {
	        var c = context,
	            engine = render.engine,
	            world = engine.world,
	            metrics = engine.metrics,
	            options = render.options,
	            bodies = Composite.allBodies(world),
	            space = "    ";

	        if (engine.timing.timestamp - (render.debugTimestamp || 0) >= 500) {
	            var text = "";

	            if (metrics.timing) {
	                text += "fps: " + Math.round(metrics.timing.fps) + space;
	            }


	            render.debugString = text;
	            render.debugTimestamp = engine.timing.timestamp;
	        }

	        if (render.debugString) {
	            c.font = "12px Arial";

	            if (options.wireframes) {
	                c.fillStyle = 'rgba(255,255,255,0.5)';
	            } else {
	                c.fillStyle = 'rgba(0,0,0,0.5)';
	            }

	            var split = render.debugString.split('\n');

	            for (var i = 0; i < split.length; i++) {
	                c.fillText(split[i], 50, 50 + i * 18);
	            }
	        }
	    };

	    /**
	     * Description
	     * @private
	     * @method constraints
	     * @param {constraint[]} constraints
	     * @param {RenderingContext} context
	     */
	    Render.constraints = function(constraints, context) {
	        var c = context;

	        for (var i = 0; i < constraints.length; i++) {
	            var constraint = constraints[i];

	            if (!constraint.render.visible || !constraint.pointA || !constraint.pointB)
	                continue;

	            var bodyA = constraint.bodyA,
	                bodyB = constraint.bodyB;

	            if (bodyA) {
	                c.beginPath();
	                c.moveTo(bodyA.position.x + constraint.pointA.x, bodyA.position.y + constraint.pointA.y);
	            } else {
	                c.beginPath();
	                c.moveTo(constraint.pointA.x, constraint.pointA.y);
	            }

	            if (bodyB) {
	                c.lineTo(bodyB.position.x + constraint.pointB.x, bodyB.position.y + constraint.pointB.y);
	            } else {
	                c.lineTo(constraint.pointB.x, constraint.pointB.y);
	            }

	            c.lineWidth = constraint.render.lineWidth;
	            c.strokeStyle = constraint.render.strokeStyle;
	            c.stroke();
	        }
	    };
	    
	    /**
	     * Description
	     * @private
	     * @method bodyShadows
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyShadows = function(render, bodies, context) {
	        var c = context,
	            engine = render.engine;

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (!body.render.visible)
	                continue;

	            if (body.circleRadius) {
	                c.beginPath();
	                c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
	                c.closePath();
	            } else {
	                c.beginPath();
	                c.moveTo(body.vertices[0].x, body.vertices[0].y);
	                for (var j = 1; j < body.vertices.length; j++) {
	                    c.lineTo(body.vertices[j].x, body.vertices[j].y);
	                }
	                c.closePath();
	            }

	            var distanceX = body.position.x - render.options.width * 0.5,
	                distanceY = body.position.y - render.options.height * 0.2,
	                distance = Math.abs(distanceX) + Math.abs(distanceY);

	            c.shadowColor = 'rgba(0,0,0,0.15)';
	            c.shadowOffsetX = 0.05 * distanceX;
	            c.shadowOffsetY = 0.05 * distanceY;
	            c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

	            c.fill();

	            c.shadowColor = null;
	            c.shadowOffsetX = null;
	            c.shadowOffsetY = null;
	            c.shadowBlur = null;
	        }
	    };

	    /**
	     * Description
	     * @private
	     * @method bodies
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodies = function(render, bodies, context) {
	        var c = context,
	            engine = render.engine,
	            options = render.options,
	            showInternalEdges = options.showInternalEdges || !options.wireframes,
	            body,
	            part,
	            i,
	            k;

	        for (i = 0; i < bodies.length; i++) {
	            body = bodies[i];

	            if (!body.render.visible)
	                continue;

	            // handle compound parts
	            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
	                part = body.parts[k];

	                if (!part.render.visible)
	                    continue;

	                if (options.showSleeping && body.isSleeping) {
	                    c.globalAlpha = 0.5 * part.render.opacity;
	                } else if (part.render.opacity !== 1) {
	                    c.globalAlpha = part.render.opacity;
	                }

	                if (part.render.sprite && part.render.sprite.texture && !options.wireframes) {
	                    // part sprite
	                    var sprite = part.render.sprite,
	                        texture = _getTexture(render, sprite.texture);

	                    c.translate(part.position.x, part.position.y); 
	                    c.rotate(part.angle);

	                    c.drawImage(
	                        texture,
	                        texture.width * -sprite.xOffset * sprite.xScale, 
	                        texture.height * -sprite.yOffset * sprite.yScale, 
	                        texture.width * sprite.xScale, 
	                        texture.height * sprite.yScale
	                    );

	                    // revert translation, hopefully faster than save / restore
	                    c.rotate(-part.angle);
	                    c.translate(-part.position.x, -part.position.y); 
	                } else {
	                    // part polygon
	                    if (part.circleRadius) {
	                        c.beginPath();
	                        c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
	                    } else {
	                        c.beginPath();
	                        c.moveTo(part.vertices[0].x, part.vertices[0].y);

	                        for (var j = 1; j < part.vertices.length; j++) {
	                            if (!part.vertices[j - 1].isInternal || showInternalEdges) {
	                                c.lineTo(part.vertices[j].x, part.vertices[j].y);
	                            } else {
	                                c.moveTo(part.vertices[j].x, part.vertices[j].y);
	                            }

	                            if (part.vertices[j].isInternal && !showInternalEdges) {
	                                c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
	                            }
	                        }
	                        
	                        c.lineTo(part.vertices[0].x, part.vertices[0].y);
	                        c.closePath();
	                    }

	                    if (!options.wireframes) {
	                        c.fillStyle = part.render.fillStyle;
	                        c.lineWidth = part.render.lineWidth;
	                        c.strokeStyle = part.render.strokeStyle;
	                        c.fill();
	                    } else {
	                        c.lineWidth = 1;
	                        c.strokeStyle = '#bbb';
	                    }

	                    c.stroke();
	                }

	                c.globalAlpha = 1;
	            }
	        }
	    };

	    /**
	     * Optimised method for drawing body wireframes in one pass
	     * @private
	     * @method bodyWireframes
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyWireframes = function(render, bodies, context) {
	        var c = context,
	            showInternalEdges = render.options.showInternalEdges,
	            body,
	            part,
	            i,
	            j,
	            k;

	        c.beginPath();

	        // render all bodies
	        for (i = 0; i < bodies.length; i++) {
	            body = bodies[i];

	            if (!body.render.visible)
	                continue;

	            // handle compound parts
	            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
	                part = body.parts[k];

	                c.moveTo(part.vertices[0].x, part.vertices[0].y);

	                for (j = 1; j < part.vertices.length; j++) {
	                    if (!part.vertices[j - 1].isInternal || showInternalEdges) {
	                        c.lineTo(part.vertices[j].x, part.vertices[j].y);
	                    } else {
	                        c.moveTo(part.vertices[j].x, part.vertices[j].y);
	                    }

	                    if (part.vertices[j].isInternal && !showInternalEdges) {
	                        c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
	                    }
	                }
	                
	                c.lineTo(part.vertices[0].x, part.vertices[0].y);
	            }
	        }

	        c.lineWidth = 1;
	        c.strokeStyle = '#bbb';
	        c.stroke();
	    };

	    /**
	     * Optimised method for drawing body convex hull wireframes in one pass
	     * @private
	     * @method bodyConvexHulls
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyConvexHulls = function(render, bodies, context) {
	        var c = context,
	            body,
	            i,
	            j;

	        c.beginPath();

	        // render convex hulls
	        for (i = 0; i < bodies.length; i++) {
	            body = bodies[i];

	            if (!body.render.visible || body.parts.length === 1)
	                continue;

	            c.moveTo(body.vertices[0].x, body.vertices[0].y);

	            for (j = 1; j < body.vertices.length; j++) {
	                c.lineTo(body.vertices[j].x, body.vertices[j].y);
	            }
	            
	            c.lineTo(body.vertices[0].x, body.vertices[0].y);
	        }

	        c.lineWidth = 1;
	        c.strokeStyle = 'rgba(255,255,255,0.2)';
	        c.stroke();
	    };

	    /**
	     * Renders body vertex numbers.
	     * @private
	     * @method vertexNumbers
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.vertexNumbers = function(render, bodies, context) {
	        var c = context,
	            i,
	            j,
	            k;

	        for (i = 0; i < bodies.length; i++) {
	            var parts = bodies[i].parts;
	            for (k = parts.length > 1 ? 1 : 0; k < parts.length; k++) {
	                var part = parts[k];
	                for (j = 0; j < part.vertices.length; j++) {
	                    c.fillStyle = 'rgba(255,255,255,0.2)';
	                    c.fillText(i + '_' + j, part.position.x + (part.vertices[j].x - part.position.x) * 0.8, part.position.y + (part.vertices[j].y - part.position.y) * 0.8);
	                }
	            }
	        }
	    };

	    /**
	     * Renders mouse position.
	     * @private
	     * @method mousePosition
	     * @param {render} render
	     * @param {mouse} mouse
	     * @param {RenderingContext} context
	     */
	    Render.mousePosition = function(render, mouse, context) {
	        var c = context;
	        c.fillStyle = 'rgba(255,255,255,0.8)';
	        c.fillText(mouse.position.x + '  ' + mouse.position.y, mouse.position.x + 5, mouse.position.y - 5);
	    };

	    /**
	     * Draws body bounds
	     * @private
	     * @method bodyBounds
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyBounds = function(render, bodies, context) {
	        var c = context,
	            engine = render.engine,
	            options = render.options;

	        c.beginPath();

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (body.render.visible) {
	                var parts = bodies[i].parts;
	                for (var j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
	                    var part = parts[j];
	                    c.rect(part.bounds.min.x, part.bounds.min.y, part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y);
	                }
	            }
	        }

	        if (options.wireframes) {
	            c.strokeStyle = 'rgba(255,255,255,0.08)';
	        } else {
	            c.strokeStyle = 'rgba(0,0,0,0.1)';
	        }

	        c.lineWidth = 1;
	        c.stroke();
	    };

	    /**
	     * Draws body angle indicators and axes
	     * @private
	     * @method bodyAxes
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyAxes = function(render, bodies, context) {
	        var c = context,
	            engine = render.engine,
	            options = render.options,
	            part,
	            i,
	            j,
	            k;

	        c.beginPath();

	        for (i = 0; i < bodies.length; i++) {
	            var body = bodies[i],
	                parts = body.parts;

	            if (!body.render.visible)
	                continue;

	            if (options.showAxes) {
	                // render all axes
	                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
	                    part = parts[j];
	                    for (k = 0; k < part.axes.length; k++) {
	                        var axis = part.axes[k];
	                        c.moveTo(part.position.x, part.position.y);
	                        c.lineTo(part.position.x + axis.x * 20, part.position.y + axis.y * 20);
	                    }
	                }
	            } else {
	                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
	                    part = parts[j];
	                    for (k = 0; k < part.axes.length; k++) {
	                        // render a single axis indicator
	                        c.moveTo(part.position.x, part.position.y);
	                        c.lineTo((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2, 
	                                 (part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2);
	                    }
	                }
	            }
	        }

	        if (options.wireframes) {
	            c.strokeStyle = 'indianred';
	        } else {
	            c.strokeStyle = 'rgba(0,0,0,0.8)';
	            c.globalCompositeOperation = 'overlay';
	        }

	        c.lineWidth = 1;
	        c.stroke();
	        c.globalCompositeOperation = 'source-over';
	    };

	    /**
	     * Draws body positions
	     * @private
	     * @method bodyPositions
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyPositions = function(render, bodies, context) {
	        var c = context,
	            engine = render.engine,
	            options = render.options,
	            body,
	            part,
	            i,
	            k;

	        c.beginPath();

	        // render current positions
	        for (i = 0; i < bodies.length; i++) {
	            body = bodies[i];

	            if (!body.render.visible)
	                continue;

	            // handle compound parts
	            for (k = 0; k < body.parts.length; k++) {
	                part = body.parts[k];
	                c.arc(part.position.x, part.position.y, 3, 0, 2 * Math.PI, false);
	                c.closePath();
	            }
	        }

	        if (options.wireframes) {
	            c.fillStyle = 'indianred';
	        } else {
	            c.fillStyle = 'rgba(0,0,0,0.5)';
	        }
	        c.fill();

	        c.beginPath();

	        // render previous positions
	        for (i = 0; i < bodies.length; i++) {
	            body = bodies[i];
	            if (body.render.visible) {
	                c.arc(body.positionPrev.x, body.positionPrev.y, 2, 0, 2 * Math.PI, false);
	                c.closePath();
	            }
	        }

	        c.fillStyle = 'rgba(255,165,0,0.8)';
	        c.fill();
	    };

	    /**
	     * Draws body velocity
	     * @private
	     * @method bodyVelocity
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyVelocity = function(render, bodies, context) {
	        var c = context;

	        c.beginPath();

	        for (var i = 0; i < bodies.length; i++) {
	            var body = bodies[i];

	            if (!body.render.visible)
	                continue;

	            c.moveTo(body.position.x, body.position.y);
	            c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
	        }

	        c.lineWidth = 3;
	        c.strokeStyle = 'cornflowerblue';
	        c.stroke();
	    };

	    /**
	     * Draws body ids
	     * @private
	     * @method bodyIds
	     * @param {render} render
	     * @param {body[]} bodies
	     * @param {RenderingContext} context
	     */
	    Render.bodyIds = function(render, bodies, context) {
	        var c = context,
	            i,
	            j;

	        for (i = 0; i < bodies.length; i++) {
	            if (!bodies[i].render.visible)
	                continue;

	            var parts = bodies[i].parts;
	            for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
	                var part = parts[j];
	                c.font = "12px Arial";
	                c.fillStyle = 'rgba(255,255,255,0.5)';
	                c.fillText(part.id, part.position.x + 10, part.position.y - 10);
	            }
	        }
	    };

	    /**
	     * Description
	     * @private
	     * @method collisions
	     * @param {render} render
	     * @param {pair[]} pairs
	     * @param {RenderingContext} context
	     */
	    Render.collisions = function(render, pairs, context) {
	        var c = context,
	            options = render.options,
	            pair,
	            collision,
	            i,
	            j;

	        c.beginPath();

	        // render collision positions
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];

	            if (!pair.isActive)
	                continue;

	            collision = pair.collision;
	            for (j = 0; j < pair.activeContacts.length; j++) {
	                var contact = pair.activeContacts[j],
	                    vertex = contact.vertex;
	                c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
	            }
	        }

	        if (options.wireframes) {
	            c.fillStyle = 'rgba(255,255,255,0.7)';
	        } else {
	            c.fillStyle = 'orange';
	        }
	        c.fill();

	        c.beginPath();
	            
	        // render collision normals
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];

	            if (!pair.isActive)
	                continue;

	            collision = pair.collision;

	            if (pair.activeContacts.length > 0) {
	                var normalPosX = pair.activeContacts[0].vertex.x,
	                    normalPosY = pair.activeContacts[0].vertex.y;

	                if (pair.activeContacts.length === 2) {
	                    normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
	                    normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
	                }
	                
	                if (collision.bodyB === collision.supports[0].body || collision.bodyA.isStatic === true) {
	                    c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
	                } else {
	                    c.moveTo(normalPosX + collision.normal.x * 8, normalPosY + collision.normal.y * 8);
	                }

	                c.lineTo(normalPosX, normalPosY);
	            }
	        }

	        if (options.wireframes) {
	            c.strokeStyle = 'rgba(255,165,0,0.7)';
	        } else {
	            c.strokeStyle = 'orange';
	        }

	        c.lineWidth = 1;
	        c.stroke();
	    };

	    /**
	     * Description
	     * @private
	     * @method separations
	     * @param {render} render
	     * @param {pair[]} pairs
	     * @param {RenderingContext} context
	     */
	    Render.separations = function(render, pairs, context) {
	        var c = context,
	            options = render.options,
	            pair,
	            collision,
	            bodyA,
	            bodyB,
	            i;

	        c.beginPath();

	        // render separations
	        for (i = 0; i < pairs.length; i++) {
	            pair = pairs[i];

	            if (!pair.isActive)
	                continue;

	            collision = pair.collision;
	            bodyA = collision.bodyA;
	            bodyB = collision.bodyB;

	            var k = 1;

	            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
	            if (bodyB.isStatic) k = 0;

	            c.moveTo(bodyB.position.x, bodyB.position.y);
	            c.lineTo(bodyB.position.x - collision.penetration.x * k, bodyB.position.y - collision.penetration.y * k);

	            k = 1;

	            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
	            if (bodyA.isStatic) k = 0;

	            c.moveTo(bodyA.position.x, bodyA.position.y);
	            c.lineTo(bodyA.position.x + collision.penetration.x * k, bodyA.position.y + collision.penetration.y * k);
	        }

	        if (options.wireframes) {
	            c.strokeStyle = 'rgba(255,165,0,0.5)';
	        } else {
	            c.strokeStyle = 'orange';
	        }
	        c.stroke();
	    };

	    /**
	     * Description
	     * @private
	     * @method grid
	     * @param {render} render
	     * @param {grid} grid
	     * @param {RenderingContext} context
	     */
	    Render.grid = function(render, grid, context) {
	        var c = context,
	            options = render.options;

	        if (options.wireframes) {
	            c.strokeStyle = 'rgba(255,180,0,0.1)';
	        } else {
	            c.strokeStyle = 'rgba(255,180,0,0.5)';
	        }

	        c.beginPath();

	        var bucketKeys = Common.keys(grid.buckets);

	        for (var i = 0; i < bucketKeys.length; i++) {
	            var bucketId = bucketKeys[i];

	            if (grid.buckets[bucketId].length < 2)
	                continue;

	            var region = bucketId.split(',');
	            c.rect(0.5 + parseInt(region[0], 10) * grid.bucketWidth, 
	                    0.5 + parseInt(region[1], 10) * grid.bucketHeight, 
	                    grid.bucketWidth, 
	                    grid.bucketHeight);
	        }

	        c.lineWidth = 1;
	        c.stroke();
	    };

	    /**
	     * Description
	     * @private
	     * @method inspector
	     * @param {inspector} inspector
	     * @param {RenderingContext} context
	     */
	    Render.inspector = function(inspector, context) {
	        var engine = inspector.engine,
	            selected = inspector.selected,
	            render = inspector.render,
	            options = render.options,
	            bounds;

	        if (options.hasBounds) {
	            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
	                boundsHeight = render.bounds.max.y - render.bounds.min.y,
	                boundsScaleX = boundsWidth / render.options.width,
	                boundsScaleY = boundsHeight / render.options.height;
	            
	            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
	            context.translate(-render.bounds.min.x, -render.bounds.min.y);
	        }

	        for (var i = 0; i < selected.length; i++) {
	            var item = selected[i].data;

	            context.translate(0.5, 0.5);
	            context.lineWidth = 1;
	            context.strokeStyle = 'rgba(255,165,0,0.9)';
	            context.setLineDash([1,2]);

	            switch (item.type) {

	            case 'body':

	                // render body selections
	                bounds = item.bounds;
	                context.beginPath();
	                context.rect(Math.floor(bounds.min.x - 3), Math.floor(bounds.min.y - 3), 
	                             Math.floor(bounds.max.x - bounds.min.x + 6), Math.floor(bounds.max.y - bounds.min.y + 6));
	                context.closePath();
	                context.stroke();

	                break;

	            case 'constraint':

	                // render constraint selections
	                var point = item.pointA;
	                if (item.bodyA)
	                    point = item.pointB;
	                context.beginPath();
	                context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
	                context.closePath();
	                context.stroke();

	                break;

	            }

	            context.setLineDash([]);
	            context.translate(-0.5, -0.5);
	        }

	        // render selection region
	        if (inspector.selectStart !== null) {
	            context.translate(0.5, 0.5);
	            context.lineWidth = 1;
	            context.strokeStyle = 'rgba(255,165,0,0.6)';
	            context.fillStyle = 'rgba(255,165,0,0.1)';
	            bounds = inspector.selectBounds;
	            context.beginPath();
	            context.rect(Math.floor(bounds.min.x), Math.floor(bounds.min.y), 
	                         Math.floor(bounds.max.x - bounds.min.x), Math.floor(bounds.max.y - bounds.min.y));
	            context.closePath();
	            context.stroke();
	            context.fill();
	            context.translate(-0.5, -0.5);
	        }

	        if (options.hasBounds)
	            context.setTransform(1, 0, 0, 1, 0, 0);
	    };

	    /**
	     * Description
	     * @method _createCanvas
	     * @private
	     * @param {} width
	     * @param {} height
	     * @return canvas
	     */
	    var _createCanvas = function(width, height) {
	        var canvas = document.createElement('canvas');
	        canvas.width = width;
	        canvas.height = height;
	        canvas.oncontextmenu = function() { return false; };
	        canvas.onselectstart = function() { return false; };
	        return canvas;
	    };

	    /**
	     * Gets the pixel ratio of the canvas.
	     * @method _getPixelRatio
	     * @private
	     * @param {HTMLElement} canvas
	     * @return {Number} pixel ratio
	     */
	    var _getPixelRatio = function(canvas) {
	        var context = canvas.getContext('2d'),
	            devicePixelRatio = window.devicePixelRatio || 1,
	            backingStorePixelRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio
	                                      || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio
	                                      || context.backingStorePixelRatio || 1;

	        return devicePixelRatio / backingStorePixelRatio;
	    };

	    /**
	     * Gets the requested texture (an Image) via its path
	     * @method _getTexture
	     * @private
	     * @param {render} render
	     * @param {string} imagePath
	     * @return {Image} texture
	     */
	    var _getTexture = function(render, imagePath) {
	        var image = render.textures[imagePath];

	        if (image)
	            return image;

	        image = render.textures[imagePath] = new Image();
	        image.src = imagePath;

	        return image;
	    };

	    /**
	     * Applies the background to the canvas using CSS.
	     * @method applyBackground
	     * @private
	     * @param {render} render
	     * @param {string} background
	     */
	    var _applyBackground = function(render, background) {
	        var cssBackground = background;

	        if (/(jpg|gif|png)$/.test(background))
	            cssBackground = 'url(' + background + ')';

	        render.canvas.style.background = cssBackground;
	        render.canvas.style.backgroundSize = "contain";
	        render.currentBackground = background;
	    };

	    /*
	    *
	    *  Events Documentation
	    *
	    */

	    /**
	    * Fired before rendering
	    *
	    * @event beforeRender
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /**
	    * Fired after rendering
	    *
	    * @event afterRender
	    * @param {} event An event object
	    * @param {number} event.timestamp The engine.timing.timestamp of the event
	    * @param {} event.source The source object of the event
	    * @param {} event.name The name of the event
	    */

	    /*
	    *
	    *  Properties Documentation
	    *
	    */

	    /**
	     * A back-reference to the `Matter.Render` module.
	     *
	     * @property controller
	     * @type render
	     */

	    /**
	     * A reference to the `Matter.Engine` instance to be used.
	     *
	     * @property engine
	     * @type engine
	     */

	    /**
	     * A reference to the element where the canvas is to be inserted (if `render.canvas` has not been specified)
	     *
	     * @property element
	     * @type HTMLElement
	     * @default null
	     */

	    /**
	     * The canvas element to render to. If not specified, one will be created if `render.element` has been specified.
	     *
	     * @property canvas
	     * @type HTMLCanvasElement
	     * @default null
	     */

	    /**
	     * The configuration options of the renderer.
	     *
	     * @property options
	     * @type {}
	     */

	    /**
	     * The target width in pixels of the `render.canvas` to be created.
	     *
	     * @property options.width
	     * @type number
	     * @default 800
	     */

	    /**
	     * The target height in pixels of the `render.canvas` to be created.
	     *
	     * @property options.height
	     * @type number
	     * @default 600
	     */

	    /**
	     * A flag that specifies if `render.bounds` should be used when rendering.
	     *
	     * @property options.hasBounds
	     * @type boolean
	     * @default false
	     */

	    /**
	     * A `Bounds` object that specifies the drawing view region. 
	     * Rendering will be automatically transformed and scaled to fit within the canvas size (`render.options.width` and `render.options.height`).
	     * This allows for creating views that can pan or zoom around the scene.
	     * You must also set `render.options.hasBounds` to `true` to enable bounded rendering.
	     *
	     * @property bounds
	     * @type bounds
	     */

	    /**
	     * The 2d rendering context from the `render.canvas` element.
	     *
	     * @property context
	     * @type CanvasRenderingContext2D
	     */

	    /**
	     * The sprite texture cache.
	     *
	     * @property textures
	     * @type {}
	     */

	})();

	},{"../body/Composite":2,"../collision/Grid":6,"../core/Common":14,"../core/Events":16,"../geometry/Bounds":24,"../geometry/Vector":26}],30:[function(require,module,exports){
	/**
	* The `Matter.RenderPixi` module is an example renderer using pixi.js.
	* See also `Matter.Render` for a canvas based renderer.
	*
	* @class RenderPixi
	* @deprecated the Matter.RenderPixi module will soon be removed from the Matter.js core.
	* It will likely be moved to its own repository (but maintenance will be limited).
	*/

	var RenderPixi = {};

	module.exports = RenderPixi;

	var Composite = require('../body/Composite');
	var Common = require('../core/Common');

	(function() {

	    var _requestAnimationFrame,
	        _cancelAnimationFrame;

	    if (typeof window !== 'undefined') {
	        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
	                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
	                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
	   
	        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
	                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
	    }
	    
	    /**
	     * Creates a new Pixi.js WebGL renderer
	     * @method create
	     * @param {object} options
	     * @return {RenderPixi} A new renderer
	     * @deprecated
	     */
	    RenderPixi.create = function(options) {
	        Common.log('RenderPixi.create: Matter.RenderPixi is deprecated (see docs)', 'warn');

	        var defaults = {
	            controller: RenderPixi,
	            engine: null,
	            element: null,
	            frameRequestId: null,
	            canvas: null,
	            renderer: null,
	            container: null,
	            spriteContainer: null,
	            pixiOptions: null,
	            options: {
	                width: 800,
	                height: 600,
	                background: '#fafafa',
	                wireframeBackground: '#222',
	                hasBounds: false,
	                enabled: true,
	                wireframes: true,
	                showSleeping: true,
	                showDebug: false,
	                showBroadphase: false,
	                showBounds: false,
	                showVelocity: false,
	                showCollisions: false,
	                showAxes: false,
	                showPositions: false,
	                showAngleIndicator: false,
	                showIds: false,
	                showShadows: false
	            }
	        };

	        var render = Common.extend(defaults, options),
	            transparent = !render.options.wireframes && render.options.background === 'transparent';

	        // init pixi
	        render.pixiOptions = render.pixiOptions || {
	            view: render.canvas,
	            transparent: transparent,
	            antialias: true,
	            backgroundColor: options.background
	        };

	        render.mouse = options.mouse;
	        render.engine = options.engine;
	        render.renderer = render.renderer || new PIXI.WebGLRenderer(render.options.width, render.options.height, render.pixiOptions);
	        render.container = render.container || new PIXI.Container();
	        render.spriteContainer = render.spriteContainer || new PIXI.Container();
	        render.canvas = render.canvas || render.renderer.view;
	        render.bounds = render.bounds || { 
	            min: {
	                x: 0,
	                y: 0
	            }, 
	            max: { 
	                x: render.options.width,
	                y: render.options.height
	            }
	        };

	        // caches
	        render.textures = {};
	        render.sprites = {};
	        render.primitives = {};

	        // use a sprite batch for performance
	        render.container.addChild(render.spriteContainer);

	        // insert canvas
	        if (Common.isElement(render.element)) {
	            render.element.appendChild(render.canvas);
	        } else {
	            Common.log('No "render.element" passed, "render.canvas" was not inserted into document.', 'warn');
	        }

	        // prevent menus on canvas
	        render.canvas.oncontextmenu = function() { return false; };
	        render.canvas.onselectstart = function() { return false; };

	        return render;
	    };

	    /**
	     * Continuously updates the render canvas on the `requestAnimationFrame` event.
	     * @method run
	     * @param {render} render
	     * @deprecated
	     */
	    RenderPixi.run = function(render) {
	        (function loop(time){
	            render.frameRequestId = _requestAnimationFrame(loop);
	            RenderPixi.world(render);
	        })();
	    };

	    /**
	     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
	     * @method stop
	     * @param {render} render
	     * @deprecated
	     */
	    RenderPixi.stop = function(render) {
	        _cancelAnimationFrame(render.frameRequestId);
	    };

	    /**
	     * Clears the scene graph
	     * @method clear
	     * @param {RenderPixi} render
	     * @deprecated
	     */
	    RenderPixi.clear = function(render) {
	        var container = render.container,
	            spriteContainer = render.spriteContainer;

	        // clear stage container
	        while (container.children[0]) { 
	            container.removeChild(container.children[0]); 
	        }

	        // clear sprite batch
	        while (spriteContainer.children[0]) { 
	            spriteContainer.removeChild(spriteContainer.children[0]); 
	        }

	        var bgSprite = render.sprites['bg-0'];

	        // clear caches
	        render.textures = {};
	        render.sprites = {};
	        render.primitives = {};

	        // set background sprite
	        render.sprites['bg-0'] = bgSprite;
	        if (bgSprite)
	            container.addChildAt(bgSprite, 0);

	        // add sprite batch back into container
	        render.container.addChild(render.spriteContainer);

	        // reset background state
	        render.currentBackground = null;

	        // reset bounds transforms
	        container.scale.set(1, 1);
	        container.position.set(0, 0);
	    };

	    /**
	     * Sets the background of the canvas 
	     * @method setBackground
	     * @param {RenderPixi} render
	     * @param {string} background
	     * @deprecated
	     */
	    RenderPixi.setBackground = function(render, background) {
	        if (render.currentBackground !== background) {
	            var isColor = background.indexOf && background.indexOf('#') !== -1,
	                bgSprite = render.sprites['bg-0'];

	            if (isColor) {
	                // if solid background color
	                var color = Common.colorToNumber(background);
	                render.renderer.backgroundColor = color;

	                // remove background sprite if existing
	                if (bgSprite)
	                    render.container.removeChild(bgSprite); 
	            } else {
	                // initialise background sprite if needed
	                if (!bgSprite) {
	                    var texture = _getTexture(render, background);

	                    bgSprite = render.sprites['bg-0'] = new PIXI.Sprite(texture);
	                    bgSprite.position.x = 0;
	                    bgSprite.position.y = 0;
	                    render.container.addChildAt(bgSprite, 0);
	                }
	            }

	            render.currentBackground = background;
	        }
	    };

	    /**
	     * Description
	     * @method world
	     * @param {engine} engine
	     * @deprecated
	     */
	    RenderPixi.world = function(render) {
	        var engine = render.engine,
	            world = engine.world,
	            renderer = render.renderer,
	            container = render.container,
	            options = render.options,
	            bodies = Composite.allBodies(world),
	            allConstraints = Composite.allConstraints(world),
	            constraints = [],
	            i;

	        if (options.wireframes) {
	            RenderPixi.setBackground(render, options.wireframeBackground);
	        } else {
	            RenderPixi.setBackground(render, options.background);
	        }

	        // handle bounds
	        var boundsWidth = render.bounds.max.x - render.bounds.min.x,
	            boundsHeight = render.bounds.max.y - render.bounds.min.y,
	            boundsScaleX = boundsWidth / render.options.width,
	            boundsScaleY = boundsHeight / render.options.height;

	        if (options.hasBounds) {
	            // Hide bodies that are not in view
	            for (i = 0; i < bodies.length; i++) {
	                var body = bodies[i];
	                body.render.sprite.visible = Bounds.overlaps(body.bounds, render.bounds);
	            }

	            // filter out constraints that are not in view
	            for (i = 0; i < allConstraints.length; i++) {
	                var constraint = allConstraints[i],
	                    bodyA = constraint.bodyA,
	                    bodyB = constraint.bodyB,
	                    pointAWorld = constraint.pointA,
	                    pointBWorld = constraint.pointB;

	                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
	                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

	                if (!pointAWorld || !pointBWorld)
	                    continue;

	                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
	                    constraints.push(constraint);
	            }

	            // transform the view
	            container.scale.set(1 / boundsScaleX, 1 / boundsScaleY);
	            container.position.set(-render.bounds.min.x * (1 / boundsScaleX), -render.bounds.min.y * (1 / boundsScaleY));
	        } else {
	            constraints = allConstraints;
	        }

	        for (i = 0; i < bodies.length; i++)
	            RenderPixi.body(render, bodies[i]);

	        for (i = 0; i < constraints.length; i++)
	            RenderPixi.constraint(render, constraints[i]);

	        renderer.render(container);
	    };


	    /**
	     * Description
	     * @method constraint
	     * @param {engine} engine
	     * @param {constraint} constraint
	     * @deprecated
	     */
	    RenderPixi.constraint = function(render, constraint) {
	        var engine = render.engine,
	            bodyA = constraint.bodyA,
	            bodyB = constraint.bodyB,
	            pointA = constraint.pointA,
	            pointB = constraint.pointB,
	            container = render.container,
	            constraintRender = constraint.render,
	            primitiveId = 'c-' + constraint.id,
	            primitive = render.primitives[primitiveId];

	        // initialise constraint primitive if not existing
	        if (!primitive)
	            primitive = render.primitives[primitiveId] = new PIXI.Graphics();

	        // don't render if constraint does not have two end points
	        if (!constraintRender.visible || !constraint.pointA || !constraint.pointB) {
	            primitive.clear();
	            return;
	        }

	        // add to scene graph if not already there
	        if (Common.indexOf(container.children, primitive) === -1)
	            container.addChild(primitive);

	        // render the constraint on every update, since they can change dynamically
	        primitive.clear();
	        primitive.beginFill(0, 0);
	        primitive.lineStyle(constraintRender.lineWidth, Common.colorToNumber(constraintRender.strokeStyle), 1);
	        
	        if (bodyA) {
	            primitive.moveTo(bodyA.position.x + pointA.x, bodyA.position.y + pointA.y);
	        } else {
	            primitive.moveTo(pointA.x, pointA.y);
	        }

	        if (bodyB) {
	            primitive.lineTo(bodyB.position.x + pointB.x, bodyB.position.y + pointB.y);
	        } else {
	            primitive.lineTo(pointB.x, pointB.y);
	        }

	        primitive.endFill();
	    };
	    
	    /**
	     * Description
	     * @method body
	     * @param {engine} engine
	     * @param {body} body
	     * @deprecated
	     */
	    RenderPixi.body = function(render, body) {
	        var engine = render.engine,
	            bodyRender = body.render;

	        if (!bodyRender.visible)
	            return;

	        if (bodyRender.sprite && bodyRender.sprite.texture) {
	            var spriteId = 'b-' + body.id,
	                sprite = render.sprites[spriteId],
	                spriteContainer = render.spriteContainer;

	            // initialise body sprite if not existing
	            if (!sprite)
	                sprite = render.sprites[spriteId] = _createBodySprite(render, body);

	            // add to scene graph if not already there
	            if (Common.indexOf(spriteContainer.children, sprite) === -1)
	                spriteContainer.addChild(sprite);

	            // update body sprite
	            sprite.position.x = body.position.x;
	            sprite.position.y = body.position.y;
	            sprite.rotation = body.angle;
	            sprite.scale.x = bodyRender.sprite.xScale || 1;
	            sprite.scale.y = bodyRender.sprite.yScale || 1;
	        } else {
	            var primitiveId = 'b-' + body.id,
	                primitive = render.primitives[primitiveId],
	                container = render.container;

	            // initialise body primitive if not existing
	            if (!primitive) {
	                primitive = render.primitives[primitiveId] = _createBodyPrimitive(render, body);
	                primitive.initialAngle = body.angle;
	            }

	            // add to scene graph if not already there
	            if (Common.indexOf(container.children, primitive) === -1)
	                container.addChild(primitive);

	            // update body primitive
	            primitive.position.x = body.position.x;
	            primitive.position.y = body.position.y;
	            primitive.rotation = body.angle - primitive.initialAngle;
	        }
	    };

	    /**
	     * Creates a body sprite
	     * @method _createBodySprite
	     * @private
	     * @param {RenderPixi} render
	     * @param {body} body
	     * @return {PIXI.Sprite} sprite
	     * @deprecated
	     */
	    var _createBodySprite = function(render, body) {
	        var bodyRender = body.render,
	            texturePath = bodyRender.sprite.texture,
	            texture = _getTexture(render, texturePath),
	            sprite = new PIXI.Sprite(texture);

	        sprite.anchor.x = body.render.sprite.xOffset;
	        sprite.anchor.y = body.render.sprite.yOffset;

	        return sprite;
	    };

	    /**
	     * Creates a body primitive
	     * @method _createBodyPrimitive
	     * @private
	     * @param {RenderPixi} render
	     * @param {body} body
	     * @return {PIXI.Graphics} graphics
	     * @deprecated
	     */
	    var _createBodyPrimitive = function(render, body) {
	        var bodyRender = body.render,
	            options = render.options,
	            primitive = new PIXI.Graphics(),
	            fillStyle = Common.colorToNumber(bodyRender.fillStyle),
	            strokeStyle = Common.colorToNumber(bodyRender.strokeStyle),
	            strokeStyleIndicator = Common.colorToNumber(bodyRender.strokeStyle),
	            strokeStyleWireframe = Common.colorToNumber('#bbb'),
	            strokeStyleWireframeIndicator = Common.colorToNumber('#CD5C5C'),
	            part;

	        primitive.clear();

	        // handle compound parts
	        for (var k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
	            part = body.parts[k];

	            if (!options.wireframes) {
	                primitive.beginFill(fillStyle, 1);
	                primitive.lineStyle(bodyRender.lineWidth, strokeStyle, 1);
	            } else {
	                primitive.beginFill(0, 0);
	                primitive.lineStyle(1, strokeStyleWireframe, 1);
	            }

	            primitive.moveTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

	            for (var j = 1; j < part.vertices.length; j++) {
	                primitive.lineTo(part.vertices[j].x - body.position.x, part.vertices[j].y - body.position.y);
	            }

	            primitive.lineTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

	            primitive.endFill();

	            // angle indicator
	            if (options.showAngleIndicator || options.showAxes) {
	                primitive.beginFill(0, 0);

	                if (options.wireframes) {
	                    primitive.lineStyle(1, strokeStyleWireframeIndicator, 1);
	                } else {
	                    primitive.lineStyle(1, strokeStyleIndicator);
	                }

	                primitive.moveTo(part.position.x - body.position.x, part.position.y - body.position.y);
	                primitive.lineTo(((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2 - body.position.x), 
	                                 ((part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2 - body.position.y));

	                primitive.endFill();
	            }
	        }

	        return primitive;
	    };

	    /**
	     * Gets the requested texture (a PIXI.Texture) via its path
	     * @method _getTexture
	     * @private
	     * @param {RenderPixi} render
	     * @param {string} imagePath
	     * @return {PIXI.Texture} texture
	     * @deprecated
	     */
	    var _getTexture = function(render, imagePath) {
	        var texture = render.textures[imagePath];

	        if (!texture)
	            texture = render.textures[imagePath] = PIXI.Texture.fromImage(imagePath);

	        return texture;
	    };

	})();

	},{"../body/Composite":2,"../core/Common":14}]},{},[28])(28)
	});

	// Imports


	/** ZeroEditor class */
	class ZeroEditor{
		constructor(options = {}){
			const zEditor = this;
			this._setPrivateProps();

			
			// Args parsing
			zEditor._options = { ...defaultOptions.options, ...options };
			zEditor._world   = { ...defaultOptions.world,	  ...zEditor._options.world	};
			zEditor._events  = {	...defaultOptions.events,	...zEditor._options.events };

	    // Api
			zEditor._api = {
				info (...args) { zEditor._template.info ('[' + zEditor.api.getTime() + ' info] ' + JSON.stringify(args)); },
				debug(...args) { zEditor._template.debug('[' + zEditor.api.getTime() + ' debug] ' + JSON.stringify(args)); },
				error(...args) { zEditor._template.error('[' + zEditor.api.getTime() + ' error] ' + JSON.stringify(args)); },
				getTime() {return zEditor.getTime(); },
				...zEditor._options.api,
			};
			
			//Init
			zEditor._template = new Template(zEditor._options.el, zEditor._options.logo);
			zEditor._editor = new CodeEditor(zEditor._template.editor, zEditor._options.code);
			
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
							zEditor.stop();
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


	    zEditor._sandbox = new Sandbox(zEditor._api);
			
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
				this.api.error('Can\'t parse code: ' + e.message);
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
				this._template.clearInput();
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
			};
			return defaultApi[name]
		}
	}

	return ZeroEditor;

}());
