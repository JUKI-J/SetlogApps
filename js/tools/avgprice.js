/* 평균 단가(물타기) 계산기. 순수 계산 함수는 avgCalc / addBuy 로 노출. */
(function(g){
  function avgCalc(lots){
    var q=0,c=0;
    lots.forEach(function(l){q+=l.qty;c+=l.qty*l.price});
    return {qty:q,cost:c,avg:q>0?c/q:NaN};
  }
  /* 현재 평단·수량에서 현재가로 추가 매수했을 때 */
  function addBuy(avg,qty,price,addQty){
    var tq=qty+addQty,tc=avg*qty+price*addQty;
    return {qty:tq,avg:tc/tq,cost:tc};
  }
  /* 평단까지 오르는 데 필요한 상승률(%) */
  function breakevenRise(avg,price){return (avg/price-1)*100}
  /* 목표 평단을 만들려면 현재가로 몇 주를 더 사야 하는가 (target는 avg와 price 사이여야 함) */
  function qtyForTarget(avg,qty,price,target){
    if(!(target>price&&target<avg))return NaN;
    return qty*(avg-target)/(target-price);
  }
  var api={avgCalc:avgCalc,addBuy:addBuy,breakevenRise:breakevenRise,qtyForTarget:qtyForTarget};
  g.AvgPrice=api;
  if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  var T=g.TK,h=T.h;
  function mount(root){
    var rows=h('div',{});var out=h('div',{'class':'out','aria-live':'polite'});
    function addRow(q,p){
      var a=T.field('수량 (주)',{type:'text',inputmode:'decimal',value:q||''});
      var b=T.field('매수 단가',{type:'text',inputmode:'decimal',value:p||''});
      var r=h('div',{'class':'row'},[a.wrap,b.wrap]);
      a.input.addEventListener('input',calc);b.input.addEventListener('input',calc);
      r._q=a.input;r._p=b.input;rows.appendChild(r);
    }
    function calc(){
      var lots=[];
      [].forEach.call(rows.children,function(r){var q=T.num(r._q.value),p=T.num(r._p.value);if(q>0&&p>=0)lots.push({qty:q,price:p})});
      var cur=T.num(cp.input.value);
      if(!lots.length){out.innerHTML='<p>매수 내역을 한 줄 이상 입력하세요.</p>';return}
      var r=avgCalc(lots),html='<p>총 수량 <b>'+T.fmt(r.qty,4)+'주</b> · 총 매수금액 <b>'+T.fmt(r.cost)+'</b></p><p>평균 단가 <b>'+T.fmt(r.avg,2)+'</b></p>';
      if(cur>0){
        var pl=(cur/r.avg-1)*100;
        html+='<p>현재가 '+T.fmt(cur,2)+' 기준 평가손익 <b>'+(pl>=0?'+':'')+T.fmt(pl,2)+'%</b></p>';
        if(cur<r.avg)html+='<p>본전까지 필요한 상승률 <b>+'+T.fmt(breakevenRise(r.avg,cur),2)+'%</b></p>';
        var add=T.num(aq.input.value);
        if(add>0){var n=addBuy(r.avg,r.qty,cur,add);html+='<p>현재가로 '+T.fmt(add,4)+'주 추가하면 평균 단가 <b>'+T.fmt(n.avg,2)+'</b> (추가 금액 '+T.fmt(add*cur)+')</p>';
          if(cur<r.avg)html+='<p>그때 본전까지 필요한 상승률 <b>+'+T.fmt(breakevenRise(n.avg,cur),2)+'%</b></p>'}
        var tg=T.num(tt.input.value);
        if(tg>0){var k=qtyForTarget(r.avg,r.qty,cur,tg);html+=isFinite(k)?'<p>평단을 '+T.fmt(tg,2)+'로 낮추려면 현재가로 약 <b>'+T.fmt(Math.ceil(k))+'주</b> (약 '+T.fmt(Math.ceil(k)*cur)+') 추가 매수가 필요합니다.</p>':'<p class="err">목표 평단은 현재가보다 높고 현재 평단보다 낮아야 합니다.</p>'}
      }
      out.innerHTML=html+'<p style="font-size:12.5px;color:var(--muted)">수수료·세금·환율은 반영하지 않은 단순 계산입니다. 투자 조언이 아닙니다.</p>';
    }
    var cp=T.field('현재가 (선택)',{type:'text',inputmode:'decimal'});
    var aq=T.field('추가 매수 수량 (선택)',{type:'text',inputmode:'decimal'});
    var tt=T.field('목표 평단 (선택)',{type:'text',inputmode:'decimal'});
    [cp,aq,tt].forEach(function(f){f.input.addEventListener('input',calc)});
    root.appendChild(h('h3',{text:'평균 단가 계산기'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'매수 내역을 입력하면 평균 단가, 본전 상승률, 추가 매수 후 평단을 계산합니다. 입력값은 서버로 전송되지 않습니다.'}));
    root.appendChild(rows);
    root.appendChild(h('button',{type:'button',text:'+ 매수 내역 추가',onclick:function(){addRow()}}));
    root.appendChild(h('div',{'class':'row'},[cp.wrap,aq.wrap,tt.wrap]));
    root.appendChild(out);
    addRow('10','50000');addRow('10','40000');cp.input.value='38000';calc();
  }
  g.addEventListener('DOMContentLoaded',function(){[].forEach.call(document.querySelectorAll('[data-tool="avgprice"]'),mount)});
})(typeof window!=='undefined'?window:globalThis);
