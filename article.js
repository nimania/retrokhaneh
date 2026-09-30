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
function renderGallery(images){
 var section=$("#gallery-section"),box=$("#article-gallery");
 if(!images||!images.length){section.hidden=true;return}
 section.hidden=false;
 var current=0;
 box.innerHTML='<div class="gallery-carousel" tabindex="0" aria-label="گالری تصاویر">'
  +'<button class="gallery-nav gallery-prev" type="button" aria-label="عکس قبلی">‹</button>'
  +'<a class="gallery-stage" target="_blank" rel="noopener"><img alt="" loading="lazy" referrerpolicy="no-referrer"></a>'
  +'<button class="gallery-nav gallery-next" type="button" aria-label="عکس بعدی">›</button>'
  +'<div class="gallery-toolbar"><span class="gallery-counter"></span><div class="gallery-dots" aria-label="انتخاب عکس"></div></div>'
  +'</div>';
 var stage=box.querySelector(".gallery-stage"),img=stage.querySelector("img"),counter=box.querySelector(".gallery-counter"),dots=box.querySelector(".gallery-dots");
 dots.innerHTML=images.map(function(_,n){return '<button type="button" aria-label="عکس '+(n+1)+'" data-gallery-index="'+n+'"></button>'}).join("");
 function show(n){
  current=(n+images.length)%images.length;
  img.classList.add("is-changing");
  window.setTimeout(function(){img.src=images[current];stage.href=images[current];img.classList.remove("is-changing")},70);
  counter.textContent=(current+1)+" / "+images.length;
  dots.querySelectorAll("button").forEach(function(d,k){d.classList.toggle("active",k===current)});
 }
 box.querySelector(".gallery-prev").addEventListener("click",function(){show(current-1)});
 box.querySelector(".gallery-next").addEventListener("click",function(){show(current+1)});
 dots.addEventListener("click",function(e){var b=e.target.closest("[data-gallery-index]");if(b)show(Number(b.dataset.galleryIndex))});
 box.querySelector(".gallery-carousel").addEventListener("keydown",function(e){
  if(e.key==="ArrowLeft"){e.preventDefault();show(current+1)}
  if(e.key==="ArrowRight"){e.preventDefault();show(current-1)}
 });
 var touchX=null;
 box.querySelector(".gallery-stage").addEventListener("touchstart",function(e){touchX=e.changedTouches[0].clientX},{passive:true});
 box.querySelector(".gallery-stage").addEventListener("touchend",function(e){
  if(touchX===null)return;
  var dx=e.changedTouches[0].clientX-touchX;touchX=null;
  if(Math.abs(dx)<45)return;
  if(dx<0)show(current+1);else show(current-1);
 },{passive:true});
 img.addEventListener("error",function(){if(images.length>1)show(current+1)});
 show(0);
}
function relatedCard(x){
 var m=C[x.category]||C.collecting;
 var img=x.image||((x.images&&x.images.length)?x.images[0]:"");
 var media=img
  ?'<div class="related-media"><img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span>'+esc(m[0])+'</span></div>'
  :'<div class="related-media related-media-fallback cat-'+esc(x.category)+'"><b>'+m[1]+'</b><span>'+esc(m[0])+'</span></div>';
 return '<a class="related-card" href="../'+encodeURIComponent(x.id)+'/">'
  +media
  +'<div class="related-copy">'
  +'<div class="related-meta"><span>'+esc(x.source||"رتروخانه")+'</span><time>'+esc(faDate(x.published))+'</time></div>'
  +'<strong>'+esc(x.titleFa||x.title)+'</strong>'
  +'<p>'+esc(x.excerptFa||x.excerpt||"")+'</p>'
  +'<div class="related-cta"><span>ادامهٔ خبر</span><b>←</b></div>'
  +'</div></a>';
}
function injectFooter(){
 if(document.querySelector(".global-footer"))return;
 var footer=document.createElement("footer");
 footer.className="global-footer";
 footer.innerHTML='<div class="global-footer-inner">'
  +'<div class="footer-brand-block"><a class="footer-logo" href="../../"><span class="retro-sign"><span class="retro-sign-word">رتروخانه</span><span class="retro-sign-star">✦</span></span></a><p>خانهٔ فارسی خبر و فرهنگ رترو؛ از بازی و تکنولوژی قدیمی تا طراحی، مد، داینرها، کلکسیون و ایران رترو.</p></div>'
  +'<div class="footer-col"><strong>رتروخانه</strong><a href="../../">صفحهٔ اول</a><a href="../../#latest">آخرین خبرها</a><a href="../../#topics">دسته‌بندی‌ها</a></div>'
  +'<div class="footer-col"><strong>موضوعات محبوب</strong><a href="../../#latest">محصولات رترو</a><a href="../../#latest">داینر و کافه</a><a href="../../#latest">بازی و کنسول</a><a href="../../#latest">ایران رترو</a></div>'
  +'<div class="footer-bottom"><span>© ۱۴۰۵ رتروخانه · گذشته هنوز زنده است.</span><a href="https://github.com/nimania/retrokhaneh" target="_blank" rel="noopener">GitHub ↗</a></div>'
  +'</div>';
 document.body.appendChild(footer);
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
 if(imgs.length>1) renderGallery(imgs.slice(1));
 else $("#gallery-section").hidden=true;
 $("#source-name").textContent=i.source||"منبع اصلی";
 $("#source-url").textContent=i.url||"";
 $("#source-link").href=i.url||"#";
 var rel=all.filter(function(x){return x.id!==i.id&&x.category===i.category}).slice(0,4);
 if(rel.length){
  $("#related-section").hidden=false;
  $("#related-grid").innerHTML=rel.map(relatedCard).join("");
  $("#related-grid").querySelectorAll(".related-media img").forEach(function(img){
   img.addEventListener("error",function(){
    var card=img.closest(".related-card"),fallback=document.createElement("div"),story=all.find(function(x){return card.getAttribute("href")==="../"+encodeURIComponent(x.id)+"/"});
    if(!story)return;
    var cm=C[story.category]||C.collecting;
    fallback.className="related-media related-media-fallback cat-"+story.category;
    fallback.innerHTML="<b>"+cm[1]+"</b><span>"+esc(cm[0])+"</span>";
    img.parentNode.replaceWith(fallback);
   },{once:true});
  });
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
injectFooter();
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