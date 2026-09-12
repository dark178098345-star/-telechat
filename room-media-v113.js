/* Shared room avatars and clipboard attachments. */
function roomAvatarMarkupV113(room) {
  const icon=String(room?.icon||'🌌');
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(icon)
    ? '<img src="'+icon+'" alt="Аватарка группы" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">'
    : escHtml(icon);
}
(()=>{
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;document.body.append(input);
  const button=document.createElement('button');button.type='button';button.className='font-btn';button.textContent='📷 Изменить аватарку';
  document.getElementById('room-panel-icon').after(button);
  button.onclick=()=>input.click();
  const previous=renderRoomPanel;
  renderRoomPanel=async function(){const result=await previous.apply(this,arguments);button.hidden=!currentRoom||currentRoom.owner_nick!==me?.nick;return result;};
  input.onchange=async()=>{
    const file=input.files?.[0];input.value='';const room=currentRoom,owner=me?.nick;
    if(!file||!room||room.owner_nick!==owner)return;
    if(!file.type.startsWith('image/')||file.size>12*1024*1024){showToast('Выбери изображение до 12 МБ');return;}
    button.disabled=true;const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const side=Math.min(image.naturalWidth,image.naturalHeight);
      canvas.getContext('2d').drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
      const icon=canvas.toDataURL('image/jpeg',.8);
      const result=await sb.from('rooms').update({icon}).eq('id',room.id).eq('owner_nick',owner).select('*').single();
      if(result.error||!result.data)throw result.error||new Error('Save failed');
      roomRows=roomRows.map(item=>String(item.id)===String(room.id)?{...item,...result.data}:item);
      if(currentRoom&&String(currentRoom.id)===String(room.id)){
        currentRoom={...currentRoom,...result.data};document.getElementById('chat-av').innerHTML=roomAvatarMarkupV113(currentRoom);await renderRoomPanel();
      }
      await renderContacts();showToast('Аватарка сохранена');
    }catch(error){showToast('Не удалось сохранить аватарку');}
    finally{URL.revokeObjectURL(url);button.disabled=false;}
  };
  document.getElementById('msg-input').addEventListener('paste',event=>{
    if(!conversationKey()||!canWriteCurrent())return;
    const item=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'));
    const file=item?.getAsFile();if(!file)return;
    event.preventDefault();handleChatPhoto({files:[file],value:''});
  });
})();
