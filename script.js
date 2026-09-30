(function(){
  "use strict";

  var state={items:[],category:"all",query:""};
  var categoryMeta={
    gaming:{label:"بازی و کنسول",icon:"🎮",code:"PLAY"},
    tech:{label:"فناوری قدیمی",icon:"📟",code:"TECH"},
    music:{label:"موسیقی و فرمت‌ها",icon:"💿",code:"AUDIO"},
    cinema:{label:"سینما و تلویزیون",icon:"🎞",code:"FILM"},
    cars:{label:"خودرو کلاسیک",icon:"🚗",code:"AUTO"},
    design:{label:"طراحی و تبلیغات",icon:"✳",code:"DESIGN"},
    fashion:{label:"مد و سبک",icon:"👕",code:"STYLE"},
    collecting:{label:"کلکسیون و بازار",icon:"📦",code:"COLLECT"},
    products:{label:"محصولات رترو",icon:"📼",code:"PRODUCT"},
    diners:{label:"داینر و کافه",icon:"🍔",code:"DINER"},
    iran:{label:"ایران رترو",icon:"📻",code:"IRAN"}
  };

  var $=function(s){return document.querySelector(s)};
  var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};

  function esc(value){
    return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch];
    });
  }

  function faNumber(value){
    return new Intl.NumberFormat("fa-IR").format(value);
  }

  function dateLabel(item){
    if(item.dateLabel) return item.dateLabel;
    if(!item.published) return "";
    var d=new Date(item.published+"T12:00:00");
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{day:"numeric",month:"long"}).format(d);
  }

  function visual(item){
    var meta=categoryMeta[item.category]||categoryMeta.collecting;
    return '<div class="story-visual cat-'+esc(item.category)+'" data-code="'+esc(meta.code)+'"><span class="story-icon" aria-hidden="true">'+meta.icon+'</span><small>'+esc(meta.label)+'</small></div>';
  }

  function metaLine(item){
    var meta=categoryMeta[item.category]||categoryMeta.collecting;
    return '<div class="story-meta"><span class="tag">'+esc(meta.label)+'</span><span>'+esc(item.source)+'</span><span>·</span><time>'+esc(dateLabel(item))+'</time></div>';
  }

  function externalLink(item,label){
    var href="news/"+encodeURIComponent(item.id)+"/"; return '<a class="read-link" href="'+href+'">'+esc(label||"خواندن خبر")+' <span>←</span></a>';
  }

  function renderLead(){
    var featured=state.items.filter(function(x){return x.featured}).slice(0,3);
    if(!featured.length) featured=state.items.slice(0,3);
    var main=featured[0];
    if(!main) return;
    var el=$("#featured");
    el.classList.remove("is-loading");
    el.innerHTML='<div class="lead-copy">'+metaLine(main)+'<h2>'+esc(main.titleFa||main.title)+'</h2><p>'+esc(main.excerptFa||main.excerpt)+'</p>'+externalLink(main,"ادامهٔ خبر")+'</div>'+visual(main);

    $("#top-stories").innerHTML=featured.slice(1,3).map(function(item){
      return '<article class="mini-story">'+visual(item)+'<div class="mini-copy">'+metaLine(item)+'<h3>'+esc(item.titleFa||item.title)+'</h3><p>'+esc(item.excerptFa||item.excerpt)+'</p>'+externalLink(item,"منبع")+'</div></article>';
    }).join("");
  }

  function filtered(){
    var q=state.query.trim().toLowerCase();
    return state.items.filter(function(item){
      var categoryOk=state.category==="all"||item.category===state.category;
      var hay=(item.title+" "+item.excerpt+" "+item.source+" "+(categoryMeta[item.category]?categoryMeta[item.category].label:"")).toLowerCase();
      return categoryOk&&(!q||hay.indexOf(q)!==-1);
    });
  }

  function renderFeed(){
    var items=filtered();
    $("#result-count").textContent=faNumber(items.length)+" خبر";
    $("#empty-state").hidden=items.length!==0;
    $("#news-feed").innerHTML=items.map(function(item){
      return '<article class="feed-card">'+visual(item)+'<div class="feed-copy">'+metaLine(item)+'<h3><a href="news/'+encodeURIComponent(item.id)+'/">'+esc(item.titleFa||item.title)+'</a></h3><p>'+esc(item.excerptFa||item.excerpt)+'</p><div class="feed-foot"><span>'+esc(item.source)+'</span><span><a href="news/'+encodeURIComponent(item.id)+'/">خواندن خبر</a> · <a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">منبع ↗</a></span></div></div></article>';
    }).join("");
  }

  function categoryCounts(){
    var counts={all:state.items.length};
    Object.keys(categoryMeta).forEach(function(k){counts[k]=0});
    state.items.forEach(function(item){counts[item.category]=(counts[item.category]||0)+1});
    return counts;
  }

  function renderFilters(){
    var counts=categoryCounts();
    var order=["all","gaming","tech","music","cinema","cars","design","fashion","collecting","products","diners","iran"];
    $("#category-chips").innerHTML=order.map(function(key){
      var label=key==="all"?"همه":categoryMeta[key].label;
      return '<button class="category-chip '+(state.category===key?"active":"")+'" type="button" data-category="'+key+'">'+esc(label)+' <b>'+faNumber(counts[key]||0)+'</b></button>';
    }).join("");

    $("#topic-list").innerHTML=order.slice(1).map(function(key){
      return '<button class="topic-button" type="button" data-category="'+key+'"><span>'+categoryMeta[key].icon+' '+esc(categoryMeta[key].label)+'</span><b>'+faNumber(counts[key]||0)+'</b></button>';
    }).join("");

    $$(".site-nav button").forEach(function(btn){
      btn.classList.toggle("on",btn.dataset.category===state.category);
    });
  }

  function renderSources(){
    var bySource={};
    state.items.forEach(function(item){
      if(!bySource[item.source]) bySource[item.source]=item.url;
    });
    $("#source-list").innerHTML=Object.keys(bySource).sort().map(function(name){
      return '<a href="'+esc(bySource[name])+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a>';
    }).join("");
  }

  function setCategory(key,scroll){
    if(key!=="all"&&!categoryMeta[key]) return;
    state.category=key;
    state.query="";
    $("#search-input").value="";
    renderFilters();
    renderFeed();
    if(scroll!==false) $("#latest").scrollIntoView({behavior:"smooth",block:"start"});
  }

  function bind(){
    document.addEventListener("click",function(e){
      var target=e.target.closest("[data-category]");
      if(target){
        e.preventDefault();
        setCategory(target.dataset.category,true);
      }
    });

    $("#search-form").addEventListener("submit",function(e){
      e.preventDefault();
      state.query=$("#search-input").value||"";
      state.category="all";
      renderFilters();
      renderFeed();
      $("#latest").scrollIntoView({behavior:"smooth",block:"start"});
    });

    $("#search-input").addEventListener("input",function(){
      state.query=this.value||"";
      state.category="all";
      renderFilters();
      renderFeed();
    });

    var toggle=$("#theme-toggle");
    toggle.addEventListener("click",function(){
      var root=document.documentElement;
      var next=root.dataset.theme==="dark"?"light":"dark";
      root.dataset.theme=next;
      try{localStorage.setItem("retrokhaneh-theme",next)}catch(e){}
    });
  }

  function initTheme(){
    try{
      var saved=localStorage.getItem("retrokhaneh-theme");
      if(saved) document.documentElement.dataset.theme=saved;
      else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.dataset.theme="dark";
    }catch(e){}
  }

  function setToday(){
    $("#today").textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  }

  async function init(){
    initTheme();
    setToday();
    bind();
    try{
      var res=await fetch("data/news.json?v=20260930portal1",{cache:"no-store"});
      if(!res.ok) throw new Error("news data");
      var data=await res.json();
      state.items=(data.items||[]).slice().sort(function(a,b){
        return String(b.published||"").localeCompare(String(a.published||""));
      });
      renderLead();
      renderFilters();
      renderFeed();
      renderSources();
    }catch(err){
      $("#featured").classList.remove("is-loading");
      $("#featured").innerHTML='<div class="lead-copy"><div class="story-meta"><span class="tag">رتروخانه</span></div><h2>دادهٔ خبرها موقتاً در دسترس نیست.</h2><p>ساختار پرتال فعال است، اما فایل خبرها بارگذاری نشد.</p></div>';
      $("#top-stories").innerHTML="";
      $("#news-feed").innerHTML="";
      $("#empty-state").hidden=false;
      $("#empty-state").textContent="فایل دادهٔ خبرها بارگذاری نشد.";
    }
  }

  init();
})();