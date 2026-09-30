(function(){
"use strict";
var canvas=document.getElementById("game-canvas"),ctx=canvas.getContext("2d");
var W=canvas.width,H=canvas.height,keys={},raf=null,last=0,running=false,paused=false,current="pong",game=null,score=0;
var meta={
 pong:{title:"رالی رترو · RETRO RALLY",label:"ARCADE 01",hint:"↑ ↓ یا W/S حرکت · P توقف",copy:"دوئل نئونی راکت و توپ؛ زودتر از حریف به ۵ امتیاز برس.",genre:"Arcade Duel",controls:"↑ ↓ / W S",poster:"assets/retro-rally.webp",button:"شروع دوئل"},
 snake:{title:"مار نئونی · NEON SNAKE",label:"ARCADE 02",hint:"کلیدهای جهت حرکت · P توقف",copy:"در هزارتوی نئونی حرکت کن، غذا را بگیر و به دیوار یا خودت نخور.",genre:"Maze Survival",controls:"↑ ↓ ← →",poster:"assets/neon-snake.webp",button:"ورود به هزارتو"},
 breakout:{title:"نوارشکن · CASSETTE BREAKER",label:"ARCADE 03",hint:"← → یا A/D حرکت · P توقف",copy:"راکت را حرکت بده و دیوار کاست‌ها را با توپ خالی کن.",genre:"Brick Breaker",controls:"← → / A D",poster:"assets/cassette-breaker.webp",button:"شکستن دیوار"},
 space:{title:"فضا ۷۶ · SPACE 76",label:"ARCADE 04",hint:"← → حرکت · Space شلیک · P توقف",copy:"کشتی را حرکت بده و مهاجم‌ها را پیش از رسیدن به پایین از بین ببر.",genre:"Space Shooter",controls:"← → / SPACE",poster:"assets/space-76.webp",button:"شروع مأموریت"}
};
function fa(n){try{return new Intl.NumberFormat("fa-IR").format(n)}catch(e){return n}}
var audioCtx=null,muted=false;
try{muted=localStorage.getItem("retrokhaneh-muted")==="1"}catch(e){}
function audio(){
 if(muted)return null;
 if(!audioCtx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=new AC()}
 if(audioCtx.state==="suspended")audioCtx.resume();
 return audioCtx;
}
function beep(freq,dur,type,vol,slide){
 var a=audio();if(!a)return;
 var o=a.createOscillator(),g=a.createGain(),now=a.currentTime;
 o.type=type||"square";o.frequency.setValueAtTime(freq,now);
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),now+dur);
 g.gain.setValueAtTime(vol||.035,now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
 o.connect(g);g.connect(a.destination);o.start(now);o.stop(now+dur);
}
function sfx(name){
 if(name==="start"){beep(330,.08,"square",.035);setTimeout(function(){beep(440,.08,"square",.035)},120);setTimeout(function(){beep(660,.16,"square",.045)},240)}
 else if(name==="hit")beep(520,.045,"square",.025,390);
 else if(name==="point")beep(740,.09,"square",.03,980);
 else if(name==="eat")beep(880,.07,"square",.028,1200);
 else if(name==="brick")beep(610,.04,"square",.022,470);
 else if(name==="shoot")beep(290,.055,"sawtooth",.018,180);
 else if(name==="boom"){beep(140,.16,"sawtooth",.04,55)}
 else if(name==="over"){beep(260,.12,"square",.03,180);setTimeout(function(){beep(170,.2,"square",.03,90)},130)}
}
function updateMuteButton(){
 var b=document.getElementById("mute-btn");if(!b)return;
 b.textContent=muted?"🔇 بی‌صدا":"🔊 صدا";b.classList.toggle("is-muted",muted);b.setAttribute("aria-pressed",muted?"true":"false");
}
function readySequence(done){
 var f=document.getElementById("ready-flash");
 f.textContent="READY";f.className="ready-flash show";beep(260,.08,"square",.025);
 setTimeout(function(){f.textContent="GO!";f.className="ready-flash show go";sfx("start")},650);
 setTimeout(function(){f.className="ready-flash";f.textContent="";done()},1250);
}
function bestKey(id){return "retrokhaneh-best-"+(id||current)}
function getBest(id){try{return Number(localStorage.getItem(bestKey(id))||0)}catch(e){return 0}}
function playsKey(id){return "retrokhaneh-plays-"+id}
function getPlays(id){try{return Number(localStorage.getItem(playsKey(id))||0)}catch(e){return 0}}
function addPlay(id){try{localStorage.setItem(playsKey(id),String(getPlays(id)+1))}catch(e){}renderProgress();checkAchievements()}
function getUnlocked(){try{return JSON.parse(localStorage.getItem("retrokhaneh-achievements")||"[]")}catch(e){return []}}
function saveUnlocked(list){try{localStorage.setItem("retrokhaneh-achievements",JSON.stringify(list))}catch(e){}}
function totalBest(){return Object.keys(meta).reduce(function(n,id){return n+getBest(id)},0)}
function totalPlays(){return Object.keys(meta).reduce(function(n,id){return n+getPlays(id)},0)}
var achievements=[
 {id:"first-credit",icon:"●",title:"اولین سکه",copy:"اولین دست را در اتاق بازی شروع کن.",test:function(){return totalPlays()>=1}},
 {id:"tour",icon:"✦",title:"گردشگر آرکید",copy:"هر چهار بازی را حداقل یک‌بار امتحان کن.",test:function(){return Object.keys(meta).every(function(id){return getPlays(id)>0})}},
 {id:"rally-five",icon:"↔",title:"دوئل‌باز",copy:"در رالی رترو به ۵ امتیاز برس.",test:function(){return getBest("pong")>=5}},
 {id:"snake-fifty",icon:"≈",title:"مار نئونی",copy:"در Neon Snake رکورد ۵۰ بزن.",test:function(){return getBest("snake")>=50}},
 {id:"tape-250",icon:"▦",title:"نوارشکن حرفه‌ای",copy:"در Cassette Breaker رکورد ۲۵۰ بزن.",test:function(){return getBest("breakout")>=250}},
 {id:"space-200",icon:"▲",title:"خلبان ۷۶",copy:"در Space 76 رکورد ۲۰۰ بزن.",test:function(){return getBest("space")>=200}},
 {id:"ten-plays",icon:"10",title:"مشتری ثابت",copy:"۱۰ دست بازی در رتروخانه انجام بده.",test:function(){return totalPlays()>=10}},
 {id:"score-500",icon:"★",title:"سلطان آرکید",copy:"مجموع رکوردهایت را به ۵۰۰ برسان.",test:function(){return totalBest()>=500}}
];
function showAchievement(a){
 var toast=document.getElementById("achievement-toast"),title=document.getElementById("achievement-toast-title");
 if(!toast||!title)return;title.textContent=a.title;toast.classList.add("show");beep(660,.08,"square",.035);setTimeout(function(){beep(880,.13,"square",.04)},110);
 clearTimeout(showAchievement._t);showAchievement._t=setTimeout(function(){toast.classList.remove("show")},2800);
}
function checkAchievements(){
 var unlocked=getUnlocked(),fresh=[];
 achievements.forEach(function(a){if(unlocked.indexOf(a.id)<0&&a.test()){unlocked.push(a.id);fresh.push(a)}});
 if(fresh.length){saveUnlocked(unlocked);fresh.forEach(function(a,i){setTimeout(function(){showAchievement(a)},i*3000)})}
 renderProgress();
}
function renderProgress(){
 var games=[
  {id:"pong",fa:"رالی رترو",en:"RETRO RALLY"},
  {id:"snake",fa:"مار نئونی",en:"NEON SNAKE"},
  {id:"breakout",fa:"نوارشکن",en:"CASSETTE BREAKER"},
  {id:"space",fa:"فضا ۷۶",en:"SPACE 76"}
 ].sort(function(a,b){return getBest(b.id)-getBest(a.id)});
 var list=document.getElementById("records-list");
 if(list)list.innerHTML=games.map(function(g,i){
  return '<div class="record-row"><span class="record-rank">'+(i+1)+'</span><div class="record-copy"><strong>'+g.fa+'</strong><small>'+g.en+'</small></div><div class="record-score"><strong>'+fa(getBest(g.id))+'</strong><small>'+fa(getPlays(g.id))+' دست</small></div></div>';
 }).join("");
 var total=document.getElementById("total-best"),plays=document.getElementById("total-plays"),count=document.getElementById("achievement-count"),grid=document.getElementById("achievement-grid");
 if(total)total.textContent=fa(totalBest());if(plays)plays.textContent=fa(totalPlays());
 var unlocked=getUnlocked();if(count)count.textContent=fa(unlocked.length);
 if(grid)grid.innerHTML=achievements.map(function(a){
  var on=unlocked.indexOf(a.id)>=0;
  return '<div class="achievement-card '+(on?"unlocked":"locked")+'"><span class="achievement-icon">'+a.icon+'</span><div class="achievement-copy"><strong>'+a.title+'</strong><small>'+a.copy+'</small></div><span class="achievement-state">'+(on?"UNLOCKED":"LOCKED")+'</span></div>';
 }).join("");
}
function setScore(v){
 score=Math.max(0,Math.floor(v));document.getElementById("score").textContent=fa(score);
 if(score>getBest()){try{localStorage.setItem(bestKey(),score)}catch(e){}document.getElementById("best").textContent=fa(score);renderProgress();checkAchievements()}
}
function showBest(){document.getElementById("best").textContent=fa(getBest())}
function overlay(title,copy,button){
 var m=meta[current];
 document.getElementById("overlay-title").textContent=title;
 document.getElementById("overlay-copy").textContent=copy;
 document.getElementById("start-btn").textContent=button||m.button||"PLAY";
 document.getElementById("overlay-genre").textContent=m.genre||"-";
 document.getElementById("overlay-controls").textContent=m.controls||"-";
 document.getElementById("overlay-best").textContent=fa(getBest());
 var poster=document.getElementById("overlay-poster");poster.src=m.poster;poster.alt=m.title;
 document.getElementById("game-overlay").classList.remove("hidden")
}
function hideOverlay(){document.getElementById("game-overlay").classList.add("hidden")}
function endGame(title,copy){running=false;sfx("over");overlay(title,copy,"دوباره بازی کن")}
function clear(){ctx.fillStyle="#07100f";ctx.fillRect(0,0,W,H)}
function grid(){ctx.strokeStyle="rgba(234,226,205,.035)";ctx.lineWidth=1;for(var x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(var y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function pressed(k){return !!keys[k]}

function Pong(){
 this.py=H/2-65;this.ay=this.py;this.ball={x:W/2,y:H/2,vx:340*(Math.random()>.5?1:-1),vy:180*(Math.random()>.5?1:-1)};this.me=0;this.ai=0;
 this.update=function(dt){
  var speed=420;if(pressed("ArrowUp")||pressed("KeyW"))this.py-=speed*dt;if(pressed("ArrowDown")||pressed("KeyS"))this.py+=speed*dt;this.py=Math.max(15,Math.min(H-145,this.py));
  var target=this.ball.y-65;this.ay+=(target-this.ay)*Math.min(1,dt*3.2);this.ay=Math.max(15,Math.min(H-145,this.ay));
  var b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<14||b.y>H-14){b.vy*=-1;b.y=Math.max(14,Math.min(H-14,b.y))}
  if(b.vx<0&&b.x<48&&b.x>28&&b.y>this.py&&b.y<this.py+130){b.vx=Math.abs(b.vx)*1.035;b.vy+=(b.y-(this.py+65))*3;b.x=48;sfx("hit")}
  if(b.vx>0&&b.x>W-48&&b.x<W-28&&b.y>this.ay&&b.y<this.ay+130){b.vx=-Math.abs(b.vx)*1.035;b.vy+=(b.y-(this.ay+65))*3;b.x=W-48;sfx("hit")}
  if(b.x<0){this.ai++;this.reset(1)}if(b.x>W){this.me++;setScore(this.me);sfx("point");this.reset(-1)}if(this.me>=5)endGame("بردی!","۵ امتیاز گرفتی. رکوردت ذخیره شد.");if(this.ai>=5)endGame("این دست را باختی","یک بار دیگر از اول امتحان کن.");
 };
 this.reset=function(dir){this.ball={x:W/2,y:H/2,vx:340*dir,vy:(Math.random()*260-130)}};
 this.draw=function(){clear();grid();ctx.setLineDash([12,15]);ctx.strokeStyle="rgba(244,234,213,.18)";ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);rect(28,this.py,14,130,"#f4ead5");rect(W-42,this.ay,14,130,"#f4ead5");circle(this.ball.x,this.ball.y,11,"#e85b35");ctx.fillStyle="rgba(244,234,213,.35)";ctx.font="700 44px monospace";ctx.textAlign="center";ctx.fillText(this.me,W/2-55,70);ctx.fillText(this.ai,W/2+55,70)}
}
function Snake(){
 this.cell=30;this.cols=W/this.cell;this.rows=H/this.cell;this.body=[{x:12,y:10},{x:11,y:10},{x:10,y:10}];this.dir={x:1,y:0};this.next={x:1,y:0};this.acc=0;this.food={x:23,y:10};
 this.foodNew=function(){var p;do{p={x:Math.floor(Math.random()*this.cols),y:Math.floor(Math.random()*this.rows)}}while(this.body.some(function(s){return s.x===p.x&&s.y===p.y}));this.food=p};
 this.update=function(dt){if(pressed("ArrowUp")&&this.dir.y!==1)this.next={x:0,y:-1};if(pressed("ArrowDown")&&this.dir.y!==-1)this.next={x:0,y:1};if(pressed("ArrowLeft")&&this.dir.x!==1)this.next={x:-1,y:0};if(pressed("ArrowRight")&&this.dir.x!==-1)this.next={x:1,y:0};this.acc+=dt;if(this.acc<.105)return;this.acc=0;this.dir=this.next;var h={x:this.body[0].x+this.dir.x,y:this.body[0].y+this.dir.y};if(h.x<0||h.y<0||h.x>=this.cols||h.y>=this.rows||this.body.some(function(s){return s.x===h.x&&s.y===h.y})){endGame("تمام شد","امتیازت "+fa(score)+" شد.");return}this.body.unshift(h);if(h.x===this.food.x&&h.y===this.food.y){setScore(score+10);sfx("eat");this.foodNew()}else this.body.pop()};
 this.draw=function(){clear();grid();circle(this.food.x*this.cell+15,this.food.y*this.cell+15,9,"#e85b35");this.body.forEach(function(s,i){rect(s.x*30+3,s.y*30+3,24,24,i===0?"#e8b94e":"#f4ead5")})}
}
function Breakout(){
 this.px=W/2-70;this.ball={x:W/2,y:H-100,vx:250,vy:-300};this.bricks=[];for(var r=0;r<5;r++)for(var c=0;c<11;c++)this.bricks.push({x:65+c*76,y:55+r*34,w:66,h:23,alive:true,row:r});
 this.update=function(dt){var s=500;if(pressed("ArrowLeft")||pressed("KeyA"))this.px-=s*dt;if(pressed("ArrowRight")||pressed("KeyD"))this.px+=s*dt;this.px=Math.max(15,Math.min(W-155,this.px));var b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<10||b.x>W-10)b.vx*=-1;if(b.y<10)b.vy=Math.abs(b.vy);if(b.vy>0&&b.y>H-55&&b.y<H-35&&b.x>this.px&&b.x<this.px+140){b.vy=-Math.abs(b.vy);b.vx+=(b.x-(this.px+70))*3}for(var i=0;i<this.bricks.length;i++){var q=this.bricks[i];if(q.alive&&b.x>q.x&&b.x<q.x+q.w&&b.y>q.y&&b.y<q.y+q.h){q.alive=false;b.vy*=-1;setScore(score+10);sfx("brick");break}}if(this.bricks.every(function(x){return !x.alive}))endGame("دیوار فرو ریخت!","همهٔ آجرها را شکستی.");if(b.y>H+20)endGame("توپ افتاد","دوباره امتحان کن.")};
 this.draw=function(){clear();grid();var colors=["#e85b35","#e8b94e","#f4ead5","#d88468","#86a59d"];this.bricks.forEach(function(b){if(b.alive)rect(b.x,b.y,b.w,b.h,colors[b.row])});rect(this.px,H-42,140,12,"#f4ead5");circle(this.ball.x,this.ball.y,10,"#e85b35")}
}
function Space(){
 this.x=W/2;this.bullets=[];this.enemies=[];this.enemyDir=1;this.enemySpeed=42;this.cool=0;this.wave=1;for(var r=0;r<4;r++)for(var c=0;c<9;c++)this.enemies.push({x:170+c*72,y:70+r*55,alive:true});
 this.update=function(dt){var s=420;if(pressed("ArrowLeft")||pressed("KeyA"))this.x-=s*dt;if(pressed("ArrowRight")||pressed("KeyD"))this.x+=s*dt;this.x=Math.max(28,Math.min(W-28,this.x));this.cool-=dt;if(pressed("Space")&&this.cool<=0){this.bullets.push({x:this.x,y:H-74});this.cool=.22;sfx("shoot")}this.bullets.forEach(function(b){b.y-=520*dt});this.bullets=this.bullets.filter(function(b){return b.y>-20});var alive=this.enemies.filter(function(e){return e.alive});var min=Infinity,max=-Infinity;alive.forEach(function(e){e.x+=this.enemyDir*this.enemySpeed*dt;min=Math.min(min,e.x);max=Math.max(max,e.x)}.bind(this));if(min<35||max>W-35){this.enemyDir*=-1;alive.forEach(function(e){e.y+=18})}for(var bi=this.bullets.length-1;bi>=0;bi--)for(var ei=0;ei<this.enemies.length;ei++){var e=this.enemies[ei],b=this.bullets[bi];if(e.alive&&b&&Math.abs(b.x-e.x)<24&&Math.abs(b.y-e.y)<20){e.alive=false;this.bullets.splice(bi,1);setScore(score+10);sfx("boom");break}}if(alive.some(function(e){return e.y>H-120}))endGame("مهاجم‌ها رسیدند","امتیازت "+fa(score)+" شد.");if(this.enemies.every(function(e){return !e.alive}))endGame("فضا پاک شد!","این موج را کامل زدی.")};
 this.draw=function(){clear();grid();ctx.fillStyle="rgba(232,185,78,.7)";for(var i=0;i<45;i++)ctx.fillRect((i*173)%W,(i*97)%H,2,2);ctx.fillStyle="#e85b35";ctx.beginPath();ctx.moveTo(this.x,H-65);ctx.lineTo(this.x-22,H-30);ctx.lineTo(this.x+22,H-30);ctx.closePath();ctx.fill();this.bullets.forEach(function(b){rect(b.x-2,b.y,4,16,"#e8b94e")});this.enemies.forEach(function(e){if(!e.alive)return;ctx.fillStyle="#f4ead5";ctx.fillRect(e.x-18,e.y-10,36,18);ctx.fillRect(e.x-11,e.y-17,22,7);ctx.fillStyle="#174f4a";ctx.fillRect(e.x-9,e.y-5,5,5);ctx.fillRect(e.x+4,e.y-5,5,5)})}
}
function createGame(){if(current==="pong")return new Pong();if(current==="snake")return new Snake();if(current==="breakout")return new Breakout();return new Space()}
function setup(id){current=id;running=false;paused=false;game=createGame();setScore(0);showBest();var m=meta[id];document.getElementById("game-label").textContent=m.label;document.getElementById("game-title").textContent=m.title;document.getElementById("control-hint").textContent=m.hint;overlay(m.title,m.copy,m.button);document.querySelectorAll(".game-card").forEach(function(b){b.classList.toggle("active",b.dataset.game===id)});game.draw()}
function start(){game=createGame();setScore(0);addPlay(current);running=false;paused=false;hideOverlay();readySequence(function(){running=true;last=performance.now();if(!raf)raf=requestAnimationFrame(loop)})}
function loop(t){raf=requestAnimationFrame(loop);var dt=Math.min(.035,(t-last)/1000||0);last=t;if(!running||paused)return;game.update(dt);game.draw()}
function togglePause(){if(!running)return;paused=!paused;if(paused)overlay("توقف","برای ادامه دوباره دکمهٔ توقف یا P را بزن.","ادامه");else hideOverlay()}
document.querySelectorAll(".game-card").forEach(function(b){b.addEventListener("click",function(){setup(b.dataset.game);document.getElementById("arcade").scrollIntoView({behavior:"smooth",block:"start"})})});
document.getElementById("start-btn").addEventListener("click",function(){if(paused){paused=false;hideOverlay()}else start()});
document.getElementById("restart-btn").addEventListener("click",start);
document.getElementById("pause-btn").addEventListener("click",togglePause);
document.getElementById("fullscreen-btn").addEventListener("click",function(){var el=document.getElementById("screen-wrap");if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen()});
document.getElementById("mute-btn").addEventListener("click",function(){muted=!muted;try{localStorage.setItem("retrokhaneh-muted",muted?"1":"0")}catch(e){}updateMuteButton();if(!muted)beep(520,.06,"square",.025)});
updateMuteButton();
renderProgress();
checkAchievements();
window.addEventListener("keydown",function(e){if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==="KeyP")togglePause()},{passive:false});
window.addEventListener("keyup",function(e){keys[e.code]=false});
document.querySelectorAll("[data-key]").forEach(function(b){function on(e){e.preventDefault();keys[b.dataset.key]=true}function off(e){e.preventDefault();keys[b.dataset.key]=false}b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("pointerleave",off)});
try{var theme=localStorage.getItem("retrokhaneh-theme");if(theme)document.documentElement.dataset.theme=theme}catch(e){}
document.getElementById("theme-toggle").addEventListener("click",function(){var n=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("retrokhaneh-theme",n)}catch(e){}});
setup("pong");
})();