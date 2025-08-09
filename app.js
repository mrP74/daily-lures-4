(() => {
  'use strict';
  const API_KEY_FALLBACK = 'YOUR_OPENWEATHERMAP_KEY';
  const LAKES = [
    {name:'Lake Winnebago', lat:44.0130, lon:-88.5374},
    {name:'Lake Mendota',  lat:43.1312, lon:-89.4125},
    {name:'Lake Monona',   lat:43.0726, lon:-89.3800},
    {name:'Pewaukee Lake', lat:43.0712, lon:-88.3231},
    {name:'Lake Geneva',   lat:42.5683, lon:-88.4756},
    {name:'Big Green Lake',lat:43.8400, lon:-88.9600},
    {name:'Lake Puckaway', lat:43.8200, lon:-89.1400},
    {name:'Castle Rock Lk',lat:43.8920, lon:-89.9300},
    {name:'Petenwell Lake',lat:44.1610, lon:-90.0470},
    {name:'Lake Wissota',  lat:44.9367, lon:-91.3250},
    {name:'Lake Koshkonong',lat:42.8847, lon:-88.9360},
    {name:'Lake DuBay',    lat:44.7430, lon:-89.6850}
  ];

  function generateLureLibrary(){
    const base = ['Texas rig worm','Ned rig','Wacky Senko','Jig and craw','Swim jig','Spinnerbait (willow)','Spinnerbait (colorado)','Chatterbait','Squarebill crank','Lipless crank','Deep crank','Underspin','Paddle-tail swimbait','Glide bait','Topwater popper','Walking bait','Hollow-body frog','Buzzbait','Suspending jerkbait','Floating jerkbait','Drop shot','Tube bait','Hair jig','Flutter spoon'];
    const clarity = ['clear','moderate','stained'];
    const times = ['dawn','morning','midday','evening','night'];
    const colors = {clear:['green pumpkin','watermelon red','ghost minnow','smelt','natural shad'], moderate:['bluegill','candy craw','chartreuse shad','sexy shad','perch'], stained:['black/blue','junebug','chartreuse/white','firetiger','red craw']};
    const retrieves = ['dead-stick 5-10s','slow roll grass edges','walk the dog','burn then pause','yo yo over grass','hop twice then rest','steady buzz over weeds','rip free from tops'];
    const out=[];
    for(const b of base){ for(const c of clarity){ for(const t of times){ const col=colors[c][Math.floor(Math.random()*colors[c].length)]; const tip=retrieves[Math.floor(Math.random()*retrieves.length)]; out.push({lure:b+' - '+col, clarity:c, time:t, details:b+' in '+col+' for '+c+' water ('+t+'): '+tip}); } } }
    return out;
  }
  const LURE_LIBRARY = generateLureLibrary(); // 360+ combos

  const $ = (id) => document.getElementById(id);
  const el = {
    date: $('date'), spot: $('spot'), temps: $('temps'), cond: $('cond'), lure: $('lure'),
    refresh: $('refresh'), radius: $('radius'), radiusOut: $('radiusOut'),
    locbtn: $('locbtn'), locstatus: $('locstatus'),
    spotTile: $('spotTile'), tempTile: $('tempTile'), condTile: $('condTile'),
    settings: $('settings'), dlg: $('dlg'), dlgSave: $('dlgSave'), dlgClose: $('dlgClose'), apikey: $('apikey'),
    lureDetail: $('lureDetail'), reset: $('reset'), debug: $('debug')
  };

  const getSaved = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(_) { return d; } };
  const setSaved = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} };

  el.radius.value = String(getSaved('radiusMi', 50));
  el.radiusOut.textContent = el.radius.value;
  const getAPIKey = () => getSaved('owmKey', API_KEY_FALLBACK);
  const setAPIKey = (k) => setSaved('owmKey', k);

  const milesBetween = (a, b) => {
    const R=3958.8, toRad=(x)=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
    const lat1=toRad(a.lat), lat2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  };
  const fmtDate = () => new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const setLoading = (is) => [el.spotTile, el.tempTile, el.condTile].forEach(n=>n.classList.toggle('skeleton', is));

  const timedFetchJSON = async (url, timeout=9000) => {
    const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(), timeout);
    try{ const res=await fetch(url,{signal:ctl.signal}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json(); }
    finally{ clearTimeout(to); }
  };
  const fetchWeather = (key, lake) => timedFetchJSON('https://api.openweathermap.org/data/2.5/weather?lat='+lake.lat+'&lon='+lake.lon+'&units=imperial&appid='+key);

  function inferClarity(wind, clouds){ if (wind >= 12 || clouds >= 70) return 'stained'; if (wind <= 7 && clouds <= 40) return 'clear'; return 'moderate'; }
  function timeBucket(){ const hr=new Date().getHours(); if(hr<6)return'dawn'; if(hr<11)return'morning'; if(hr<16)return'midday'; if(hr<20)return'evening'; return'night'; }
  function seasonBucket(){ const m=new Date().getMonth()+1; if(m<=2||m===12)return'winter'; if(m<=5)return'spring'; if(m<=8)return'summer'; return'fall'; }

  function chooseDetailedLure(ctx){
    const t=timeBucket(), s=seasonBucket(), clarity=inferClarity(ctx.wind, ctx.clouds);
    let best=null,bestScore=-1;
    for(const item of LURE_LIBRARY){
      let score=0;
      if(item.clarity===clarity)score+=2;
      if(item.time===t)score+=1;
      const w=ctx.water;
      if(w>=65 && w<=82 && item.lure.includes('Topwater'))score+=2;
      if(w<60 && (item.lure.includes('Drop shot')||item.lure.includes('Ned')||item.lure.includes('Hair')))score+=2;
      if(ctx.wind>=12 && (item.lure.includes('Spinner')||item.lure.includes('Chatter')||item.lure.includes('Lipless')))score+=1;
      if(score>bestScore){bestScore=score;best=item;}
    }
    const why=['Time: '+t,'Season: '+s,'Clarity: '+clarity,'Wind: '+ctx.wind.toFixed(0)+' mph','Water est: '+ctx.water.toFixed(0)+' F'].join(' | ');
    return { name: best.lure, details: best.details, why };
  }

  function clearUI(message){
    el.spot.textContent = message || 'No lakes within selected radius.';
    el.temps.textContent = 'Air: - | Water: -';
    el.cond.textContent = 'Conditions: -';
    el.lure.textContent = '-';
    el.lureDetail.textContent = '';
  }

  async function computeBest(){
    const userPos = getSaved('userPos', null);
    const radiusMi = Number(el.radius.value||50);
    const key = getAPIKey();

    el.debug.textContent = 'radius='+radiusMi+' mi | userPos='+(userPos? (userPos.lat.toFixed(3)+','+userPos.lon.toFixed(3)) : 'none');

    if(!key || key==='YOUR_OPENWEATHERMAP_KEY') return {ok:false, reason:'NO_KEY'};
    if(!userPos) return {ok:false, reason:'NO_GEO'};

    const candidates = LAKES.map(l=>({...l, miles: milesBetween(userPos,{lat:l.lat,lon:l.lon})}))
                           .filter(l=>l.miles<=radiusMi)
                           .sort((a,b)=>a.miles-b.miles);

    if(!candidates.length) return {ok:false, reason:'NO_CANDIDATES', radius: radiusMi};

    const results = await Promise.allSettled(candidates.map(async lake=>({ lake, wx: await fetchWeather(key, lake) })));

    let best=null, diffBest=Infinity;
    for(const r of results){
      if(r.status!=='fulfilled') continue;
      const {lake, wx}=r.value;
      const air=wx.main.temp, wind=wx.wind?.speed||0, clouds=wx.clouds?.all||0;
      const water=Math.max(40, air-5);
      const diff=Math.abs(water-68);
      const lurePick=chooseDetailedLure({water, wind, clouds, cover:'open'});
      const cand={name:lake.name, air, water, cond:wx.weather[0].main, lure:lurePick.name, miles:lake.miles, details:lurePick.details, why:lurePick.why};
      if(diff<diffBest){ diffBest=diff; best=cand; }
      else if(Math.abs(diff-diffBest)<1e-6){ if(cand.miles < (best?.miles ?? Infinity)) best=cand; }
    }
    if(!best) return {ok:false, reason:'API_FAIL'};
    return {ok:true, best};
  }

  async function refresh(){
    setLoading(true);
    try{
      const res = await computeBest();
      if(res.ok){
        const b = res.best;
        const d = fmtDate();
        const dateEl = document.getElementById('date'); if(dateEl) dateEl.textContent = d;
        el.spot.textContent='Best Spot: '+b.name+(b.miles!=null?' (~'+b.miles.toFixed(0)+' mi)':'');
        el.temps.textContent='Air: '+b.air.toFixed(1)+' F | Water: '+b.water.toFixed(1)+' F';
        el.cond.textContent='Conditions: '+b.cond;
        el.lure.textContent=b.lure;
        el.lureDetail.textContent=b.details+' - '+b.why;
        localStorage.setItem('lastBest', JSON.stringify(b)); // keep last for transient API fail only
        el.locstatus.textContent='';
      } else {
        if(res.reason==='NO_CANDIDATES'){
          el.locstatus.textContent='No lakes within '+res.radius+' miles.';
          clearUI();
        } else if(res.reason==='NO_GEO'){
          el.locstatus.textContent='Location is required. Tap Use My Location.';
          clearUI();
        } else if(res.reason==='NO_KEY'){
          el.locstatus.textContent='Set your OpenWeather API key in Settings.';
          clearUI();
        } else {
          const last = getSaved('lastBest', null);
          if(last){ // only for temporary API errors
            el.locstatus.textContent='Showing last saved results (offline).';
            const d = fmtDate(); const dateEl = document.getElementById('date'); if(dateEl) dateEl.textContent = d;
            el.spot.textContent='Best Spot: '+last.name+(last.miles!=null?' (~'+last.miles.toFixed(0)+' mi)':'');
            el.temps.textContent='Air: '+last.air.toFixed(1)+' F | Water: '+last.water.toFixed(1)+' F';
            el.cond.textContent='Conditions: '+last.cond;
            el.lure.textContent=last.lure;
            el.lureDetail.textContent=last.details+' - '+last.why;
          } else {
            clearUI('Could not fetch data.');
          }
        }
      }
    } finally { setLoading(false); }
  }

  // Events
  el.refresh.addEventListener('click', refresh);
  el.radius.addEventListener('input', ()=>{ el.radiusOut.textContent = el.radius.value; });
  el.radius.addEventListener('change', ()=>{ setSaved('radiusMi', Number(el.radius.value)); refresh(); });
  el.locbtn.addEventListener('click', async ()=>{
    el.locstatus.textContent='Requesting location permission...';
    try{
      const pos = await new Promise((resolve,reject)=>{
        if(!('geolocation' in navigator)) return reject({code:0});
        navigator.geolocation.getCurrentPosition(
          p=>resolve({lat:p.coords.latitude, lon:p.coords.longitude}),
          reject, {enableHighAccuracy:false, timeout:10000, maximumAge:600000});
      });
      setSaved('userPos', pos);
      el.locstatus.textContent='Location set (lat '+pos.lat.toFixed(3)+', lon '+pos.lon.toFixed(3)+')';
      refresh();
    }catch(err){
      if(err && err.code===1) el.locstatus.textContent='Permission denied. Enable location in browser settings.';
      else if(err && err.code===2) el.locstatus.textContent='Position unavailable. Try again.';
      else if(err && err.code===3) el.locstatus.textContent='Location timeout. Try again.';
      else el.locstatus.textContent='Could not get location.';
    }
  });

  el.reset.addEventListener('click', ()=>{
    localStorage.removeItem('userPos');
    localStorage.removeItem('lastBest');
    el.locstatus.textContent='Cleared saved location and results. Tap Use My Location.';
    clearUI();
  });

  // Settings dialog
  const openDlg = ()=>{ const k=getAPIKey(); el.apikey.value = (k==='YOUR_OPENWEATHERMAP_KEY')?'':k; el.dlg.showModal(); };
  const closeDlg = ()=> el.dlg.close();
  el.settings.addEventListener('click', openDlg);
  el.dlgClose && el.dlgClose.addEventListener('click', closeDlg);
  el.dlgSave.addEventListener('click', ()=>{ const k=el.apikey.value.trim(); if(k){ setAPIKey(k); closeDlg(); refresh(); }});

  // First load + midnight refresh
  refresh();
  const now=new Date(); const msUntilMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now;
  setTimeout(()=>{ refresh(); setInterval(refresh, 24*3600*1000); }, msUntilMidnight);
})();