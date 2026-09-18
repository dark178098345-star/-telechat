-- Exercises real RPCs in one rolled-back transaction. No sample release is published.
begin;
do $$
declare pw text; other_actor text; other_pw text; t jsonb; p jsonb; lib jsonb; ticket jsonb; rejected boolean:=false;
begin
 select pass into strict pw from public.users where nick='creator';
 other_actor:='music_test_'||substr(replace(gen_random_uuid()::text,'-',''),1,8);other_pw:=gen_random_uuid()::text;
 insert into public.users(nick,pass,name,av,status) values(other_actor,other_pw,'Rollback fixture',0,'');
 ticket:=public.telechat_music_v117('creator',pw,'upload_ticket','{"size":0}');
 perform set_config('request.headers',jsonb_build_object('x-telechat-music-token',ticket->>'token')::text,true);
 assert public.telechat_music_storage_v117((ticket->>'id')||'/audio.wav'),'Valid storage ticket';
 assert not public.telechat_music_storage_v117(gen_random_uuid()::text||'/audio.wav'),'Ticket cannot access another folder';
 assert not public.telechat_music_storage_v117((ticket->>'id')||'/arbitrary.bin'),'Unexpected filename rejected';
 t:=public.telechat_music_v117('creator',pw,'publish',jsonb_build_object('id',ticket->>'id','title','Music integration test (rollback)','artist','Test','source','link','url','https://example.com/test.mp3','size',0,'duration',1));
 p:=public.telechat_music_v117('creator',pw,'create_playlist','{"title":"Temporary test"}');
 perform public.telechat_music_v117('creator',pw,'playlist_add',jsonb_build_object('playlist_id',p->>'id','track_id',t->>'id'));
 perform public.telechat_music_v117('creator',pw,'like',jsonb_build_object('track_id',t->>'id','enabled',true));
 lib:=public.telechat_music_v117('creator',pw,'library');
 assert (lib->'saved') ? (t->>'id'),'Release automatically saved';
 assert (lib->'liked') ? (t->>'id'),'Like persisted';
 assert exists(select 1 from public.music_catalog_v117 where id=(t->>'id')::uuid and likes_count=1),'Like count';
 if other_actor is not null then
  begin perform public.telechat_music_v117(other_actor,other_pw,'delete_track',jsonb_build_object('track_id',t->>'id')); exception when others then rejected:=true; end;
  assert rejected,'Another account cannot delete track';rejected:=false;
  begin perform public.telechat_music_v117(other_actor,other_pw,'playlist_add',jsonb_build_object('playlist_id',p->>'id','track_id',t->>'id')); exception when others then rejected:=true; end;
  assert rejected,'Another account cannot edit playlist';
 end if;
 perform public.telechat_music_v117('creator',pw,'delete_track',jsonb_build_object('track_id',t->>'id'));
 assert not exists(select 1 from public.music_playlist_items_v117 where track_id=(t->>'id')::uuid),'Track deletion cascades';
end $$;
rollback;
select 'PASS: publish, library, likes, playlists, ownership, storage tickets, cascade; all fixture changes rolled back' as result;
