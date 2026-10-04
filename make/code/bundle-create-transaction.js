const fs=require('node:fs'),path=require('node:path');
function bundleCreateTransaction(){
 const sources={};
 function collect(name){if(sources[name])return;const s=fs.readFileSync(path.join(__dirname,name+'.js'),'utf8');sources[name]=s;for(const m of s.matchAll(/require\('\.\/([^']+)'\)/g))collect(m[1]);}
 collect('create-transaction');
 return `const creation = (()=>{const sources=${JSON.stringify(sources)},cache={};function load(name){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;new Function('require','module','exports',sources[name])(n=>n.startsWith('./')?load(n.slice(2)):require(n),module,module.exports);return module.exports;}return {...load('create-transaction'),...load('new-contact-query'),selectPrimaryPhoto:load('select-primary-photo')};})();`;
}
module.exports=bundleCreateTransaction;
