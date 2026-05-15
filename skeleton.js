/* skeleton.js — YOLO keypoints + angle fallback */

var SKELETON_EDGES=[[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
var KP_NAMES=['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'];

function boneClr(angle,ideal){
  if(angle==null||!ideal) return '#00ff88';
  var lo=ideal[0],hi=ideal[1];
  if(angle<lo-5||angle>hi+5) return '#ff4444';
  if(angle<lo||angle>hi) return '#ff9f43';
  return '#00ff88';
}

function SkeletonView(canvasId){
  this.canvas=document.getElementById(canvasId);
  this.ctx=this.canvas.getContext('2d');
  this.angles={}; this.idealRanges={}; this.keypoints=null;
  this._rsz(); this.draw();
}

SkeletonView.prototype._rsz=function(){
  var p=this.canvas.parentElement; if(!p) return;
  this.canvas.width=Math.max(p.clientWidth-20,200);
  this.canvas.height=Math.max(p.clientHeight-12,260);
};

SkeletonView.prototype.update=function(angles,idealRanges,keypoints){
  this.angles=Object.assign({},angles);
  this.idealRanges=idealRanges||{};
  this.keypoints=(keypoints&&Object.keys(keypoints).length>0)?keypoints:null;
  this._rsz(); this.draw();
};

SkeletonView.prototype.draw=function(){
  var ctx=this.ctx,cw=this.canvas.width,ch=this.canvas.height;
  ctx.clearRect(0,0,cw,ch);
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(var y=0;y<ch;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();}
  if(this.keypoints) this._drawKP(); else this._drawAng();
};

/* ======= Mode A: YOLO 17 keypoints ======= */
SkeletonView.prototype._drawKP=function(){
  var ctx=this.ctx,cw=this.canvas.width,ch=this.canvas.height;
  var kp=this.keypoints,A=this.angles,R=this.idealRanges;
  var scale=Math.min((cw-40)/640,(ch-20)/480);
  var ox=(cw-640*scale)/2,oy=(ch-480*scale)/2;
  function tx(x){return ox+x*scale;}
  function ty(y){return oy+y*scale;}

  var pts={};
  Object.keys(kp).forEach(function(n){
    var d=kp[n];
    if(d&&d.conf>0.4) pts[n]={x:tx(d.x),y:ty(d.y),conf:d.conf};
  });
  // bones
  SKELETON_EDGES.forEach(function(e){
    var pa=pts[KP_NAMES[e[0]]],pb=pts[KP_NAMES[e[1]]];
    if(!pa||!pb) return;
    var alpha=0.3+Math.min(pa.conf,pb.conf)*0.7;
    ctx.strokeStyle='rgba(0,255,136,'+alpha.toFixed(2)+')';
    ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
  });
  // joints
  for(var n in pts){
    var p=pts[n],r=p.conf>0.7?5:4,a=0.4+p.conf*0.6;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle='rgba(0,255,136,'+a.toFixed(2)+')';
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  // angle arcs at real joint positions
  var s=this;
  s._arc(pts['right_shoulder'],pts['right_hip'],pts['right_knee'],A.hip,R.hip,'H');
  s._arc(pts['right_hip'],pts['right_knee'],pts['right_ankle'],A.knee,R.knee,'K');
  if(pts['right_hip']&&pts['right_shoulder'])
    s._arc({x:pts['right_hip'].x,y:pts['right_hip'].y-80},pts['right_hip'],pts['right_shoulder'],A.trunk,R.trunk,'T');
  if(pts['right_shoulder']&&pts['right_elbow'])
    s._arc(pts['right_elbow'],pts['right_shoulder'],pts['right_hip'],A.shoulder,R.shoulder,'S');
};

/* ======= Mode B: angle-based fallback ======= */
SkeletonView.prototype._drawAng=function(){
  var ctx=this.ctx,cw=this.canvas.width,ch=this.canvas.height;
  var A=this.angles,R=this.idealRanges;
  var s=ch/440,cx=cw*0.55,baseY=ch*0.88;
  var L1=100*s,L2=88*s,L3=84*s,L4=55*s,L5=52*s,rH=17*s,LF=36*s;
  var hA=d2r(A.hip||90),kA=d2r(A.knee||88),tA=d2r((A.trunk||40)-90);
  var sA=d2r(A.shoulder||80),eA=d2r(A.elbow||90),aA=d2r(80);

  var an={x:cx-20*s,y:baseY};
  var kn={x:an.x-L3*Math.cos(kA-Math.PI/2),y:an.y-L3*Math.sin(kA-Math.PI/2)};
  var hp={x:kn.x+L2*Math.cos(Math.PI-hA),y:kn.y-L2*Math.sin(Math.PI-hA)};
  var sh={x:hp.x+L1*Math.sin(tA),y:hp.y-L1*Math.cos(tA)};
  var hd={x:sh.x,y:sh.y-rH-4*s};
  var el={x:sh.x+L4*Math.cos(sA),y:sh.y+L4*Math.sin(sA)};
  var wr={x:el.x+L5*Math.cos(eA+sA-Math.PI),y:el.y+L5*Math.sin(eA+sA-Math.PI)};
  var to={x:an.x+LF*Math.cos(aA),y:an.y+LF*Math.sin(aA)};
  var anB={x:an.x+20*s,y:an.y+2*s};
  var knB={x:anB.x-L3*Math.cos(kA-Math.PI/2),y:anB.y-L3*Math.sin(kA-Math.PI/2)};
  var hpB={x:knB.x+L2*Math.cos(Math.PI-hA),y:knB.y-L2*Math.sin(Math.PI-hA)};
  var toB={x:anB.x-LF*Math.cos(aA),y:anB.y+LF*Math.sin(aA)};

  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,an.y+10); ctx.lineTo(cw,an.y+10); ctx.stroke();
  this._ln(hpB,knB,5,'#1a2540'); this._ln(knB,anB,4,'#1a2540'); this._ln(anB,toB,3,'#1a2540');
  this._bn(sh,el,5,A.shoulder,R.shoulder); this._bn(el,wr,4,A.elbow,R.elbow);
  this._bn(sh,hp,8,A.trunk,R.trunk); this._bn(hp,kn,8,A.hip,R.hip);
  this._bn(kn,an,7,A.knee,R.knee); this._ln(an,to,4,'#2a3a4e');
  ctx.beginPath(); ctx.arc(hd.x,hd.y,rH,0,Math.PI*2);
  ctx.fillStyle='#111927'; ctx.fill(); ctx.strokeStyle='#2a3a4e'; ctx.lineWidth=2; ctx.stroke();
  this._ln(hd,sh,2,'#2a3a4e');
  [sh,hp,kn,an,el,wr].forEach(function(j){
    ctx.beginPath(); ctx.arc(j.x,j.y,5,0,Math.PI*2);
    ctx.fillStyle='#00ff88'; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1; ctx.stroke();
  });
  [hpB,knB,anB].forEach(function(j){
    ctx.beginPath(); ctx.arc(j.x,j.y,3.5,0,Math.PI*2);
    ctx.fillStyle='#111927'; ctx.fill(); ctx.strokeStyle='#1a2540'; ctx.lineWidth=1; ctx.stroke();
  });
  this._arcAt(hp,sh,kn,A.hip,R.hip,'H');
  this._arcAt(kn,hp,an,A.knee,R.knee,'K');
  this._arcAt(sh,{x:sh.x,y:sh.y-60},hp,A.trunk,R.trunk,'T');
  this._arcAt(sh,el,hp,A.shoulder,R.shoulder,'S');
};

// helpers
SkeletonView.prototype._arc=function(p1,vertex,p2,angle,ideal,label){
  if(!p1||!vertex||!p2) return;
  var ctx=this.ctx,a1=Math.atan2(p1.y-vertex.y,p1.x-vertex.x),a2=Math.atan2(p2.y-vertex.y,p2.x-vertex.x),r=24;
  ctx.beginPath(); ctx.arc(vertex.x,vertex.y,r,Math.min(a1,a2),Math.max(a1,a2));
  ctx.strokeStyle=boneClr(angle,ideal); ctx.lineWidth=2; ctx.globalAlpha=0.45; ctx.stroke(); ctx.globalAlpha=1;
  var ma=(a1+a2)/2,lx=vertex.x+(r+20)*Math.cos(ma),ly=vertex.y+(r+20)*Math.sin(ma);
  ctx.fillStyle=boneClr(angle,ideal); ctx.font='bold 11px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label+' '+(angle!=null?Math.round(angle)+'\u00B0':''),lx,ly);
};
SkeletonView.prototype._arcAt=function(vertex,p1,p2,angle,ideal,label){
  var a1=Math.atan2(p1.y-vertex.y,p1.x-vertex.x),a2=Math.atan2(p2.y-vertex.y,p2.x-vertex.x),r=22;
  var ctx=this.ctx;
  ctx.beginPath(); ctx.arc(vertex.x,vertex.y,r,Math.min(a1,a2),Math.max(a1,a2));
  ctx.strokeStyle=boneClr(angle,ideal); ctx.lineWidth=1.5; ctx.globalAlpha=0.35; ctx.stroke(); ctx.globalAlpha=1;
  var ma=(a1+a2)/2,lx=vertex.x+(r+18)*Math.cos(ma),ly=vertex.y+(r+18)*Math.sin(ma);
  ctx.fillStyle=boneClr(angle,ideal); ctx.font='bold 11px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label+' '+(angle!=null?Math.round(angle)+'\u00B0':''),lx,ly);
};
SkeletonView.prototype._ln=function(a,b,w,c){
  var ctx=this.ctx; ctx.strokeStyle=c; ctx.lineWidth=w; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
};
SkeletonView.prototype._bn=function(a,b,w,angle,ideal){this._ln(a,b,w,boneClr(angle,ideal));};

function d2r(d){return d*Math.PI/180;}
