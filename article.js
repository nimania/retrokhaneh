(function(){
"use strict";
var C={
 gaming:["بازی و کنسول","🎮","PLAY"],tech:["فناوری قدیمی","📟","TECH"],music:["موسیقی و فرمت‌ها","💿","AUDIO"],
 cinema:["سینما و تلویزیون","🎞","FILM"],cars:["خودرو کلاسیک","🚗","AUTO"],design:["طراحی و تبلیغات","✳","DESIGN"],
 fashion:["مد و سبک","👕","STYLE"],collecting:["کلکسیون و بازار","📦","COLLECT"],products:["محصولات رترو","📼","PRODUCT"],
 diners:["داینر و کافه","🍔","DINER"],iran:["ایران رترو","📻","IRAN"]
};
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})};
var parts=location.pathname.split("/").filter(Boolean);
var id=decodeURIComponent(parts[parts.length-1]||"");
function faDate(v){
 if(!v)return "";
 try{return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{day:"numeric",month:"long",year:"numeric"}).format(new Date(v+"T12:00:00"))}
 catch(e){return v}
}
function visual(i){
 var m=C[i.category]||C.collecting;
 return '<div class="story-visual article-fallback cat-'+esc(i.category)+'" data-code="'+esc(m[2])+'"><span class="story-icon">'+m[1]+'</span><small>'+esc(m[0])+'</small></div>';
}
function renderVideos(i){
 var vs=(i.videos&&i.videos.length)?i.videos:(i.video?[i.video]:[]);
 if(!vs.length)return "";
 var buttons=vs.map(function(v,n){
  return '<button type="button" data-provider="'+esc(v.provider||"")+'" data-id="'+esc(v.id||"")+'" data-url="'+esc(v.url||"")+'">▶ ویدئو'+(vs.length>1?" "+(n+1):"")+'</button>';
 }).join("");
 return '<div class="video-buttons">'+buttons+'</div><div class="article-video"></div>';
}
function draw(i,all){
 var m=C[i.category]||C.collecting;
 var imgs=(i.images&&i.images.length?i.images:(i.image?[i.image]:[])).filter(Boolean);
 document.title=(i.titleFa||i.title)+" | رتروخانه";
 $("#article-meta").innerHTML='<span class="tag">'+esc(m[0])+'</span><span>'+esc(i.source||"")+'</span><span>·</span><time>'+esc(faDate(i.published))+'</time>'+(i.country?'<span>· '+esc(i.country)+'</span>':"");
 $("#article-title").textContent=i.titleFa||i.title;
 $("#article-lead").textContent=i.excerptFa||i.excerpt||"";
 var media=$("#article-media");
 if(imgs.length){
  media.innerHTML='<figure class="article-hero"><img src="'+esc(imgs[0])+'" alt="" referrerpolicy="no-referrer" loading="eager"><figcaption>تصویر از منبع خبر</figcaption></figure>';
  var image=media.querySelector("img");
  image.addEventListener("error",function(){media.innerHTML=visual(i)});
 }else media.innerHTML=visual(i);
 var body=(i.bodyFa&&i.bodyFa.length)?i.bodyFa:[i.excerptFa||i.excerpt];
 $("#article-body").innerHTML=body.filter(Boolean).map(function(p){return "<p>"+esc(p)+"</p>"}).join("");
 $("#article-videos").innerHTML=renderVideos(i);
 if(imgs.length>1){
  $("#gallery-section").hidden=false;
  $("#article-gallery").innerHTML=imgs.slice(1).map(function(u){return '<a href="'+esc(u)+'" target="_blank" rel="noopener"><img src="'+esc(u)+'" alt="" loading="lazy" referrerpolicy="no-referrer"></a>'}).join("");
 }
 $("#source-name").textContent=i.source||"منبع اصلی";
 $("#source-url").textContent=i.url||"";
 $("#source-link").href=i.url||"#";
 var rel=all.filter(function(x){return x.id!==i.id&&x.category===i.category}).slice(0,4);
 if(rel.length){
  $("#related-section").hidden=false;
  $("#related-grid").innerHTML=rel.map(function(x){
   return '<a class="related-card" href="../'+encodeURIComponent(x.id)+'/"><small>'+esc((C[x.category]||C.collecting)[0])+'</small><strong>'+esc(x.titleFa||x.title)+'</strong></a>';
  }).join("");
 }
 document.querySelectorAll(".video-buttons button").forEach(function(b){
  b.addEventListener("click",function(){
   var p=b.dataset.provider,vid=b.dataset.id,u=b.dataset.url,src="";
   if(p==="youtube"&&vid)src="https://www.youtube-nocookie.com/embed/"+vid+"?rel=0";
   if(p==="vimeo"&&vid)src="https://player.vimeo.com/video/"+vid;
   if(p==="dailymotion"&&vid)src="https://www.dailymotion.com/embed/video/"+vid;
   if(src)$("#article-videos .article-video").innerHTML='<iframe src="'+src+'" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
   else if(u)window.open(u,"_blank","noopener");
  });
 });
}
try{
 var t=localStorage.getItem("retrokhaneh-theme");
 if(t)document.documentElement.dataset.theme=t;
 else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.dataset.theme="dark";
}catch(e){}
$("#theme-toggle").addEventListener("click",function(){
 var n=document.documentElement.dataset.theme==="dark"?"light":"dark";
 document.documentElement.dataset.theme=n;
 try{localStorage.setItem("retrokhaneh-theme",n)}catch(e){}
});
fetch("../../data/news.json?v="+Date.now(),{cache:"no-store"})
 .then(function(r){if(!r.ok)throw Error("data");return r.json()})
 .then(function(d){var i=(d.items||[]).find(function(x){return x.id===id});if(!i)throw Error("not found");draw(i,d.items||[])})
 .catch(function(){$("#article-title").textContent="خبر پیدا نشد";$("#article-lead").textContent="این صفحه هنوز در داده‌های رتروخانه وجود ندارد.";$("#article-body").innerHTML=""});
})();