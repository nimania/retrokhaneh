(function(){"use strict";
var grid=document.getElementById("character-grid"),input=document.getElementById("character-search"),count=document.getElementById("character-count"),items=[];
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function fa(n){try{return new Intl.NumberFormat("fa-IR").format(n)}catch(e){return n}}
function card(x){return '<a class="character-card accent-'+esc(x.accent)+'" href="'+encodeURIComponent(x.id)+'/"><div class="character-monogram"><span>'+esc((x.name||"?").charAt(0))+'</span><b>'+esc(x.debutYear)+'</b></div><div class="character-copy"><small>'+esc(x.publisher)+'</small><h2>'+esc(x.nameFa)+'</h2><strong>'+esc(x.name)+'</strong><p>'+esc(x.summaryFa)+'</p><div><span>اولین حضور: '+esc(x.firstGame)+'</span><b>مشاهده ←</b></div></div></a>'}
function render(){var q=(input.value||"").trim().toLowerCase();var out=items.filter(function(x){return !q||[x.name,x.nameFa,x.publisher,x.firstGame].concat(x.aliases||[]).join(" ").toLowerCase().indexOf(q)>-1});grid.innerHTML=out.map(card).join("");count.textContent=fa(out.length)+" شخصیت"}
input.addEventListener("input",render);
fetch("../data/characters.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){items=d.items||[];render()});
})();