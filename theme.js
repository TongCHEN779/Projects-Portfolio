/* Shared theme toggle for the demo pages.
   Load with `defer`. The early-paint snippet in each page's <head> sets
   data-theme before first render; this file injects the button, persists the
   choice, follows the OS theme until the user picks, and fires a `themechange`
   event so pages can repaint their canvases. */
(function(){
  function cur(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';}
  function paintBtn(t){
    var i=document.getElementById('themeIcon'), l=document.getElementById('themeLabel'), light=t==='light';
    if(i) i.textContent=light?'🌙':'☀️';      // icon shows the theme you'd switch TO
    if(l) l.textContent=light?'Dark':'Light';
  }
  function apply(t){
    document.documentElement.setAttribute('data-theme',t);
    try{localStorage.setItem('theme',t);}catch(e){}
    paintBtn(t);
    window.dispatchEvent(new CustomEvent('themechange',{detail:{theme:t}}));
  }
  function init(){
    var b=document.createElement('button');
    b.className='theme-toggle'; b.id='themeToggle'; b.type='button';
    b.setAttribute('aria-label','Toggle light/dark theme');
    b.innerHTML='<span class="icon" id="themeIcon"></span><span id="themeLabel"></span>';
    document.body.appendChild(b);
    paintBtn(cur());
    b.addEventListener('click',function(){apply(cur()==='light'?'dark':'light');});
    if(window.matchMedia){
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change',function(e){
        try{if(localStorage.getItem('theme'))return;}catch(_){}
        apply(e.matches?'light':'dark');
      });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
// Convenience for page scripts: read a CSS variable's current value.
window.cssVar=function(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();};
