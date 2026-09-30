(function(){"use strict";
var id=decodeURIComponent(location.pathname.split("/").filter(Boolean).slice(-1)[0]||"");
var root=document.getElementById("character-page");
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function fa(n){try{return new Intl.NumberFormat("fa-IR").format(n)}catch(e){return n}}
function related(n,x){return n.filter(function(a){if((a.characters||[]).indexOf(x.id)>-1)return true;var hay=[a.title,a.titleFa,a.excerpt,a.excerptFa].join(" ").toLowerCase();return (x.aliases||[]).some(function(k){return k&&hay.indexOf(String(k).toLowerCase())>-1})}).slice(0,8)}
function videoEmbed(v){
 if(!v)return "";
 var src="";
 if(v.provider==="youtube"&&v.id)src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(v.id)+"?rel=0";
 if(v.provider==="vimeo"&&v.id)src="https://player.vimeo.com/video/"+encodeURIComponent(v.id);
 if(!src)return v.url?'<a class="media-external" href="'+esc(v.url)+'" target="_blank" rel="noopener">باز کردن ویدیو ↗</a>':"";
 return '<div class="character-video"><iframe src="'+src+'" title="'+esc(v.titleFa||"ویدیوی شخصیت")+'" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><small>'+esc(v.titleFa||"ویدیوی رسمی")+'</small></div>';
}
function heroMedia(x){
 var media=x.media||{},imgs=(media.images||[]).filter(Boolean),first=media.image||imgs[0]||"";
 if(first){
   return '<div class="profile-media"><a href="'+esc(first)+'" target="_blank" rel="noopener"><img src="'+esc(first)+'" alt="'+esc(x.nameFa)+'" referrerpolicy="no-referrer"></a><span>تصویر از منبع رسمی/مرجع</span></div>';
 }
 return '<div class="profile-monogram"><span>'+esc((x.name||"?").charAt(0))+'</span><small>'+esc(x.debutYear)+'</small></div>';
}
function gallery(media,name){
 var imgs=((media||{}).images||[]).filter(Boolean).slice(0,8);
 if(imgs.length<2)return "";
 return '<section class="character-section"><div class="character-section-head"><h2>گالری</h2><span>'+fa(imgs.length)+' تصویر</span></div><div class="character-gallery">'+imgs.map(function(u){return '<a href="'+esc(u)+'" target="_blank" rel="noopener"><img src="'+esc(u)+'" alt="'+esc(name)+'" loading="lazy" referrerpolicy="no-referrer"></a>'}).join("")+'</div></section>';
}
function relationCards(x,allChars){
 var rel=x.relations||[];if(!rel.length)return "";
 return '<section class="character-section"><h2>روابط و شخصیت‌های مرتبط</h2><div class="relation-grid">'+rel.map(function(r){var c=allChars.find(function(a){return a.id===r.id});if(!c)return "";return '<a class="relation-card accent-'+esc(c.accent||"")+'" href="../'+encodeURIComponent(c.id)+'/"><b>'+esc((c.name||"?").charAt(0))+'</b><span><strong>'+esc(c.nameFa)+'</strong><small>'+esc(r.relationFa||c.name)+'</small></span><i>←</i></a>'}).join("")+'</div></section>';
}
function renderPage(x,news,allChars){
 var media=x.media||{},videos=(media.videos||[]).filter(Boolean),official=media.officialUrl||"";
 document.title=x.nameFa+" | رتروپدیا | رتروخانه";
 root.innerHTML=
 '<div class="character-crumbs"><a href="../../">خانه</a><span>/</span><a href="../">شخصیت‌ها</a><span>/</span><b>'+esc(x.nameFa)+'</b></div>'
 +'<section class="character-profile accent-'+esc(x.accent)+'">'+heroMedia(x)+'<div class="profile-copy"><span class="profile-kicker">RETRO CHARACTER · '+esc(x.publisher)+'</span><h1>'+esc(x.nameFa)+'</h1><h2>'+esc(x.name)+'</h2><p>'+esc(x.summaryFa)+'</p><div class="profile-facts"><span><b>اولین حضور</b>'+esc(x.firstGame)+'</span><span><b>سال</b>'+fa(x.debutYear)+'</span><span><b>خاستگاه</b>'+esc(x.origin)+'</span></div>'+(x.franchise?'<a class="franchise-pill" href="../../franchises/'+encodeURIComponent(x.franchise.id)+'/"><span>فرنچایز</span><strong>'+esc(x.franchise.nameFa)+'</strong><i>←</i></a>':"")+(official?'<a class="official-link" href="'+esc(official)+'" target="_blank" rel="noopener">منبع رسمی ↗</a>':"")+'</div></section>'
 +(x.introFa&&x.introFa.length?'<section class="character-section character-longread"><span class="section-kicker">PROFILE</span><h2>معرفی مفصل</h2>'+x.introFa.map(function(p){return '<p>'+esc(p)+'</p>'}).join("")+'</section>':"")
 +'<section class="character-section"><span class="section-kicker">WHY IT MATTERS</span><h2>چرا مهم است؟</h2><p>'+esc(x.whyFa)+'</p></section>'
 +(x.guideFa&&x.guideFa.length?'<section class="character-section"><div class="character-section-head"><div><span class="section-kicker">START HERE</span><h2>از کجا شروع کنیم؟</h2></div><span>'+fa(x.guideFa.length)+' پیشنهاد</span></div><div class="guide-list">'+x.guideFa.map(function(g,i){return '<div><b>'+fa(i+1)+'</b><p>'+esc(g)+'</p></div>'}).join("")+'</div></section>':"")
 +'<section class="character-section"><h2>بازی‌های شاخص</h2><div class="game-title-list">'+(x.games||[]).map(function(g,i){var name=typeof g==="string"?g:(g.title||"");return '<span><b>'+fa(i+1)+'</b>'+esc(name)+'</span>'}).join("")+'</div></section>'
 +(x.timeline&&x.timeline.length?'<section class="character-section"><span class="section-kicker">TIMELINE</span><h2>خط زمانی کوتاه</h2><div class="character-timeline">'+x.timeline.map(function(t){return '<div><time>'+fa(t.year)+'</time><span>'+esc(t.labelFa)+'</span></div>'}).join("")+'</div></section>':"")
 +(x.triviaFa&&x.triviaFa.length?'<section class="character-section"><span class="section-kicker">TRIVIA</span><h2>حاشیه‌ها و نکته‌های جالب</h2><div class="trivia-grid">'+x.triviaFa.map(function(t){return '<article><span>✦</span><p>'+esc(t)+'</p></article>'}).join("")+'</div></section>':"")
 +relationCards(x,allChars)
 +(videos.length?'<section class="character-section"><div class="character-section-head"><div><span class="section-kicker">WATCH</span><h2>ویدیو</h2></div><span>'+fa(videos.length)+' ویدیو</span></div><div class="character-videos">'+videos.map(videoEmbed).join("")+'</div></section>':"")
 +gallery(media,x.nameFa)
 +'<section class="character-section"><div class="character-section-head"><div><span class="section-kicker">NEWS</span><h2>خبرهای مرتبط در رتروخانه</h2></div><span>'+fa(news.length)+' خبر</span></div>'+(news.length?'<div class="character-news">'+news.map(function(n){var img=n.image||((n.images||[])[0]||"");return '<a href="../../news/'+encodeURIComponent(n.id)+'/">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="news-fallback">R</div>')+'<div><small>'+esc(n.source||"رتروخانه")+'</small><strong>'+esc(n.titleFa||n.title)+'</strong><p>'+esc(n.excerptFa||n.excerpt||"")+'</p></div></a>'}).join("")+'</div>':'<div class="character-empty">هنوز خبری با این شخصیت برچسب نخورده است.</div>')+'</section>'
 +'<footer class="character-back"><a href="../">← بازگشت به بانک شخصیت‌ها</a></footer>';
}
Promise.all([
 fetch("../../data/characters.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}),
 fetch("../../data/news.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()})
]).then(function(all){
 var allChars=all[0].items||[],x=allChars.find(function(a){return a.id===id});if(!x)throw Error("not found");
 renderPage(x,related(all[1].items||[],x),allChars);
}).catch(function(){root.innerHTML='<div class="character-empty">این شخصیت پیدا نشد.</div>'});
})();