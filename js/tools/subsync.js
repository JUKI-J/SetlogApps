/* 자막 싱크 계산기: ms↔프레임, 프레임레이트 변환 드리프트, 두 점 선형 보정. */
(function(g){
  function msToFrames(ms,fps){return ms*fps/1000}
  function framesToMs(fr,fps){return fr*1000/fps}
  /* 자막이 fpsSub 기준으로 만들어졌는데 영상이 fpsVideo일 때: 자막 시각에 곱할 계수 */
  function fpsFactor(fpsSub,fpsVideo){return fpsSub/fpsVideo}
  function driftAt(tSec,factor){return tSec*(factor-1)} // 초: +면 자막이 늦어짐(보정 전)
  /* 두 점: (자막시각 s1 -> 실제 a1), (s2 -> a2). new = scale*s + offset */
  function twoPoint(s1,a1,s2,a2){
    if(s1===s2)return null;
    var scale=(a2-a1)/(s2-s1);return {scale:scale,offset:a1-scale*s1};
  }
  function parseTime(s){ // "1:02:03.5" / "62:03" / "123.4"
    s=String(s).trim().replace(',','.');if(!s)return NaN;
    var p=s.split(':').map(Number);if(p.some(function(x){return !isFinite(x)}))return NaN;
    var t=0;p.forEach(function(x){t=t*60+x});return t;
  }
  function fmtTime(t){var neg=t<0;t=Math.abs(t);var h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;
    return (neg?'-':'')+(h?h+':':'')+(h||m?(m<10&&h?'0':'')+m+':':'')+(s<10&&(h||m)?'0':'')+s.toFixed(3)}
  var api={msToFrames:msToFrames,framesToMs:framesToMs,fpsFactor:fpsFactor,driftAt:driftAt,twoPoint:twoPoint,parseTime:parseTime,fmtTime:fmtTime};
  g.SubSync=api;if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  var T=g.TK,h=T.h;
  function mount(root){
    root.appendChild(h('h3',{text:'자막 싱크 계산기'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'세 가지 상황을 한 곳에서 계산합니다. 모든 계산은 브라우저 안에서만 이루어집니다.'}));
    // A
    var fps=T.field('프레임레이트',{},'select');
    [['23.976','23.976 (영화 24000/1001)'],['24','24'],['25','25 (PAL)'],['29.97','29.97 (30000/1001)'],['30','30'],['60','60']].forEach(function(o){fps.input.appendChild(h('option',{value:o[0],text:o[1]}))});
    var ms=T.field('밀리초(ms)',{type:'text',inputmode:'numeric',value:'500'});
    var fr=T.field('프레임 수',{type:'text',inputmode:'numeric'});
    var outA=h('div',{'class':'out','aria-live':'polite'});
    function calcA(src){var f=+fps.input.value;
      if(src==='fr'){var n=T.num(fr.input.value);if(isFinite(n)){ms.input.value=T.fmt(framesToMs(n,f),1).replace(/,/g,'')}}
      else{var m=T.num(ms.input.value);if(isFinite(m))fr.input.value=T.fmt(msToFrames(m,f),2).replace(/,/g,'')}
      outA.innerHTML='<p><b>'+ms.input.value+' ms</b> = <b>'+fr.input.value+' 프레임</b> ('+fps.input.value+' fps 기준)</p>'}
    ms.input.addEventListener('input',function(){calcA('ms')});fr.input.addEventListener('input',function(){calcA('fr')});fps.input.addEventListener('change',function(){calcA('ms')});
    root.appendChild(h('h4',{text:'1. 밀리초 ↔ 프레임'}));
    root.appendChild(h('div',{'class':'row'},[fps.wrap,ms.wrap,fr.wrap]));root.appendChild(outA);calcA('ms');
    // B
    var fs=T.field('자막이 만들어진 프레임레이트',{type:'text',inputmode:'decimal',value:'23.976'});
    var fv=T.field('내 영상의 프레임레이트',{type:'text',inputmode:'decimal',value:'25'});
    var tt=T.field('영상 길이(분)',{type:'text',inputmode:'decimal',value:'110'});
    var outB=h('div',{'class':'out','aria-live':'polite'});
    function calcB(){var a=T.num(fs.input.value),b=T.num(fv.input.value),t=T.num(tt.input.value);
      if(!(a>0&&b>0&&t>0)){outB.innerHTML='<p class="err">세 값을 모두 양수로 입력하세요.</p>';return}
      var k=fpsFactor(a,b),d=driftAt(t*60,k);
      outB.innerHTML=Math.abs(k-1)<1e-4?'<p>두 값이 사실상 같아 프레임레이트 때문에 생기는 어긋남은 없습니다.</p>':
      '<p>자막 시각에 곱할 계수 <b>'+k.toFixed(6)+'</b></p><p>보정하지 않으면 영상 끝('+T.fmt(t)+'분)에서 자막이 약 <b>'+Math.abs(d).toFixed(1)+'초 '+(d>0?'늦게':'빨리')+'</b> 나옵니다. 처음엔 맞고 뒤로 갈수록 벌어지면 이 원인입니다.</p>'}
    [fs,fv,tt].forEach(function(f){f.input.addEventListener('input',calcB)});
    root.appendChild(h('h4',{text:'2. 처음엔 맞다가 점점 벌어질 때 (프레임레이트 불일치)'}));
    root.appendChild(h('div',{'class':'row'},[fs.wrap,fv.wrap,tt.wrap]));root.appendChild(outB);calcB();
    // C
    var s1=T.field('앞쪽 대사: 자막의 시각',{type:'text',value:'0:02:10',placeholder:'0:02:10'});
    var a1=T.field('같은 대사: 영상에서 실제 시각',{type:'text',value:'0:02:12.5'});
    var s2=T.field('뒤쪽 대사: 자막의 시각',{type:'text',value:'1:40:00'});
    var a2=T.field('같은 대사: 영상에서 실제 시각',{type:'text',value:'1:40:08'});
    var outC=h('div',{'class':'out','aria-live':'polite'});
    function calcC(){var r=twoPoint(parseTime(s1.input.value),parseTime(a1.input.value),parseTime(s2.input.value),parseTime(a2.input.value));
      if(!r||!isFinite(r.scale)){outC.innerHTML='<p class="err">시각을 0:02:10 또는 130.5 형식으로, 두 지점이 서로 다르게 입력하세요.</p>';return}
      outC.innerHTML='<p>배율 <b>'+r.scale.toFixed(6)+'</b> · 시작 오프셋 <b>'+(r.offset>=0?'+':'')+r.offset.toFixed(3)+'초</b></p><p>자막 프로그램에 "배율(스트레치)"과 "오프셋"을 넣거나, 배율이 1에 아주 가까우면(예: 0.9995~1.0005) 오프셋 한 번이면 충분합니다. 배율이 1이 아니면 앞뒤 어긋남 크기가 달라 단순 평행 이동으로는 안 맞습니다.</p>'}
    [s1,a1,s2,a2].forEach(function(f){f.input.addEventListener('input',calcC)});
    root.appendChild(h('h4',{text:'3. 앞과 뒤 두 대사로 직접 맞추기'}));
    root.appendChild(h('div',{'class':'row'},[s1.wrap,a1.wrap,s2.wrap,a2.wrap]));root.appendChild(outC);calcC();
  }
  g.addEventListener('DOMContentLoaded',function(){[].forEach.call(document.querySelectorAll('[data-tool="subsync"]'),mount)});
})(typeof window!=='undefined'?window:globalThis);
