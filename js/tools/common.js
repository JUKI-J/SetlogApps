/* SETLOG guide tools: tiny DOM helper. No dependencies, works offline. */
(function(g){
  function h(tag,attrs,kids){
    var e=document.createElement(tag);
    for(var k in (attrs||{})){
      if(k==='text')e.textContent=attrs[k];
      else if(k==='html')e.innerHTML=attrs[k];
      else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);
      else e.setAttribute(k,attrs[k]);
    }
    (kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c)});
    return e;
  }
  var uid=0;
  function field(label,attrs,tag){
    var id='f'+(++uid)+Math.random().toString(36).slice(2,6);
    attrs=attrs||{};attrs.id=id;
    var inp=h(tag||'input',attrs,[]);
    return {wrap:h('div',{},[h('label',{'for':id,text:label}),inp]),input:inp};
  }
  function num(v){var n=parseFloat(String(v).replace(/,/g,''));return isFinite(n)?n:NaN}
  function fmt(n,d){if(!isFinite(n))return '-';return n.toLocaleString('ko-KR',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:0})}
  function pad(n){return n<10?'0'+n:''+n}
  function hms(sec){sec=Math.round(sec);var hh=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (hh?hh+':'+pad(m):m)+':'+pad(s)}
  g.TK={h:h,field:field,num:num,fmt:fmt,pad:pad,hms:hms};
})(typeof window!=='undefined'?window:globalThis);
