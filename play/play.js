(function(){
"use strict";
var canvas=document.getElementById("game-canvas"),ctx=canvas.getContext("2d");
var W=canvas.width,H=canvas.height,keys={},raf=null,last=0,running=false,paused=false,current="pong",game=null,score=0;
var meta={
 pong:{title:"پونگ",label:"ARCADE 01",hint:"↑ ↓ یا W/S حرکت · P توقف",copy:"با کلیدهای بالا و پایین راکت را حرکت بده."},
 snake:{title:"مار",label:"ARCADE 02",hint:"کلیدهای جهت حرکت · P توقف",copy:"جهت را عوض کن، غذا را بگیر و به دیوار یا خودت نخور."},
 breakout:{title:"آجرشکن",label:"ARCADE 03",hint:"← → یا A/D حرکت · P توقف",copy:"راکت را حرکت بده و همهٔ آجرها را بشکن."},
 space:{title:"نبرد فضایی",label:"ARCADE 04",hint:"← → حرکت · Space شلیک · P توقف",copy:"کشتی را حرکت بده و مهاجم‌ها را پیش از رسیدن به پایین بزن."}
};
function fa(n){try{return new Intl.NumberFormat("fa-IR").format(n)}catch(e){return n}}
function bestKey(){return "retrokhaneh-best-"+current}
function getBest(){return Number(localStorage.getItem(bestKey())||0)}
function setScore(v){score=Math.max(0,Math.floor(v));document.getElementById("score").textContent=fa(score);if(score>getBest()){localStorage.setItem(bestKey(),score);document.getElementById("best").textContent=fa(score)}}
function showBest(){document.getElementById("best").textContent=fa(getBest())}
function overlay(title,copy,button){document.getElementById("overlay-title").textContent=title;document.getElementById("overlay-copy").textContent=copy;document.getElementById("start-btn").textContent=button||"شروع بازی";document.getElementById("game-overlay").classList.remove("hidden")}
function hideOverlay(){document.getElementById("game-overlay").classList.add("hidden")}
function endGame(title,copy){running=false;overlay(title,copy,"دوباره بازی کن")}
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
  if(b.vx<0&&b.x<48&&b.x>28&&b.y>this.py&&b.y<this.py+130){b.vx=Math.abs(b.vx)*1.035;b.vy+=(b.y-(this.py+65))*3;b.x=48}
  if(b.vx>0&&b.x>W-48&&b.x<W-28&&b.y>this.ay&&b.y<this.ay+130){b.vx=-Math.abs(b.vx)*1.035;b.vy+=(b.y-(this.ay+65))*3;b.x=W-48}
  if(b.x<0){this.ai++;this.reset(1)}if(b.x>W){this.me++;setScore(this.me);this.reset(-1)}if(this.me>=5)endGame("بردی!","۵ امتیاز گرفتی. رکوردت ذخیره شد.");if(this.ai>=5)endGame("این دست را باختی","یک بار دیگر از اول امتحان کن.");
 };
 this.reset=function(dir){this.ball={x:W/2,y:H/2,vx:340*dir,vy:(Math.random()*260-130)}};
 this.draw=function(){clear();grid();ctx.setLineDash([12,15]);ctx.strokeStyle="rgba(244,234,213,.18)";ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);rect(28,this.py,14,130,"#f4ead5");rect(W-42,this.ay,14,130,"#f4ead5");circle(this.ball.x,this.ball.y,11,"#e85b35");ctx.fillStyle="rgba(244,234,213,.35)";ctx.font="700 44px monospace";ctx.textAlign="center";ctx.fillText(this.me,W/2-55,70);ctx.fillText(this.ai,W/2+55,70)}
}
function Snake(){
 this.cell=30;this.cols=W/this.cell;this.rows=H/this.cell;this.body=[{x:12,y:10},{x:11,y:10},{x:10,y:10}];this.dir={x:1,y:0};this.next={x:1,y:0};this.acc=0;this.food={x:23,y:10};
 this.foodNew=function(){var p;do{p={x:Math.floor(Math.random()*this.cols),y:Math.floor(Math.random()*this.rows)}}while(this.body.some(function(s){return s.x===p.x&&s.y===p.y}));this.food=p};
 this.update=function(dt){if(pressed("ArrowUp")&&this.dir.y!==1)this.next={x:0,y:-1};if(pressed("ArrowDown")&&this.dir.y!==-1)this.next={x:0,y:1};if(pressed("ArrowLeft")&&this.dir.x!==1)this.next={x:-1,y:0};if(pressed("ArrowRight")&&this.dir.x!==-1)this.next={x:1,y:0};this.acc+=dt;if(this.acc<.105)return;this.acc=0;this.dir=this.next;var h={x:this.body[0].x+this.dir.x,y:this.body[0].y+this.dir.y};if(h.x<0||h.y<0||h.x>=this.cols||h.y>=this.rows||this.body.some(function(s){return s.x===h.x&&s.y===h.y})){endGame("تمام شد","امتیازت "+fa(score)+" شد.");return}this.body.unshift(h);if(h.x===this.food.x&&h.y===this.food.y){setScore(score+10);this.foodNew()}else this.body.pop()};
 this.draw=function(){clear();grid();circle(this.food.x*this.cell+15,this.food.y*this.cell+15,9,"#e85b35");this.body.forEach(function(s,i){rect(s.x*30+3,s.y*30+3,24,24,i===0?"#e8b94e":"#f4ead5")})}
}
function Breakout(){
 this.px=W/2-70;this.ball={x:W/2,y:H-100,vx:250,vy:-300};this.bricks=[];for(var r=0;r<5;r++)for(var c=0;c<11;c++)this.bricks.push({x:65+c*76,y:55+r*34,w:66,h:23,alive:true,row:r});
 this.update=function(dt){var s=500;if(pressed("ArrowLeft")||pressed("KeyA"))this.px-=s*dt;if(pressed("ArrowRight")||pressed("KeyD"))this.px+=s*dt;this.px=Math.max(15,Math.min(W-155,this.px));var b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<10||b.x>W-10)b.vx*=-1;if(b.y<10)b.vy=Math.abs(b.vy);if(b.vy>0&&b.y>H-55&&b.y<H-35&&b.x>this.px&&b.x<this.px+140){b.vy=-Math.abs(b.vy);b.vx+=(b.x-(this.px+70))*3}for(var i=0;i<this.bricks.length;i++){var q=this.bricks[i];if(q.alive&&b.x>q.x&&b.x<q.x+q.w&&b.y>q.y&&b.y<q.y+q.h){q.alive=false;b.vy*=-1;setScore(score+10);break}}if(this.bricks.every(function(x){return !x.alive}))endGame("دیوار فرو ریخت!","همهٔ آجرها را شکستی.");if(b.y>H+20)endGame("توپ افتاد","دوباره امتحان کن.")};
 this.draw=function(){clear();grid();var colors=["#e85b35","#e8b94e","#f4ead5","#d88468","#86a59d"];this.bricks.forEach(function(b){if(b.alive)rect(b.x,b.y,b.w,b.h,colors[b.row])});rect(this.px,H-42,140,12,"#f4ead5");circle(this.ball.x,this.ball.y,10,"#e85b35")}
}
function Space(){
 this.x=W/2;this.bullets=[];this.enemies=[];this.enemyDir=1;this.enemySpeed=42;this.cool=0;this.wave=1;for(var r=0;r<4;r++)for(var c=0;c<9;c++)this.enemies.push({x:170+c*72,y:70+r*55,alive:true});
 this.update=function(dt){var s=420;if(pressed("ArrowLeft")||pressed("KeyA"))this.x-=s*dt;if(pressed("ArrowRight")||pressed("KeyD"))this.x+=s*dt;this.x=Math.max(28,Math.min(W-28,this.x));this.cool-=dt;if(pressed("Space")&&this.cool<=0){this.bullets.push({x:this.x,y:H-74});this.cool=.22}this.bullets.forEach(function(b){b.y-=520*dt});this.bullets=this.bullets.filter(function(b){return b.y>-20});var alive=this.enemies.filter(function(e){return e.alive});var min=Infinity,max=-Infinity;alive.forEach(function(e){e.x+=this.enemyDir*this.enemySpeed*dt;min=Math.min(min,e.x);max=Math.max(max,e.x)}.bind(this));if(min<35||max>W-35){this.enemyDir*=-1;alive.forEach(function(e){e.y+=18})}for(var bi=this.bullets.length-1;bi>=0;bi--)for(var ei=0;ei<this.enemies.length;ei++){var e=this.enemies[ei],b=this.bullets[bi];if(e.alive&&b&&Math.abs(b.x-e.x)<24&&Math.abs(b.y-e.y)<20){e.alive=false;this.bullets.splice(bi,1);setScore(score+10);break}}if(alive.some(function(e){return e.y>H-120}))endGame("مهاجم‌ها رسیدند","امتیازت "+fa(score)+" شد.");if(this.enemies.every(function(e){return !e.alive}))endGame("فضا پاک شد!","این موج را کامل زدی.")};
 this.draw=function(){clear();grid();ctx.fillStyle="rgba(232,185,78,.7)";for(var i=0;i<45;i++)ctx.fillRect((i*173)%W,(i*97)%H,2,2);ctx.fillStyle="#e85b35";ctx.beginPath();ctx.moveTo(this.x,H-65);ctx.lineTo(this.x-22,H-30);ctx.lineTo(this.x+22,H-30);ctx.closePath();ctx.fill();this.bullets.forEach(function(b){rect(b.x-2,b.y,4,16,"#e8b94e")});this.enemies.forEach(function(e){if(!e.alive)return;ctx.fillStyle="#f4ead5";ctx.fillRect(e.x-18,e.y-10,36,18);ctx.fillRect(e.x-11,e.y-17,22,7);ctx.fillStyle="#174f4a";ctx.fillRect(e.x-9,e.y-5,5,5);ctx.fillRect(e.x+4,e.y-5,5,5)})}
}
function createGame(){if(current==="pong")return new Pong();if(current==="snake")return new Snake();if(current==="breakout")return new Breakout();return new Space()}
function setup(id){current=id;running=false;paused=false;game=createGame();setScore(0);showBest();var m=meta[id];document.getElementById("game-label").textContent=m.label;document.getElementById("game-title").textContent=m.title;document.getElementById("control-hint").textContent=m.hint;overlay(m.title,m.copy,"شروع بازی");document.querySelectorAll(".game-card").forEach(function(b){b.classList.toggle("active",b.dataset.game===id)});game.draw()}
function start(){game=createGame();setScore(0);running=true;paused=false;last=performance.now();hideOverlay();if(!raf)raf=requestAnimationFrame(loop)}
function loop(t){raf=requestAnimationFrame(loop);var dt=Math.min(.035,(t-last)/1000||0);last=t;if(!running||paused)return;game.update(dt);game.draw()}
function togglePause(){if(!running)return;paused=!paused;if(paused)overlay("توقف","برای ادامه دوباره دکمهٔ توقف یا P را بزن.","ادامه");else hideOverlay()}
document.querySelectorAll(".game-card").forEach(function(b){b.addEventListener("click",function(){setup(b.dataset.game);document.getElementById("arcade").scrollIntoView({behavior:"smooth",block:"start"})})});
document.getElementById("start-btn").addEventListener("click",function(){if(paused){paused=false;hideOverlay()}else start()});
document.getElementById("restart-btn").addEventListener("click",start);
document.getElementById("pause-btn").addEventListener("click",togglePause);
document.getElementById("fullscreen-btn").addEventListener("click",function(){var el=document.getElementById("screen-wrap");if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen()});
window.addEventListener("keydown",function(e){if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==="KeyP")togglePause()},{passive:false});
window.addEventListener("keyup",function(e){keys[e.code]=false});
document.querySelectorAll("[data-key]").forEach(function(b){function on(e){e.preventDefault();keys[b.dataset.key]=true}function off(e){e.preventDefault();keys[b.dataset.key]=false}b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("pointerleave",off)});
try{var theme=localStorage.getItem("retrokhaneh-theme");if(theme)document.documentElement.dataset.theme=theme}catch(e){}
document.getElementById("theme-toggle").addEventListener("click",function(){var n=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("retrokhaneh-theme",n)}catch(e){}});
setup("pong");
})();