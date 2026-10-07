/* 인터벌 운동 빌더: 총 시간·거리 계산 + 페이스↔속도 변환. */
(function(g){
  function parsePace(s){ // "5:30" or "5.5" -> sec/km
    s=String(s).trim();var m=s.match(/^(\d+):([0-5]?\d)$/);
    if(m)return +m[1]*60+ +m[2];
    var n=parseFloat(s);return isFinite(n)&&n>0?n*60:NaN;
  }
  function fmtPace(sec){var m=Math.floor(sec/60),s=Math.round(sec%60);if(s===60){m++;s=0}return m+':'+(s<10?'0'+s:s)}
  function paceToKmh(sec){return 3600/sec}
  function kmhToPace(kmh){return 3600/kmh}
  function build(o){ // times in sec, paces in sec/km (optional)
    var work=o.workSec*o.reps, rest=o.restSec*Math.max(o.reps-(o.restAfterLast?0:1),0);
    var total=o.warmSec+work+rest+o.coolSec;
    var dist=0;
    if(o.workPace>0)dist+=work/o.workPace;
    if(o.restPace>0)dist+=rest/o.restPace;
    if(o.easyPace>0)dist+=(o.warmSec+o.coolSec)/o.easyPace;
    return {total:total,work:work,rest:rest,distKm:dist,workShare:total>0?work/total:0};
  }
  /* 입력 거리·시간으로 페이스, 기록 예측(Riegel, 지수 1.06) */
  function riegel(t1,d1,d2,k){return t1*Math.pow(d2/d1,k||1.06)}
  var api={parsePace:parsePace,fmtPace:fmtPace,paceToKmh:paceToKmh,kmhToPace:kmhToPace,build:build,riegel:riegel};
  g.Interval=api;
  if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  var T=g.TK,h=T.h;
  function mountBuilder(root){
    var f={w:T.field('준비 달리기(분)',{type:'number',min:0,value:5,inputmode:'decimal'}),
      c:T.field('마무리 달리기(분)',{type:'number',min:0,value:5,inputmode:'decimal'}),
      n:T.field('반복 횟수',{type:'number',min:1,value:6,inputmode:'numeric'}),
      ws:T.field('빠르게 달리는 시간(초)',{type:'number',min:5,value:90,inputmode:'numeric'}),
      rs:T.field('회복 시간(초)',{type:'number',min:0,value:90,inputmode:'numeric'}),
      wp:T.field('빠른 구간 페이스 (분:초/km, 선택)',{type:'text',placeholder:'5:00'}),
      rp:T.field('회복 구간 페이스 (선택)',{type:'text',placeholder:'7:30'}),
      ep:T.field('준비·마무리 페이스 (선택)',{type:'text',placeholder:'6:45'})};
    var out=h('div',{'class':'out','aria-live':'polite'});
    function calc(){
      var reps=Math.floor(T.num(f.n.input.value));
      if(!(reps>=1)){out.innerHTML='<p class="err">반복 횟수는 1 이상이어야 합니다.</p>';return}
      var o={warmSec:Math.max(T.num(f.w.input.value)||0,0)*60,coolSec:Math.max(T.num(f.c.input.value)||0,0)*60,reps:reps,
        workSec:T.num(f.ws.input.value)||0,restSec:T.num(f.rs.input.value)||0,
        workPace:parsePace(f.wp.input.value),restPace:parsePace(f.rp.input.value),easyPace:parsePace(f.ep.input.value)};
      var r=build(o),html='<p>총 운동 시간 <b>'+T.hms(r.total)+'</b> (빠른 구간 합계 '+T.hms(r.work)+', 회복 합계 '+T.hms(r.rest)+')</p><p>전체에서 빠른 구간 비중 <b>'+T.fmt(r.workShare*100,0)+'%</b></p>';
      if(r.distKm>0)html+='<p>입력한 페이스로 환산한 거리 약 <b>'+T.fmt(r.distKm,2)+' km</b> (페이스를 일부만 넣으면 그 구간만 합산됩니다)</p>';
      if(o.restSec>0&&o.workSec>0){var ratio=o.workSec/o.restSec;html+='<p>운동:회복 비율 <b>1 : '+T.fmt(1/ratio,2)+'</b>'+(ratio>=1.5?' — 회복이 짧은 편입니다. 숨이 가쁘면 회복을 늘리세요.':'')+'</p>'}
      out.innerHTML=html;
    }
    root.appendChild(h('h3',{text:'인터벌 운동 시간·거리 계산기'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'준비 달리기, 반복, 마무리를 입력하면 총 시간을 계산합니다. 페이스를 넣으면 대략의 거리도 나옵니다.'}));
    var g1=h('div',{'class':'row'},[f.w.wrap,f.c.wrap,f.n.wrap,f.ws.wrap,f.rs.wrap]);
    var g2=h('div',{'class':'row'},[f.wp.wrap,f.rp.wrap,f.ep.wrap]);
    root.appendChild(g1);root.appendChild(g2);root.appendChild(out);
    Object.keys(f).forEach(function(k){f[k].input.addEventListener('input',calc)});calc();
  }
  function mountPace(root){
    var p=T.field('페이스 (분:초/km)',{type:'text',value:'5:30',placeholder:'5:30'});
    var k=T.field('속도 (km/h)',{type:'text',inputmode:'decimal'});
    var d=T.field('거리(km)',{type:'text',inputmode:'decimal',value:'5'});
    var out=h('div',{'class':'out','aria-live':'polite'});
    var last='p';
    function calc(){
      var sec;
      if(last==='p'){sec=parsePace(p.input.value);if(!(sec>0)){out.innerHTML='<p class="err">페이스를 5:30 형식으로 입력하세요.</p>';return}k.input.value=T.fmt(paceToKmh(sec),2).replace(/,/g,'')}
      else{var v=T.num(k.input.value);if(!(v>0)){out.innerHTML='<p class="err">속도를 숫자로 입력하세요.</p>';return}sec=kmhToPace(v);p.input.value=fmtPace(sec)}
      var dist=T.num(d.input.value),html='<p>페이스 <b>'+fmtPace(sec)+'/km</b> = 시속 <b>'+T.fmt(paceToKmh(sec),2)+' km/h</b> = 트레드밀 속도 설정 '+T.fmt(paceToKmh(sec),1)+'</p>';
      if(dist>0){html+='<p>'+T.fmt(dist,2)+' km 완주 시간 <b>'+T.hms(sec*dist)+'</b></p>';
        [[5,'5K'],[10,'10K'],[21.0975,'하프'],[42.195,'풀']].forEach(function(r){html+='<span style="display:inline-block;margin-right:14px;font-size:14px">'+r[1]+' <b>'+T.hms(sec*r[0])+'</b></span>'})}
      html+='<p style="font-size:12.5px;color:var(--muted);margin-top:8px">400m 트랙 한 바퀴 '+T.hms(sec*0.4)+'</p>';
      out.innerHTML=html;
    }
    p.input.addEventListener('input',function(){last='p';calc()});
    k.input.addEventListener('input',function(){last='k';calc()});
    d.input.addEventListener('input',calc);
    root.appendChild(h('h3',{text:'페이스 ↔ 속도 변환기'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'어느 쪽이든 입력하면 반대쪽과 주요 거리별 예상 완주 시간이 계산됩니다.'}));
    root.appendChild(h('div',{'class':'row'},[p.wrap,k.wrap,d.wrap]));root.appendChild(out);calc();
  }
  g.addEventListener('DOMContentLoaded',function(){
    [].forEach.call(document.querySelectorAll('[data-tool="interval"]'),mountBuilder);
    [].forEach.call(document.querySelectorAll('[data-tool="pace"]'),mountPace);
  });
})(typeof window!=='undefined'?window:globalThis);
