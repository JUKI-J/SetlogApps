/* 연습 템포 계산기: 원곡 BPM·속도 비율 → 연습 BPM, 루프 길이, 단계별 속도 올리기 계획. */
(function(g){
  function practiceBpm(bpm,pct){return bpm*pct/100}
  function loopSeconds(bars,beatsPerBar,bpm){return bars*beatsPerBar*60/bpm}
  /* from%→100% 까지 step% 씩, 단계마다 reps번 반복 */
  function plan(bpm,fromPct,step,bars,beats,reps){
    var out=[];if(!(step>0)||fromPct>100)return out;
    for(var p=fromPct;;p+=step){var q=Math.min(p,100),b=practiceBpm(bpm,q),one=loopSeconds(bars,beats,b);
      out.push({pct:q,bpm:b,perLoop:one,total:one*reps});if(q>=100||out.length>40)break}
    return out;
  }
  var api={practiceBpm:practiceBpm,loopSeconds:loopSeconds,plan:plan};
  g.Practice=api;if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  var T=g.TK,h=T.h;
  function mount(root){
    var f={bpm:T.field('원곡 BPM',{type:'number',min:30,max:300,value:120,inputmode:'decimal'}),
      from:T.field('시작 속도(%)',{type:'number',min:25,max:100,value:60,inputmode:'numeric'}),
      step:T.field('단계 간격(%)',{type:'number',min:1,max:50,value:10,inputmode:'numeric'}),
      bars:T.field('루프 길이(마디)',{type:'number',min:1,value:4,inputmode:'numeric'}),
      beats:T.field('마디당 박 수',{type:'number',min:1,value:4,inputmode:'numeric'}),
      reps:T.field('단계당 반복',{type:'number',min:1,value:5,inputmode:'numeric'})};
    var out=h('div',{'class':'out','aria-live':'polite'});
    function calc(){var v={};Object.keys(f).forEach(function(k){v[k]=T.num(f[k].input.value)});
      if(!(v.bpm>0&&v.from>0&&v.step>0&&v.bars>0&&v.beats>0&&v.reps>0)||v.from>100){out.innerHTML='<p class="err">모든 칸을 올바른 숫자로 채우세요(시작 속도는 100 이하).</p>';return}
      var p=plan(v.bpm,v.from,v.step,v.bars,v.beats,v.reps),tot=0;
      var rows=p.map(function(s){tot+=s.total;return '<tr><td>'+T.fmt(s.pct,0)+'%</td><td>'+T.fmt(s.bpm,1)+'</td><td>'+T.fmt(s.perLoop,1)+'초</td><td>'+T.hms(s.total)+'</td></tr>'}).join('');
      out.innerHTML='<div class="tbl-wrap" style="margin:0"><table style="min-width:0"><thead><tr><th>속도</th><th>BPM</th><th>루프 1회</th><th>단계 합계</th></tr></thead><tbody>'+rows+'</tbody></table></div><p style="margin-top:8px">전체 약 <b>'+T.hms(tot)+'</b>. 한 단계를 연속으로 틀리지 않고 끝낼 때만 다음 단계로 올리는 방식으로 쓰세요.</p>'}
    Object.keys(f).forEach(function(k){f[k].input.addEventListener('input',calc)});
    root.appendChild(h('h3',{text:'연습 템포 계획 계산기'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'느린 속도에서 시작해 원곡 속도까지 올라가는 단계별 연습표를 만듭니다.'}));
    root.appendChild(h('div',{'class':'row'},Object.keys(f).map(function(k){return f[k].wrap})));root.appendChild(out);calc();
  }
  g.addEventListener('DOMContentLoaded',function(){[].forEach.call(document.querySelectorAll('[data-tool="practice"]'),mount)});
})(typeof window!=='undefined'?window:globalThis);
