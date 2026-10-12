/* Read-only compatibility for historical gift messages. No economy actions. */
(()=>{
 const prefix='[tc_gift_v1]';
 function oldGift(text){const value=String(text||'');if(!value.startsWith(prefix))return '';try{const data=JSON.parse(decodeURIComponent(value.slice(prefix.length,12000)));return 'Ранее отправленный подарок: '+String(data.n||'Подарок').slice(0,100)+(data.m?'\n'+String(data.m).slice(0,120):'');}catch(_){return 'Ранее отправленный подарок';}}
 const preview=window.messagePreviewText;if(typeof preview==='function')window.messagePreviewText=function(text){return oldGift(text)||preview.apply(this,arguments);};
 const content=window.renderMessageContent;if(typeof content==='function')window.renderMessageContent=function(text){const archived=oldGift(text);return content.apply(this,archived?[archived]:arguments);};
})();
