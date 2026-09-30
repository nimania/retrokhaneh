(function(){"use strict";
var id=decodeURIComponent(location.pathname.split("/").filter(Boolean).slice(-1)[0]||"");
var root=document.getElementById("character-page");
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function fa(n){try{return new Intl.NumberFormat("fa-IR").format(n)}catch(e){return n}}
function related(n,x){return n.filter(function(a){if((a.characters||[]).indexOf(x.id)>-1)return true;var hay=[a.title,a.titleFa,a.excerpt,a.excerptFa].join(" ").toLowerCase();return (x.aliases||[]).some(function(k){return k&&hay.indexOf(String(k).toLowerCase())>-1})}).slice(0,8)}
Promise.all([fetch("../../data/characters.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}),fetch("../../data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()})]).then(function(all){
 var x=(all[0].items||[]).find(function(a){return a.id===id});if(!x)throw Error("not found");var news=related(all[1].items||[],x);
 document.title=x.nameFa+" | رتروپدیا | رتروخانه";
 root.innerHTML='<div class="character-crumbs"><a href="../../">خانه</a><span>/</span><a href="../">شخصیت‌ها</a><span>/</span><b>'+esc(x.nameFa)+'</b></div>'
 +'<section class="character-profile accent-'+esc(x.accent)+'"><div class="profile-monogram"><span>'+esc((x.name||"?").charAt(0))+'</span><small>'+esc(x.debutYear)+'</small></div><div class="profile-copy"><span class="profile-kicker">RETRO CHARACTER · '+esc(x.publisher)+'</span><h1>'+esc(x.nameFa)+'</h1><h2>'+esc(x.name)+'</h2><p>'+esc(x.summaryFa)+'</p><div class="profile-facts"><span><b>اولین حضور</b>'+esc(x.firstGame)+'</span><span><b>سال</b>'+fa(x.debutYear)+'</span><span><b>خاستگاه</b>'+esc(x.origin)+'</span></div></div></section>'
 +'<section class="character-section"><h2>چرا مهم است؟</h2><p>'+esc(x.whyFa)+'</p></section>'
 +'<section class="character-section"><h2>بازی‌های شاخص</h2><div class="game-title-list">'+(x.games||[]).map(function(g,i){return '<span><b>'+fa(i+1)+'</b>'+esc(g)+'</span>'}).join("")+'</div></section>'
 +'<section class="character-section"><div class="character-section-head"><h2>خبرهای مرتبط در رتروخانه</h2><span>'+fa(news.length)+' خبر</span></div>'+(news.length?'<div class="character-news">'+news.map(function(n){var img=n.image||((n.images||[])[0]||"");return '<a href="../../news/'+encodeURIComponent(n.id)+'/">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="news-fallback">R</div>')+'<div><small>'+esc(n.source||"رتروخانه")+'</small><strong>'+esc(n.titleFa||n.title)+'</strong><p>'+esc(n.excerptFa||n.excerpt||"")+'</p></div></a>'}).join("")+'</div>':'<div class="character-empty">هنوز خبری با این شخصیت برچسب نخورده است.</div>')+'</section>'
 +'<footer class="character-back"><a href="../">← بازگشت به بانک شخصیت‌ها</a></footer>';
}).catch(function(){root.innerHTML='<div class="character-empty">این شخصیت پیدا نشد.</div>'});
})();