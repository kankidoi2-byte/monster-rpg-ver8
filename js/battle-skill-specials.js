// Presentation-only special skills adapted from the accepted 2026-11-13 prototype.
// No HP or damage calculations. The shared engine resumes battle resolution at contact.
const BATTLE_SKILL_SPECIALS=fx=>{
  const {P,EN,EL,E_,R,center,dirPE,tw,wait,hitStop,impact,backTo,flashO,addP,elP,
    burst,ring,ringIn,slash,inward,tag,cracks,orbitP,spStart,spEnd,proj,unproj,
    parts,FXS,contact,CW,CH,shake,cueHpDelta}=fx;
  return {
  async 95(mv){ // アペクスストーム
    const d=dirPE(),c=center(EN); await spStart(mv,'#1fae92','#3b3fd6');
    tw(P,{sx:1.08,sy:.92},160).then(()=>tw(P,{x:-d.x*14,y:-d.y*14},120)).then(()=>backTo(P,260));
    const end=fx.gTime+820; let k=0;
    while(fx.active&&fx.gTime<end){
      for(let i=0;i<3;i++) orbitP(c,i%3?'wind':'dragon',{rad:R(60,120),av:R(7,10),rv:-55,yo:R(-60,40),lift:R(10,50),life:R(.45,.8)});
      if(k++%4===0){EN.x=R(-4,4); shake(.05,.35);} await wait(30);
    }
    EN.x=0; ringIn(c,'#bffff0',150,.2,6); await wait(150);
    flashO.a=.55; tw(flashO,{a:0},260);
    ring(c,'#9ff8e0',170,.5,14); ring(c,'#5a5cff',110,.4,10); burst(c,'wind',30,1.4); burst(c,'dragon',20,1.4);
    await impact(EN,null,d,{stop:130,tr:.86,kb:30,big:true});
    spEnd(); await FXS.recoil(mv);
  },
  async 103(mv){ // エリクシオン・ノヴァ
    const d=dirPE(),c=center(EN),top={x:c.x,y:c.y-95}; await spStart(mv,'#c79a1f','#7a5a00');
    addP({type:'circle',x:c.x,y:c.y+52,r:118,sy:.36,life:1.6,color:'#ffeaa0',glow:'#ffb800',sp2:1.1});
    addP({type:'circle',x:c.x,y:c.y,r:78,sy:1,life:1.25,color:'#fff4c8',glow:'#ffcc33',sp2:-1.6});
    tw(P,{glow:1},300);
    const core=proj({x:top.x,y:top.y,r:2,c:'#fff8d8',g:'#ffc93a'});
    tw(core,{r:22},620,E_.out);
    for(let i=0;i<7;i++){inward(top,'light',5,130,.38); await wait(85);}
    await tw(core,{y:c.y},130,E_.inQ); unproj(core);
    flashO.a=.85; tw(flashO,{a:0},420);
    for(const [r,col,w] of [[200,'#ffe27a',16],[130,'#ffffff',10],[260,'#ffb800',8]]) ring(c,col,r,.55,w);
    for(let i=0;i<40;i++){const a=R(0,6.28),sp=R(150,520); addP({type:'star4',x:c.x,y:c.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,drag:.9,grav:80,life:R(.6,1.1),size:R(4,9),color:'#fffbe0',glow:'#ffb800'});}
    await impact(EN,null,d,{stop:140,tr:.9,kb:28,big:true});
    tw(P,{glow:0},400);
    for(let i=0;i<16;i++) addP({type:'star4',x:c.x+R(-110,110),y:c.y-R(60,180),vy:R(30,70),drag:1,life:R(.8,1.2),size:R(2,4),color:'#fff3b0',glow:'#ffb800'});
    spEnd(); await wait(250);
  },
  async 104(mv){ // 錬核崩砕
    const d=dirPE(),p=center(P,.45); await spStart(mv,'#0f8aa8','#b0281a');
    const pos={x:p.x+d.x*70,y:p.y+d.y*70};
    const cr=[];for(let i=0;i<6;i++){const a=R(0,6.28),ln=[];for(let j=1;j<=4;j++) ln.push([Math.cos(a+R(-.3,.3))*j/4*.95,Math.sin(a+R(-.3,.3))*j/4*.95]); cr.push(ln);}
    const core=proj({x:pos.x,y:pos.y,r:0,c:'#8ff3ff',g:'#1aa6c8',hex:true,cracks:cr,cr:0,crc:'#ff3a1f',rot:0});
    tw(core,{r:30,rot:1.2},420,E_.back);
    for(let i=0;i<5;i++){inward(pos,'normal',5,110,.32); await wait(80);}
    await tw(core,{cr:1},300,E_.inQ); core.g='#ff5a2a'; shake(.2);
    await tw(P,{x:-d.x*24,y:-d.y*24,sx:1.1,sy:.88},140);
    const c=center(EN);
    tw(core,{x:c.x,y:c.y,rot:3},150,E_.inQ); await tw(P,{x:d.x*d.L*.34,y:d.y*d.L*.34,sx:.92,sy:1.09},150,E_.inQ); unproj(core);
    flashO.a=.6; tw(flashO,{a:0},300);
    for(let i=0;i<26;i++){const a=R(0,6.28),sp=R(220,600); addP({type:'shard',x:c.x,y:c.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,grav:900,drag:.9,life:R(.5,.9),size:R(5,10),color:i%3?'#8ff3ff':'#ff5a2a',core:'#fff'});}
    addP({type:'poly',x:c.x,y:c.y,r:95,n:10,rot0:R(0,6),j:[1,.8,1.15,.75,.95,1.2,.85],life:.32,color:'#fff',glow:'#ff5a2a'});
    cracks({x:c.x,y:c.y+48},9,150,'#ff6a3a');
    await impact(EN,null,d,{stop:165,tr:1,kb:40,big:true});
    await backTo(P,260); spEnd(); await FXS.recoil(mv);
  },
  async 105(mv){ // アポカリプスノヴァ
    const d=dirPE(),c=center(EN); await spStart(mv,'#c4359a','#2a3fb8',.82);
    for(let i=0;i<46;i++) addP({type:'star4',x:R(0,CW),y:R(0,CH*.62),drag:1,life:R(1.6,2.2),size:R(1.2,3),color:'#ffffff',glow:'#7fa0ff',spin:0});
    await wait(260);
    const m=proj({x:CW*.95,y:-30,r:6,c:'#ffe0f8',g:'#ff6ad0',el:'star'});
    tw(m,{r:28},700,E_.inQ); await tw(m,{x:c.x,y:c.y},700,E_.inQ); unproj(m);
    await hitStop(90);
    flashO.a=1; tw(flashO,{a:0},620,E_.inQ);
    addP({type:'poly',x:c.x,y:c.y,r:150,n:5,rot0:-Math.PI/2,j:[1],life:.5,color:'#fff',glow:'#ff6ad0'});
    for(const [r,col,w] of [[260,'#ff6ad0',16],[190,'#7fa0ff',12],[120,'#ffffff',8]]) ring(c,col,r,.6,w);
    burst(c,'star',50,1.6);
    await impact(EN,null,d,{stop:170,tr:1,kb:36,big:true});
    spEnd(); await FXS.recoil(mv);
  },
  async 106(mv){ // 終焉の一斉射撃
    const d=dirPE(),p=center(P,.4); await spStart(mv,'#c2300f','#4a12a0',.66);
    const pts=[];
    for(let i=0;i<7;i++){const a=Math.atan2(d.y,d.x)+Math.PI+(i-3)*.42,pt={x:p.x+Math.cos(a)*85+d.x*30,y:p.y+Math.sin(a)*70-30};
      pts.push(pt); addP({type:'circle',x:pt.x,y:pt.y,r:20,sy:1,life:1.9,color:i%2?'#e6c8ff':'#ffd2a0',glow:i%2?'#7a35d8':'#ff5a1f',sp2:4}); await wait(55);}
    await wait(160);
    const c=center(EN),all=[];
    for(let i=0;i<16;i++){
      const pt=pts[i%7],k=i%2?'dark':'fire',e=EL[k];
      const pr=proj({x:pt.x,y:pt.y,r:6,c:e.c,g:e.g,el:k});
      const tx=c.x+R(-26,26),ty=c.y+R(-26,22);
      all.push(tw(pr,{x:tx,y:ty},170,E_.inQ).then(()=>{unproj(pr); burst({x:tx,y:ty},k,4,.6); EN.flash=.7; tw(EN,{flash:0},90);
        shake(.07,.6);}));
      await wait(48);
    }
    await Promise.all(all);
    flashO.a=.5; tw(flashO,{a:0},300);
    ring(c,'#ff7a1a',170,.5,14); ring(c,'#7a35d8',120,.45,12); burst(c,'fire',26,1.4); burst(c,'dark',20,1.4);
    await impact(EN,null,d,{stop:120,tr:.85,kb:30,big:true});
    spEnd(); await FXS.recoil(mv);
  },
  async 107(mv){ // オーバーブレイク
    const d=dirPE(),c=center(EN),p=center(P,.5); await spStart(mv,'#b8102e','#3a0a14');
    addP({type:'shield',x:c.x,y:c.y,size:80,life:1.25,color:'#9fd8ff'});
    tw(P,{glow:1},250);
    for(let i=0;i<3;i++){ringIn(p,i%2?'#ffffff':'#ff2d55',130-i*14,.36,6); await wait(110);}
    await tw(P,{x:-d.x*26,y:-d.y*26,sx:1.1,sy:.88},150);
    await tw(P,{x:d.x*d.L*.3,y:d.y*d.L*.3,sx:.93,sy:1.08},90,E_.inQ);
    EN.flash=.6; await hitStop(90);
    for(let i=0;i<22;i++){const a=R(0,6.28),sp=R(200,500); addP({type:'shard',x:c.x+Math.cos(a)*50,y:c.y+Math.sin(a)*55,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,grav:700,drag:.9,life:R(.4,.8),size:R(5,9),color:'#cfeaff',core:'#fff'});}
    parts.filter(q=>q.type==='shield').forEach(q=>q.age=q.life);
    tag(c,'ガード貫通','#ffb0c0'); shake(.3);
    await wait(90);
    flashO.a=.65; tw(flashO,{a:0},280);
    const a=Math.atan2(d.y,d.x); slash(c,a+1.1,1.7,'#ffffff','#ff2d55',200); slash(c,a-1.1,1.5,'#ffd0d8','#ff2d55',190);
    cracks(c,8,130,'#ff2d55'); burst(c,'normal',22,1.4,d);
    await impact(EN,null,d,{stop:150,tr:1,kb:38,big:true});
    tw(P,{glow:0},300); await backTo(P,260); spEnd(); await FXS.recoil(mv);
  },
  async 108(mv){ // オーバードレイン
    const d=dirPE(),c=center(EN),p=center(P,.5); await spStart(mv,'#9a0f2a','#1f7a3a');
    ringIn(c,'#ff2d55',150,.4,6); await wait(200);
    for(let i=0;i<7;i++){const a=i/7*6.28; addP({type:'cone',x:c.x+Math.cos(a)*12,y:c.y+Math.sin(a)*12,dx:-Math.cos(a),dy:-Math.sin(a),len:90,size:8,life:.36,color:'#ffd0d8',glow:'#c2183f'}); await wait(30);}
    await impact(EN,null,d,{stop:110,tr:.7,kb:20,big:true});
    const all=[];
    for(let i=0;i<14;i++){
      const side=(i%2?1:-1)*R(60,140);
      const pr=proj({x:c.x,y:c.y,r:R(5,8),c:i%3?'#eaffea':'#ffd0d8',g:i%3?'#3fd86a':'#ff2d55',t:0,path:[c.x+R(-20,20),c.y+R(-20,20),(c.x+p.x)/2-d.y*side,(c.y+p.y)/2+d.x*side,p.x,p.y]});
      all.push(tw(pr,{t:1},R(380,520),E_.inOut).then(()=>unproj(pr))); await wait(40);
    }
    tw(P,{glow:1},300);
    await Promise.all(all);
    cueHpDelta('drain');
    ring(p,'#9ff5b0',110,.5,10); ring(p,'#ffffff',70,.4,6);
    for(let i=0;i<10;i++) addP({type:'plus',x:p.x+R(-50,50),y:p.y+R(-10,40),vy:-R(60,130),drag:1,life:R(.6,.9),size:R(5,8),color:'#eaffea',glow:'#3fd86a'});
    tw(P,{glow:0},500); spEnd(); await wait(300);
  },
  async 109(mv){ // オーバードライブ
    const p=center(P,.5),base=center(P,.92); await spStart(mv,'#d0400f','#8a6a00');
    addP({type:'circle',x:base.x,y:base.y,r:110,sy:.34,life:1.6,color:'#ffe2b0',glow:'#ff7a1a',sp2:2});
    await wait(150);
    addP({type:'pillar',x:base.x,y:base.y,w:150,h:300,life:1.3,color:'#ffd27a',glow:'rgba(255,90,30,.7)'});
    tw(P,{glow:1,sx:1.06,sy:1.06},300,E_.back);
    for(let i=0;i<12;i++){addP({type:'arrow',x:p.x+R(-60,60),y:p.y+R(0,70),vy:-R(180,280),drag:1,life:.6,size:R(9,14),color:'#fff0c0',glow:'#ff5a1a'});
      if(i%3===0) elP('fire',p.x+R(-50,50),base.y,R(-20,20),-R(150,300),R(.4,.7),R(4,7)); await wait(55);}
    flashO.a=.3; tw(flashO,{a:0},260); shake(.35);
    ring(p,'#ffb347',130,.45,12);
    addP({type:'shield',x:p.x+16,y:p.y,size:70,life:.9,color:'#ffd27a'});
    contact(); tag(p,'攻撃UP','#ffd27a'); await wait(260); tag({x:p.x,y:p.y+34},'被ダメ軽減','#cfeaff');
    await tw(P,{sx:1,sy:1},260); tw(P,{glow:.0},700); spEnd(); await wait(400);
  },
  async 110(mv){ // オーバーリバース
    const p=center(P,.5); await spStart(mv,'#0f8a70','#1a5aa8');
    addP({type:'clock',x:p.x,y:p.y,r:105,life:1.6,color:'#e0fff4',glow:'#3fd8b0'});
    for(let i=0;i<8;i++){inward(p,'light',4,150,.4); await wait(70);}
    P.flash=.9; tw(P,{flash:0},400); tw(P,{glow:1},200);
    for(let i=0;i<14;i++) addP({type:'star4',x:p.x+R(-60,60),y:p.y+R(0,60),vy:-R(120,260),drag:.97,life:R(.5,.9),size:R(4,8),color:'#ffffff',glow:'#9fe8ff'});
    for(let i=0;i<9;i++) addP({type:'plus',x:p.x+R(-55,55),y:p.y+R(-10,45),vy:-R(60,130),drag:1,life:R(.6,1),size:R(5,8),color:'#eaffea',glow:'#3fd86a'});
    ring(p,'#9ff5d8',120,.5,10);
    contact();
    await wait(220); tag(p,'状態回復','#d8fff0');
    addP({type:'shield',x:p.x+16,y:p.y,size:68,life:.9,color:'#9fe8ff'});
    tw(P,{glow:0},600); spEnd(); await wait(450);
  }
  };
};
