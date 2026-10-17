/* Account+conversation scoped preferences. No message/profile payloads. */
(function(root){'use strict';
 const colors={violet:['Лавандовый','#7057ba'],blue:['Синий','#3569b7'],teal:['Бирюзовый','#24746c'],slate:['Графит','#536378'],rose:['Розовый','#a24c6e']};
 const defaults=()=>({color:'',background:'',radius:0,density:'',sound:''});
 function clean(raw){const v=raw&&typeof raw==='object'?raw:{},p=defaults();if(typeof v.color==='string'&&/^#[0-9a-f]{6}$/i.test(v.color))p.color=v.color.toLowerCase();if(['plain','lavender','ocean','mint'].includes(v.background))p.background=v.background;if([8,12,16,20,24].includes(Number(v.radius)))p.radius=Number(v.radius);if(['compact','normal','spacious'].includes(v.density))p.density=v.density;if(['cosmos','bubble','pulse','none'].includes(v.sound))p.sound=v.sound;return p;}
 function foreground(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),l=c[0]*.2126+c[1]*.7152+c[2]*.0722;return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff';}
 function key(owner,chat){return 'exstrachat.chat-prefs.v181.'+JSON.stringify([String(owner),String(chat)]);}
 const api={colors,defaults,clean,foreground,key};if(typeof module==='object'&&module.exports)module.exports=api;else root.exstraChatPreferencesModelV181=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
