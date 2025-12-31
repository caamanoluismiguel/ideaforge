(function(){
'use strict';

const T={
en:{record:'Record Idea',recording:'Tap to Stop',toastOk:'Idea saved!',toastDel:'Deleted',toastWelcome:'Welcome!',toastRec:'Recording...',toastTrans:'Transcribed!',toastErr:'Error',toastApi:'Enter valid API key',toastProf:'Select profession',toastNeed:'Need 3+ ideas',toastCopied:'Copied!',toastApiOk:'API works!',toastApiFail:'API invalid',discard:'Discard?',discardT:'Changes lost.',delIdea:'Delete?',delIdeaT:'Cannot undo.',all:'All',emptyT:'Your first idea awaits',emptyD:'Tap mic to capture',connEmpty:'No connections',connNeed:'Need 3+ ideas',catBusiness:'Business',catProduct:'Product',catContent:'Content',catPersonal:'Personal',catTech:'Tech',catAdd:'+ New',mStrategist:'Strategist',mStrategistR:'Market viability',mCritic:'Critic',mCriticR:'Finds flaws',mCreative:'Creative',mCreativeR:'Expands ideas',mPragmatic:'Pragmatic',mPragmaticR:'Execution',mInvestor:'Investor',mInvestorR:'ROI',mUser:'User',mUserR:'Customer view',colliderNeed:'Need 4+ ideas',colliderLimit:'Daily limit reached',collisionSaved:'Collision saved!',selectTwo:'Select two ideas',alreadyCollided:'Already collided'},
es:{record:'Grabar',recording:'Detener',toastOk:'¡Guardada!',toastDel:'Eliminada',toastWelcome:'¡Bienvenido!',toastRec:'Grabando...',toastTrans:'¡Transcrito!',toastErr:'Error',toastApi:'API key inválida',toastProf:'Selecciona profesión',toastNeed:'Necesitas 3+ ideas',toastCopied:'¡Copiado!',toastApiOk:'¡API funciona!',toastApiFail:'API inválida',discard:'¿Descartar?',discardT:'Se perderán cambios.',delIdea:'¿Eliminar?',delIdeaT:'No se puede deshacer.',all:'Todas',emptyT:'Tu primera idea',emptyD:'Toca mic',connEmpty:'Sin conexiones',connNeed:'Necesitas 3+ ideas',catBusiness:'Negocio',catProduct:'Producto',catContent:'Contenido',catPersonal:'Personal',catTech:'Tech',catAdd:'+ Nueva',mStrategist:'Estratega',mStrategistR:'Viabilidad',mCritic:'Crítico',mCriticR:'Fallas',mCreative:'Creativo',mCreativeR:'Expande',mPragmatic:'Pragmático',mPragmaticR:'Ejecución',mInvestor:'Inversor',mInvestorR:'ROI',mUser:'Usuario',mUserR:'Cliente',colliderNeed:'Necesitas 4+ ideas',colliderLimit:'Límite diario',collisionSaved:'¡Colisión guardada!',selectTwo:'Selecciona dos ideas',alreadyCollided:'Ya colisionadas'}
};

let S={user:null,ideas:[],cats:[{id:'business',emoji:'💼',color:'#00d4aa'},{id:'product',emoji:'📦',color:'#7c3aed'},{id:'content',emoji:'✍️',color:'#f59e0b'},{id:'personal',emoji:'🌱',color:'#ec4899'},{id:'tech',emoji:'🔧',color:'#3b82f6'}],conns:[],cur:null,selMentor:null,selCat:null,isRec:false,mr:null,chunks:[],recStart:0,recInt:null,step:1,searchQ:'',confirmCb:null,collisions:[],collidedPairs:[],collisionDate:null,collisionsToday:0,colliderTab:'discovered',selectedIdeas:[]};

const MENTORS={strategist:{av:'🎯',n:'mStrategist',r:'mStrategistR'},critic:{av:'🔥',n:'mCritic',r:'mCriticR'},creative:{av:'✨',n:'mCreative',r:'mCreativeR'},pragmatic:{av:'🔨',n:'mPragmatic',r:'mPragmaticR'},investor:{av:'💰',n:'mInvestor',r:'mInvestorR'},user:{av:'👤',n:'mUser',r:'mUserR'}};
const MPROMPTS={strategist:'Business strategist. Analyze market, competition. Be direct.',critic:'Brutal critic. Find ALL flaws. End with ONE fix.',creative:'Visionary. EXPAND: 10x bigger?',pragmatic:'COO. First step, resources, MVP time.',investor:'Investor. Cost, return, scalability.',user:'End user. Would you pay? Frustrations?'};
const DAILY_LIMIT=5;

const $=id=>document.getElementById(id),$$=s=>document.querySelectorAll(s),t=k=>(T[S.user?.lang||'en']||T.en)[k]||k,haptic=(p=10)=>{if('vibrate'in navigator)navigator.vibrate(p)};
const esc=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML};
const today=()=>new Date().toISOString().split('T')[0];
const skeleton=()=>'<div class="skeleton skeleton-line"></div>'.repeat(4)+'<div class="skeleton skeleton-line" style="width:60%"></div>';

const load=()=>{try{const d=localStorage.getItem('spora-data');if(d){const p=JSON.parse(d);S={...S,...p};S.collisions=S.collisions||[];S.collidedPairs=S.collidedPairs||[];S.selectedIdeas=[]}}catch(e){console.error('Load:',e)}};
const save=()=>{try{localStorage.setItem('spora-data',JSON.stringify({user:S.user,ideas:S.ideas,cats:S.cats,conns:S.conns,collisions:S.collisions,collidedPairs:S.collidedPairs,collisionDate:S.collisionDate,collisionsToday:S.collisionsToday}))}catch(e){}};
const toast=(m,type='')=>{const el=$('toast');el.textContent=m;el.className='toast show'+(type?' '+type:'');setTimeout(()=>el.classList.remove('show'),3000)};
const showConfirm=(icon,title,text,okText,cb)=>{$('confIcon').textContent=icon;$('confTitle').textContent=title;$('confText').textContent=text;$('confYes').textContent=okText;S.confirmCb=cb;$('confirmO').classList.add('show');haptic()};

const goTo=scr=>{haptic();$$('.screen').forEach(s=>s.classList.remove('active'));$(scr).classList.add('active');$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.s===scr));const showNav=!['onboarding','capture','detail'].includes(scr);$('nav').style.display=showNav?'':'none';$('fabWrap').style.display=['main','connections'].includes(scr)?'':'none';if(scr==='main'){renderIdeas();updateStats()}if(scr==='capture')resetCapture();if(scr==='settings')updateSettings();if(scr==='connections'){checkDailyReset();renderConnectionsTab()}};

const updateStep=()=>{$$('.step').forEach(s=>s.classList.toggle('active',+s.dataset.s===S.step));$$('.progress-dot').forEach(d=>{const n=+d.dataset.s;d.classList.remove('done','cur');if(n<S.step)d.classList.add('done');else if(n===S.step)d.classList.add('cur')})};
const nextStep=()=>{haptic();if(S.step===2){const sel=document.querySelector('#profOpts .opt.sel');const custom=$('customProf').value.trim();if(!sel&&!custom){toast(t('toastProf'),'err');return}S.user=S.user||{};S.user.profession=custom||sel.dataset.v}if(S.step===3)S.user.context=$('userCtx').value.trim();if(S.step<4){S.step++;updateStep()}};
const prevStep=()=>{haptic();if(S.step>1){S.step--;updateStep()}};
const complete=()=>{haptic([50,30,50]);const key=$('apiKey').value.trim();if(!key||!key.startsWith('sk-')){toast(t('toastApi'),'err');return}S.user.apiKey=key;save();goTo('main');toast(t('toastWelcome'),'ok')};

const renderIdeas=(filter='all')=>{const list=$('ideas');let ideas=S.searchQ?S.ideas.filter(i=>i.title.toLowerCase().includes(S.searchQ)||i.content.toLowerCase().includes(S.searchQ)):S.ideas;if(filter!=='all')ideas=ideas.filter(i=>i.category===filter);ideas.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||new Date(b.createdAt)-new Date(a.createdAt));if(!ideas.length){list.innerHTML=`<div class="empty"><div class="empty-icon">💭</div><h3>${t('emptyT')}</h3><p>${t('emptyD')}</p></div>`}else{list.innerHTML=ideas.map(i=>{const cat=S.cats.find(c=>c.id===i.category)||S.cats[0];const date=new Date(i.createdAt).toLocaleDateString(S.user?.lang||'en',{month:'short',day:'numeric'});const fb=i.feedback?.length||0;const catKey='cat'+cat.id.charAt(0).toUpperCase()+cat.id.slice(1);const catName=t(catKey)!==catKey?t(catKey):cat.id;return`<div class="idea${i.pinned?' pinned':''}" data-id="${i.id}">${i.pinned?'<div class="idea-pin">📌</div>':''}<div class="idea-accent" style="background:${cat.color}"></div><div class="idea-top"><span class="idea-badge" style="color:${cat.color};background:${cat.color}20">${cat.emoji} ${catName}</span><span class="idea-date">${date}</span></div><div class="idea-title">${esc(i.title)}</div><p class="idea-preview">${esc(i.content)}</p>${fb?`<div class="idea-footer"><span>🧠 ${fb}</span></div>`:''}</div>`}).join('')}renderFilters()};
const renderFilters=()=>{const used=[...new Set(S.ideas.map(i=>i.category))];let html=`<div class="flt active" data-f="all">${t('all')}</div>`;used.forEach(id=>{const cat=S.cats.find(c=>c.id===id);if(cat)html+=`<div class="flt" data-f="${id}">${cat.emoji}</div>`});$('filters').innerHTML=html};
const updateStats=()=>{$('sIdeas').textContent=S.ideas.length;$('sMentored').textContent=S.ideas.filter(i=>i.feedback?.length).length;$('sFb').textContent=S.ideas.reduce((s,i)=>s+(i.feedback?.length||0),0)};
const viewIdea=id=>{haptic();const idea=S.ideas.find(i=>i.id===id);if(!idea)return;S.cur=idea;S.selMentor=null;const cat=S.cats.find(c=>c.id===idea.category)||S.cats[0];const catKey='cat'+cat.id.charAt(0).toUpperCase()+cat.id.slice(1);const catName=t(catKey)!==catKey?t(catKey):cat.id;const date=new Date(idea.createdAt).toLocaleDateString(S.user?.lang||'en',{year:'numeric',month:'long',day:'numeric'});$('detBadge').textContent=`${cat.emoji} ${catName}`;$('detBadge').style.cssText=`color:${cat.color};background:${cat.color}20`;$('detTitle').textContent=idea.title;$('detDate').textContent=date;$('detContent').textContent=idea.content;$('detPin').classList.toggle('hidden',!idea.pinned);$('pinBtn').classList.toggle('active',!!idea.pinned);$$('.mentor').forEach(m=>m.classList.remove('sel'));$('mentorPanel').classList.remove('show');$('mentorFb').classList.remove('show');$('typing').classList.remove('show');renderFbHistory();goTo('detail')};
const renderFbHistory=()=>{const fb=S.cur?.feedback||[];$('fbHist').classList.toggle('show',fb.length>0);if(fb.length){$('fbList').innerHTML=fb.map(f=>{const m=MENTORS[f.mentor];const date=new Date(f.date).toLocaleDateString(S.user?.lang||'en',{month:'short',day:'numeric'});return`<div class="fb-item"><div class="fb-item-head"><span class="fb-item-mentor">${m?.av||'🧠'} ${t(m?.n||f.mentor)}</span><span class="fb-item-date">${date}</span></div><div class="fb-item-text">${esc(f.feedback)}</div></div>`}).join('')}};
const resetCapture=()=>{$('capPh').classList.remove('hidden');$('capTa').classList.add('hidden');$('capTa').value='';$('capBox').classList.remove('has','rec');$('ideaTitle').value='';$('saveBtn').disabled=true;$$('.cat-chip').forEach(c=>c.classList.remove('sel'));S.selCat=null;if(S.isRec)stopRec()};
const renderCats=()=>{$('catGrid').innerHTML=S.cats.map(c=>{const catKey='cat'+c.id.charAt(0).toUpperCase()+c.id.slice(1);const catName=t(catKey)!==catKey?t(catKey):c.id;return`<div class="cat-chip" data-c="${c.id}">${c.emoji} ${catName}</div>`}).join('')+`<div class="cat-chip add" id="addCatBtn">${t('catAdd')}</div>`};
const renderMentors=()=>{$('mentors').innerHTML=Object.entries(MENTORS).map(([id,m])=>`<div class="mentor" data-m="${id}"><div class="mentor-av">${m.av}</div><div class="mentor-name">${t(m.n)}</div><div class="mentor-role">${t(m.r)}</div></div>`).join('')};
const saveIdea=async()=>{haptic([50,30,50]);const content=$('capTa').value.trim();let title=$('ideaTitle').value.trim();const category=S.selCat||'business';if(!content)return;const btn=$('saveBtn');btn.disabled=true;btn.innerHTML='<div class="spinner"></div>';if(!title)title=await genTitle(content);S.ideas.unshift({id:Date.now().toString(),title,content,category,createdAt:new Date().toISOString(),feedback:[],pinned:false});save();btn.textContent='Save Idea';toast(t('toastOk'),'ok');goTo('main')};
const genTitle=async content=>{try{const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:`Generate short title (max 6 words) for: ${content}`}],max_tokens:30})});const data=await res.json();return data.choices[0].message.content.trim().replace(/^["']|["']$/g,'')}catch(e){return content.substring(0,40)+'...'}};

const toggleRec=async()=>{if(S.isRec)stopRec();else await startRec()};
const startRec=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});S.mr=new MediaRecorder(stream);S.chunks=[];S.mr.ondataavailable=e=>{if(e.data.size>0)S.chunks.push(e.data)};S.mr.onstop=async()=>{const blob=new Blob(S.chunks,{type:'audio/webm'});await transcribe(blob);stream.getTracks().forEach(t=>t.stop())};S.mr.start();S.isRec=true;S.recStart=Date.now();$('voiceBtn').classList.add('rec');$('voiceT').textContent=t('recording');$('capBox').classList.add('rec');$('recBar').classList.add('show');$('fab').classList.add('rec');S.recInt=setInterval(()=>{const e=Math.floor((Date.now()-S.recStart)/1000);$('recTime').textContent=`${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`},1000);haptic([50,30,50]);toast(t('toastRec'),'ok')}catch(e){toast(t('toastErr')+': '+e.message,'err')}};
const stopRec=()=>{if(S.mr&&S.isRec){S.mr.stop();S.isRec=false;$('voiceBtn').classList.remove('rec');$('voiceT').textContent=t('record');$('capBox').classList.remove('rec');$('recBar').classList.remove('show');$('fab').classList.remove('rec');clearInterval(S.recInt);haptic([30,20,30])}};
const transcribe=async blob=>{toast('Transcribing...','ok');const fd=new FormData();fd.append('file',blob,'rec.webm');fd.append('model','whisper-1');fd.append('language',S.user?.lang||'en');try{const res=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{'Authorization':`Bearer ${S.user.apiKey}`},body:fd});if(!res.ok)throw new Error('Failed');const data=await res.json();$('capPh').classList.add('hidden');$('capTa').classList.remove('hidden');$('capTa').value=data.text;$('capBox').classList.add('has');$('saveBtn').disabled=false;haptic([50,30,50]);toast(t('toastTrans'),'ok')}catch(e){toast(t('toastErr'),'err')}};

const selectMentor=id=>{haptic();S.selMentor=id;const m=MENTORS[id];$$('.mentor').forEach(c=>c.classList.toggle('sel',c.dataset.m===id));$('selAv').textContent=m.av;$('selN').textContent=t(m.n);$('selR').textContent=t(m.r);$('mentorPanel').classList.add('show');$('mentorFb').classList.remove('show');$('typing').classList.remove('show')};
const askMentor=async()=>{if(!S.selMentor||!S.cur)return;haptic();$('askBtn').disabled=true;$('typing').classList.add('show');const lang=S.user?.lang||'en';try{const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:`${MPROMPTS[S.selMentor]} Respond in ${lang==='es'?'Spanish':'English'}. Context: ${S.user.profession}. ${S.user.context||''}`},{role:'user',content:`Idea: "${S.cur.title}"\n\n${S.cur.content}`}],max_tokens:500})});const data=await res.json();if(data.error)throw new Error(data.error.message);const fb=data.choices[0].message.content;S.cur.feedback=S.cur.feedback||[];S.cur.feedback.push({mentor:S.selMentor,feedback:fb,date:new Date().toISOString()});save();updateStats();$('fbText').textContent=fb;$('mentorFb').classList.add('show');renderFbHistory();haptic([50,30,50])}catch(e){toast(t('toastErr'),'err')}$('typing').classList.remove('show');$('askBtn').disabled=false};
const showInsights=async()=>{haptic();$('insModal').classList.add('show');$('insBody').innerHTML=skeleton();try{const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:`Insights: 💎 Value, 🎯 Audience, ⚠️ Risk, 🚀 Opportunity. ${S.user?.lang==='es'?'Spanish':'English'}.`},{role:'user',content:`Context: ${S.user.profession}. Idea: "${S.cur.title}" ${S.cur.content}`}],max_tokens:600})});const data=await res.json();if(data.error)throw new Error(data.error.message);$('insBody').textContent=data.choices[0].message.content}catch(e){$('insBody').textContent=t('toastErr')+': '+e.message}};
const showRoadmap=async()=>{haptic();$('roadModal').classList.add('show');$('roadBody').innerHTML=skeleton();try{const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:`Roadmap: 📅 Week 1, 📅 Weeks 2-4, 📅 Month 2-3, 💰 Cost, ⏱️ MVP. ${S.user?.lang==='es'?'Spanish':'English'}.`},{role:'user',content:`Context: ${S.user.profession}. Idea: "${S.cur.title}" ${S.cur.content}`}],max_tokens:800})});const data=await res.json();if(data.error)throw new Error(data.error.message);$('roadBody').textContent=data.choices[0].message.content}catch(e){$('roadBody').textContent=t('toastErr')+': '+e.message}};

const renderConns=()=>{const n=Math.min(S.ideas.length,3);$('connProgT').textContent=`${S.ideas.length} of 3 ideas`;$('connProgF').style.width=`${(n/3)*100}%`;$('connProg').style.display=S.ideas.length>=3?'none':'';const list=$('conns');const autoConns=S.conns.filter(c=>!c.type||c.type==='auto');if(!autoConns.length){list.innerHTML=`<div class="empty"><div class="empty-icon">🔗</div><h3>${t('connEmpty')}</h3><p>${t('connNeed')}</p></div>`}else{list.innerHTML=autoConns.map(c=>`<div class="conn"><div class="conn-theme">🔗 ${c.theme}</div><div class="conn-ideas">${c.ideas.map(title=>{const idea=S.ideas.find(i=>i.title===title);return`<div class="conn-item"${idea?` data-id="${idea.id}"`:``}>${esc(title)}</div>`}).join('')}</div><div class="conn-insight">${esc(c.insight)}</div></div>`).join('')}};
const findConns=async()=>{if(S.ideas.length<3){toast(t('toastNeed'),'err');return}haptic();const btn=$('findBtn');btn.disabled=true;btn.innerHTML='<div class="spinner" style="display:inline-block;vertical-align:middle;margin-right:8px"></div>Analyzing...';const lang=S.user?.lang||'en';const summary=S.ideas.map(i=>`- ${i.title}: ${i.content.substring(0,80)}`).join('\n');try{const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:`Find 2-3 groups. JSON only: {"connections":[{"theme":"...","ideas":["t1","t2"],"insight":"..."}]}. ${lang==='es'?'Spanish':'English'}.`},{role:'user',content:`Ideas:\n${summary}`}],max_tokens:800})});const data=await res.json();let content=data.choices[0].message.content.replace(/```json\n?|\n?```/g,'').trim();const parsed=JSON.parse(content);S.conns=parsed.connections.map(c=>({...c,type:'auto'}));save();renderConns();haptic([50,30,50])}catch(e){toast(t('toastErr'),'err')}btn.disabled=false;btn.innerHTML='🔍 Find Connections'};
const renderConnectionsTab=()=>{$('tabDiscovered').classList.toggle('active',S.colliderTab==='discovered');$('tabCollider').classList.toggle('active',S.colliderTab==='collider');$('connDiscovered').classList.toggle('hidden',S.colliderTab!=='discovered');$('connCollider').classList.toggle('hidden',S.colliderTab!=='collider');if(S.colliderTab==='discovered')renderConns();else renderCollider()};
const switchTab=tab=>{haptic();S.colliderTab=tab;S.selectedIdeas=[];renderConnectionsTab()};

const checkDailyReset=()=>{const td=today();if(S.collisionDate!==td){S.collisionDate=td;S.collisionsToday=0;save()}};
const getPairKey=(idA,idB)=>idA<idB?`${idA}-${idB}`:`${idB}-${idA}`;
const isPairUsed=(idA,idB)=>S.collidedPairs.includes(getPairKey(idA,idB));

const getColliderState=()=>{if(S.ideas.length<4)return'empty';if(S.collisionsToday>=DAILY_LIMIT)return'limit';return'ready'};

const renderCollider=()=>{
  const state=getColliderState();
  $('colliderEmpty').classList.add('hidden');
  $('colliderLimit').classList.add('hidden');
  $('colliderReady').classList.add('hidden');
  $('colliderResult').classList.add('hidden');
  
  if(state==='empty'){
    $('colliderEmpty').classList.remove('hidden');
    $('colliderEmptyCount').textContent=`You have ${S.ideas.length} idea${S.ideas.length!==1?'s':''}.`;
  }else if(state==='limit'){
    $('colliderLimit').classList.remove('hidden');
    renderTodayCollisions();
  }else{
    $('colliderReady').classList.remove('hidden');
    renderColliderGrid();
  }
};

const renderTodayCollisions=()=>{
  const td=today();
  const tc=S.collisions.filter(c=>c.date.startsWith(td));
  $('todayCollisions').innerHTML=tc.length?`<div style="margin-top:20px;text-align:left">${tc.map(c=>`<div class="collision-hist-item"><div class="collision-hist-title">${esc(c.title)}</div><div class="collision-hist-parents">${esc(c.ideaA.title)} ⚡ ${esc(c.ideaB.title)}</div></div>`).join('')}</div>`:'';
};

const renderColliderGrid=()=>{
  $('colliderRemaining').textContent=`${DAILY_LIMIT-S.collisionsToday}/${DAILY_LIMIT}`;
  
  const grid=$('colliderGrid');
  grid.innerHTML=S.ideas.map(idea=>{
    const cat=S.cats.find(c=>c.id===idea.category)||S.cats[0];
    const isSelected=S.selectedIdeas.includes(idea.id);
    
    let usedWithSelected=false;
    if(S.selectedIdeas.length===1&&S.selectedIdeas[0]!==idea.id){
      usedWithSelected=isPairUsed(S.selectedIdeas[0],idea.id);
    }
    
    return`<div class="collider-card${isSelected?' selected':''}${usedWithSelected?' used':''}" data-id="${idea.id}">
      <div class="collider-card-cat">${cat.emoji} ${cat.id}</div>
      <div class="collider-card-title">${esc(idea.title)}</div>
    </div>`;
  }).join('');
  
  updateSelectionBar();
};

const toggleIdeaSelection=id=>{
  haptic();
  const idx=S.selectedIdeas.indexOf(id);
  
  if(idx>-1){
    S.selectedIdeas.splice(idx,1);
  }else{
    if(S.selectedIdeas.length===1&&isPairUsed(S.selectedIdeas[0],id)){
      toast(t('alreadyCollided'),'err');
      return;
    }
    if(S.selectedIdeas.length<2){
      S.selectedIdeas.push(id);
    }else{
      if(isPairUsed(S.selectedIdeas[0],id)){
        toast(t('alreadyCollided'),'err');
        return;
      }
      S.selectedIdeas[1]=id;
    }
  }
  
  renderColliderGrid();
};

const updateSelectionBar=()=>{
  const bar=$('colliderSelection');
  if(S.selectedIdeas.length===0){
    bar.classList.remove('show');
    return;
  }
  
  bar.classList.add('show');
  
  const ideaA=S.ideas.find(i=>i.id===S.selectedIdeas[0]);
  const ideaB=S.selectedIdeas.length>1?S.ideas.find(i=>i.id===S.selectedIdeas[1]):null;
  
  $('selIdeaA').textContent=ideaA?ideaA.title:'-';
  $('selIdeaB').textContent=ideaB?ideaB.title:'?';
  
  $('collideBtn').disabled=S.selectedIdeas.length<2;
};

const performCollision=async()=>{
  if(S.selectedIdeas.length<2)return;
  if(S.collisionsToday>=DAILY_LIMIT){toast(t('colliderLimit'),'err');return}
  
  haptic([50,30,100]);
  
  $('collisionFlash').classList.add('show');
  setTimeout(()=>$('collisionFlash').classList.remove('show'),300);
  
  $('colliderReady').classList.add('hidden');
  $('colliderResult').classList.remove('hidden');
  
  $('collisionTitle').textContent='✨ Generating...';
  $('collisionSynthesis').innerHTML=skeleton();
  
  const ideaA=S.ideas.find(i=>i.id===S.selectedIdeas[0]);
  const ideaB=S.ideas.find(i=>i.id===S.selectedIdeas[1]);
  
  $('collisionParentA').textContent=ideaA.title;
  $('collisionParentB').textContent=ideaB.title;
  
  const lang=S.user?.lang||'en';
  try{
    const res=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.user.apiKey}`},
      body:JSON.stringify({
        model:'gpt-4o',
        messages:[
          {role:'system',content:`You are an innovation catalyst. Create unexpected connections.\nRespond ONLY with JSON: {"title":"Creative Name (2-4 words)","synthesis":"One paragraph (<50 words) explaining fusion"}\nRespond in ${lang==='es'?'Spanish':'English'}.`},
          {role:'user',content:`Collide these ideas:\n\nIDEA A: "${ideaA.title}"\n${ideaA.content}\n\nIDEA B: "${ideaB.title}"\n${ideaB.content}\n\nCreate a surprising fusion.`}
        ],
        max_tokens:200
      })
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    let content=data.choices[0].message.content.replace(/```json\n?|\n?```/g,'').trim();
    const result=JSON.parse(content);
    
    $('collisionTitle').textContent=result.title;
    $('collisionSynthesis').textContent=result.synthesis;
    
    S.pendingCollision={
      id:'col_'+Date.now(),
      type:'collision',
      ideaA:{id:ideaA.id,title:ideaA.title,preview:ideaA.content.substring(0,60)},
      ideaB:{id:ideaB.id,title:ideaB.title,preview:ideaB.content.substring(0,60)},
      title:result.title,
      synthesis:result.synthesis,
      date:new Date().toISOString()
    };
  }catch(e){
    $('collisionTitle').textContent='Error';
    $('collisionSynthesis').textContent=t('toastErr')+': '+e.message;
    S.pendingCollision=null;
  }
};

const saveCollision=()=>{
  if(!S.pendingCollision)return;
  haptic([50,30,50]);
  
  S.collisions.unshift(S.pendingCollision);
  S.collidedPairs.push(getPairKey(S.selectedIdeas[0],S.selectedIdeas[1]));
  S.collisionsToday++;
  save();
  
  toast(t('collisionSaved'),'ok');
  S.pendingCollision=null;
  S.selectedIdeas=[];
  renderCollider();
};
const backToGrid=()=>{
  haptic();
  S.pendingCollision=null;
  S.selectedIdeas=[];
  renderCollider();
};

const updateSettings=()=>{$('profV').textContent=S.user?.profession||'-';$('langV').textContent=S.user?.lang==='es'?'Español':'English';const k=S.user?.apiKey||'';$('apiV').textContent=k?'••••'+k.slice(-4):'••••'};
const testApiKey=async()=>{haptic();toast('Testing...','ok');try{const res=await fetch('https://api.openai.com/v1/models',{headers:{'Authorization':`Bearer ${S.user.apiKey}`}});toast(res.ok?t('toastApiOk'):t('toastApiFail'),res.ok?'ok':'err')}catch(e){toast(t('toastApiFail'),'err')}};
const exportData=()=>{haptic();const d={user:{...S.user,apiKey:undefined},ideas:S.ideas,cats:S.cats,conns:S.conns,collisions:S.collisions,collidedPairs:S.collidedPairs,at:new Date().toISOString()};const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`spora-${new Date().toISOString().split('T')[0]}.json`;a.click();toast('Exported','ok')};

const initEvents=()=>{
$('langOpts').onclick=e=>{const o=e.target.closest('.opt');if(!o)return;haptic();$$('#langOpts .opt').forEach(x=>x.classList.remove('sel'));o.classList.add('sel');S.user=S.user||{};S.user.lang=o.dataset.v};
$('profOpts').onclick=e=>{const o=e.target.closest('.opt');if(!o)return;haptic();$$('#profOpts .opt').forEach(x=>x.classList.remove('sel'));o.classList.add('sel');$('customProf').value=''};
$('customProf').oninput=function(){if(this.value.trim())$$('#profOpts .opt').forEach(x=>x.classList.remove('sel'))};
$('s1Next').onclick=nextStep;$('s2B').onclick=prevStep;$('s2N').onclick=nextStep;$('s3B').onclick=prevStep;$('s3N').onclick=nextStep;
$('s3Skip').onclick=e=>{e.preventDefault();S.step=4;updateStep()};$('s4B').onclick=prevStep;$('s4Done').onclick=complete;
$$('.nav-item').forEach(n=>n.onclick=()=>goTo(n.dataset.s));$('fab').onclick=()=>goTo('capture');
$('searchBtn').onclick=()=>{haptic();$('searchWrap').classList.toggle('open');if($('searchWrap').classList.contains('open'))$('searchIn').focus()};
$('searchX').onclick=()=>{haptic();S.searchQ='';$('searchIn').value='';$('searchWrap').classList.remove('open');renderIdeas()};
$('searchIn').oninput=function(){S.searchQ=this.value.toLowerCase();renderIdeas()};
$('filters').onclick=e=>{const f=e.target.closest('.flt');if(!f)return;haptic();$$('.flt').forEach(x=>x.classList.remove('active'));f.classList.add('active');renderIdeas(f.dataset.f)};
$('ideas').onclick=e=>{const c=e.target.closest('.idea');if(c)viewIdea(c.dataset.id)};
$('capBack').onclick=()=>{const has=$('capTa').value.trim();if(has)showConfirm('⚠️',t('discard'),t('discardT'),t('discard'),()=>goTo('main'));else goTo('main')};
$('voiceBtn').onclick=toggleRec;
$('capTa').oninput=function(){const h=this.value.trim();$('saveBtn').disabled=!h;$('capBox').classList.toggle('has',!!h)};
$('catGrid').onclick=e=>{const c=e.target.closest('.cat-chip');if(!c)return;if(c.id==='addCatBtn'){haptic();$('catModal').classList.add('show');return}haptic();$$('.cat-chip').forEach(x=>x.classList.remove('sel'));c.classList.add('sel');S.selCat=c.dataset.c};
$('saveBtn').onclick=saveIdea;$('detBack').onclick=()=>goTo('main');
$('pinBtn').onclick=()=>{haptic();if(!S.cur)return;S.cur.pinned=!S.cur.pinned;save();$('detPin').classList.toggle('hidden',!S.cur.pinned);$('pinBtn').classList.toggle('active',S.cur.pinned)};
$('shareBtn').onclick=()=>{haptic();if(!S.cur)return;$('shareTxt').value=`🌱 ${S.cur.title}\n\n${S.cur.content}`;$('shareModal').classList.add('show')};
$('editBtn').onclick=()=>{haptic();if(!S.cur)return;$('edTitle').value=S.cur.title;$('edContent').value=S.cur.content;$('editModal').classList.add('show')};
$('delBtn').onclick=()=>{if(!S.cur)return;showConfirm('🗑️',t('delIdea'),t('delIdeaT'),'Delete',()=>{S.ideas=S.ideas.filter(i=>i.id!==S.cur.id);save();toast(t('toastDel'));goTo('main')})};
$('insBtn').onclick=showInsights;$('roadBtn').onclick=showRoadmap;
$('mentors').onclick=e=>{const m=e.target.closest('.mentor');if(m)selectMentor(m.dataset.m)};
$('askBtn').onclick=askMentor;$('findBtn').onclick=findConns;
$('conns').onclick=e=>{const c=e.target.closest('.conn-item');if(c?.dataset.id)viewIdea(c.dataset.id)};
$('tabDiscovered').onclick=()=>switchTab('discovered');$('tabCollider').onclick=()=>switchTab('collider');
$('colliderGrid').onclick=e=>{const c=e.target.closest('.collider-card');if(c&&!c.classList.contains('used'))toggleIdeaSelection(c.dataset.id)};
$('collideBtn').onclick=performCollision;
$('saveCollisionBtn').onclick=saveCollision;
$('backToGridBtn').onclick=backToGrid;
$('setDone').onclick=()=>goTo('main');
$('editProf').onclick=()=>{haptic();const p=prompt('Profession:',S.user?.profession||'');if(p!==null){S.user=S.user||{};S.user.profession=p;save();updateSettings()}};
$('toggleLang').onclick=()=>{haptic();S.user.lang=S.user?.lang==='es'?'en':'es';save();updateSettings();renderCats();renderMentors();renderIdeas()};
$('editApi').onclick=()=>{haptic();const k=prompt('New API key:');if(k&&k.startsWith('sk-')){S.user.apiKey=k;save();updateSettings()}};
$('testApi').onclick=testApiKey;$('expBtn').onclick=exportData;$('impBtn').onclick=()=>{haptic();$('fileIn').click()};
$('clrBtn').onclick=()=>{showConfirm('🗑️','Delete All','Delete ALL data?','Delete',()=>{localStorage.removeItem('spora-data');location.reload()})};
$('fileIn').onchange=function(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.ideas){S.ideas=d.ideas;S.cats=d.cats||S.cats;S.conns=d.conns||[];S.collisions=d.collisions||[];S.collidedPairs=d.collidedPairs||[];save();renderIdeas();updateStats();renderCats();toast('Imported','ok')}}catch(er){toast(t('toastErr'),'err')}};r.readAsText(file);this.value=''};
$$('.modal-overlay').forEach(m=>m.onclick=e=>{if(e.target===m){haptic();m.classList.remove('show')}});
$$('.modal-close').forEach(b=>b.onclick=()=>{haptic();$(b.dataset.m).classList.remove('show')});
$('createCat').onclick=()=>{haptic();const name=$('catName').value.trim(),emoji=$('catEmoji').value.trim()||'📌';if(!name)return;const id=name.toLowerCase().replace(/\s+/g,'-');const colors=['#00d4aa','#7c3aed','#f59e0b','#ec4899','#3b82f6','#10b981'];S.cats.push({id,emoji,color:colors[S.cats.length%colors.length]});save();renderCats();$('catModal').classList.remove('show');$('catName').value='';$('catEmoji').value=''};
$('saveEdit').onclick=()=>{haptic();if(!S.cur)return;S.cur.title=$('edTitle').value.trim()||S.cur.title;S.cur.content=$('edContent').value.trim()||S.cur.content;save();$('detTitle').textContent=S.cur.title;$('detContent').textContent=S.cur.content;$('editModal').classList.remove('show');toast('Saved','ok')};
$('copyShare').onclick=()=>{haptic();const txt=$('shareTxt');navigator.clipboard.writeText(txt.value).then(()=>{toast(t('toastCopied'),'ok');$('shareModal').classList.remove('show')}).catch(()=>{txt.select();document.execCommand('copy');toast(t('toastCopied'),'ok');$('shareModal').classList.remove('show')})};
$('confNo').onclick=()=>{haptic();$('confirmO').classList.remove('show')};
$('confYes').onclick=()=>{haptic();$('confirmO').classList.remove('show');if(S.confirmCb)S.confirmCb()};
window.addEventListener('online',()=>$('offline').classList.remove('show'));
window.addEventListener('offline',()=>$('offline').classList.add('show'));
if(!navigator.onLine)$('offline').classList.add('show');
};

const init=()=>{console.log('SPORA v1.0 init');load();initEvents();renderCats();renderMentors();if(S.user?.apiKey)goTo('main');else goTo('onboarding');console.log('Ready!')};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
