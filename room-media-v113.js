/* Shared room avatars and clipboard attachments. */
function roomAvatarMarkupV113(room) {
  const icon=String(room?.icon||'exstra-room:v177:violet');
  if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(icon))return '<img src="'+icon+'" alt="Аватарка пространства" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">';
  const colors={violet:['#3a3152','#e0d0ff'],blue:['#243d58','#c4e0ff'],mint:['#24463e','#b4f4d8'],rose:['#513042','#ffd1e3'],amber:['#51412c','#ffe0aa'],slate:['#323d4b','#dae5f4']};
  const shade=icon.startsWith('exstra-room:v177:')?icon.split(':').at(-1):'violet';
  if(!icon.startsWith('exstra-room:v177:')&&icon!=='🌌')return escHtml(icon);
  const [bg,fg]=colors[shade]||colors.violet,initials=String(room?.name||'').trim().split(/\s+/).slice(0,2).map(w=>Array.from(w)[0]||'').join('').toUpperCase();
  return '<svg class="room-initials-v177" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="'+bg+'"/><text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-weight="650" font-size="34" fill="'+fg+'">'+escHtml(initials||'EC')+'</text></svg>';
}
(()=>{
  document.getElementById('msg-input').addEventListener('paste',event=>{
    if(!conversationKey()||!canWriteCurrent())return;
    const item=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'));
    const file=item?.getAsFile();if(!file)return;
    event.preventDefault();handleChatPhoto({files:[file],value:''});
  });
})();
