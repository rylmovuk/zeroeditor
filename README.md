# Zeroeditor
An user-friendly IDE thought for people who have never got in contact with code.  
Built on top of [Matter.js](http://brm.io/matter-js/) and [CodeMirror](https://codemirror.net/).
Inspired by (but not affiliated with) [Zero Robotics Tournament](http://zerorobotics.mit.edu/).  
  
  
## Getting started
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


## Usage
```javascript
zEditor.sprites //All the sprites passed throught game.sprites during initialization

```


## Building (Node and npm required)
Clone with git, open a terminal and type:
`npm install`


Then you could use:
- `npm run build` - production build, will create zeroeditor.js and zeroeditor.css on /dist folder
Internally, rollup and cleancss are used to minify/compile code