/* settings_skin.js: skins the existing HTML settings controls with SETTINGS_ART (Artist Helper, Oct 15) without changing their behaviour.
   Native inputs stay in the DOM (keyboard, focus, persistence, change handlers untouched); the art is painted to a canvas and set as the
   element background. Sliders take pointer input on the art track (valueAt) and write the native range + fire 'input'. ?setart=0 = old look. */
(function(){
  if(/[?&]setart=0\b/.test(location.search))return;
  function ok(){ return !!window.SETTINGS_ART }
  var DPR=function(){ return Math.min(2,window.devicePixelRatio||1) };
  function paint(el,w,h,fn){ var d=DPR(), c=document.createElement('canvas'); c.width=Math.round(w*d); c.height=Math.round(h*d); var x=c.getContext('2d'); x.scale(d,d); var r=null; try{ r=fn(x) }catch(e){} el.style.backgroundImage='url('+c.toDataURL()+')'; el.style.backgroundSize=w+'px '+h+'px'; el.style.backgroundRepeat='no-repeat'; el.style.backgroundPosition='center'; return r }
  function st(el){ return el._p?'pressed':el._f?'focus':el._h?'hover':'normal' }
  function track(el,inp,re){ el.addEventListener('pointerenter',function(){el._h=1;re()}); el.addEventListener('pointerleave',function(){el._h=0;el._p=0;re()});
    el.addEventListener('pointerdown',function(){el._p=1;re()}); addEventListener('pointerup',function(){ if(el._p){el._p=0;re()} });
    if(inp){ inp.addEventListener('focus',function(){el._f=inp.matches(':focus-visible')?1:0;re()}); inp.addEventListener('blur',function(){el._f=0;re()}); } }
  function toggle(el){ var inp=el.querySelector('input'), lab=(el.querySelector('span')||{}).textContent||'';
    el.classList.add('sartT'); var W=Math.max(200,Math.min(260,el.offsetWidth||220)), H=48; el.style.width=W+'px'; el.style.height=H+'px';
    function re(){ paint(el,W,H,function(x){ return SETTINGS_ART.drawToggle(x,0,0,W,H,!!inp.checked,st(el),lab) }) }
    inp.addEventListener('change',re); track(el,inp,re); el._re=re; re() }
  function slider(el){ var inp=el.querySelector('input[type=range]'); if(!inp)return; var lab=el.textContent.replace(/[♪🔊]/g,'').trim().toUpperCase();
    el.classList.add('sartS'); var W=240,H=56; el.style.width=W+'px'; el.style.height=H+'px'; var hit=null;
    function v(){ return (inp.value-inp.min)/((inp.max-inp.min)||1) }
    function re(){ hit=paint(el,W,H,function(x){ return SETTINGS_ART.drawSlider(x,0,0,W,H,v(),st(el),lab,{showValue:true,min:0,max:100}) }) }
    function set(ev){ var r=el.getBoundingClientRect(), px=ev.clientX-r.left; var k=hit&&hit.valueAt?hit.valueAt(px):px/W; k=Math.max(0,Math.min(1,k)); inp.value=Math.round(+inp.min+k*(inp.max-inp.min)); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); re() }
    el.addEventListener('pointerdown',function(ev){ ev.preventDefault(); try{el.setPointerCapture(ev.pointerId)}catch(e){} el._drag=1; set(ev) });
    el.addEventListener('pointermove',function(ev){ if(el._drag)set(ev) }); el.addEventListener('pointerup',function(){ el._drag=0 }); el.addEventListener('pointercancel',function(){ el._drag=0 });
    el.addEventListener('click',function(ev){ ev.preventDefault() });
    inp.addEventListener('input',re); track(el,inp,re); el._re=re; re() }
  var ICON={btnMute:function(){ return window.Snd&&Snd.muted?'mute':'unmute' },btnPause:function(){return 'pause'},btnFull:function(){return 'fullscreen'}};
  function icon(el){ el.classList.add('sartI'); var S=44; function re(){ var ic=ICON[el.id](); paint(el,S,S,function(x){ return SETTINGS_ART.drawIconButton(x,0,0,S,ic,st(el),ic==='mute'||(el.id==='btnFull'&&!!document.fullscreenElement)) }) }
    el.addEventListener('click',function(){ setTimeout(re,30) }); document.addEventListener('fullscreenchange',re); addEventListener('keydown',function(e){ if(e.key==='m'||e.key==='M'||e.key==='f'||e.key==='F')setTimeout(re,30) }); track(el,el,re); el._re=re; re() }
  function panel(box,title){ if(!box||box.offsetWidth<10)return; var W=box.offsetWidth,H=box.offsetHeight; paint(box,W,H,function(x){ return SETTINGS_ART.drawSettingsPanel(x,0,0,W,H,title) }) }
  function wrap(root,title){ var g=root.querySelectorAll(':scope > .goresw, :scope > .vols'); if(!g.length)return null; var w=document.createElement('div'); w.className='sartP'; w.dataset.t=title; g[0].parentNode.insertBefore(w,g[0]); g.forEach(function(n){ w.appendChild(n) }); return w }
  function init(){ if(!ok())return; try{ SETTINGS_ART.prewarm&&SETTINGS_ART.prewarm() }catch(e){}
    var css=document.createElement('style'); css.textContent=
      '.sartT{border:none!important;background-color:transparent!important;padding:0!important;border-radius:0!important;display:block!important;margin:6px auto 0!important;position:relative}'+
      '.sartT>*{visibility:hidden}.sartT input{position:absolute;inset:0;opacity:0}'+
      '.sartS{display:block!important;margin:4px auto!important;position:relative;color:transparent!important;font-size:0!important;touch-action:none;cursor:pointer}.sartS input{position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;margin:0}'+
      '.vols:has(.sartS){display:block!important}'+
      '.sartI{width:44px!important;height:44px!important;color:transparent!important;background-color:transparent!important;border:none!important;font-size:0!important;padding:0!important}'+
      '.sartP{position:relative;display:inline-block;padding:46px 18px 14px;margin-top:10px;min-width:260px}'+
      '.sartP .sartT:first-child{margin-top:0!important}';
    document.head.appendChild(css);
    var P=[]; [['menu','SETTINGS'],['pause','SETTINGS']].forEach(function(a){ var r=document.getElementById(a[0]); if(r){ var w=wrap(r,a[1]); if(w)P.push(w) } });
    document.querySelectorAll('.goresw').forEach(toggle); document.querySelectorAll('.vols label').forEach(slider); ['btnMute','btnPause','btnFull'].forEach(function(id){ var b=document.getElementById(id); if(b)icon(b) });
    function panels(){ P.forEach(function(w){ panel(w,w.dataset.t) }) } panels();
    new MutationObserver(function(){ setTimeout(panels,30) }).observe(document.getElementById('pause'),{attributes:true,attributeFilter:['class','style']});
    new MutationObserver(function(){ setTimeout(panels,30) }).observe(document.getElementById('menu'),{attributes:true,attributeFilter:['class','style']});
    addEventListener('resize',function(){ clearTimeout(init._t); init._t=setTimeout(panels,200) });
    /* volume / lowfx state also changes from the other screen's copy: repaint both copies */
    document.addEventListener('input',function(e){ if(e.target.classList&&(e.target.classList.contains('volM')||e.target.classList.contains('volS')))setTimeout(function(){ document.querySelectorAll('.sartS').forEach(function(l){ l._re&&l._re() }) },0) });
    document.addEventListener('change',function(e){ if(e.target.classList&&e.target.classList.contains('lowChk'))setTimeout(function(){ document.querySelectorAll('.sartT').forEach(function(l){ l._re&&l._re() }) },0) });
    window.SKIN={repaint:function(){ document.querySelectorAll('.sartT,.sartS,.sartI').forEach(function(l){ l._re&&l._re() }); panels() }} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ setTimeout(init,0) }); else setTimeout(init,0);
})();
