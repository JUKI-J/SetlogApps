/* 선택 도우미: 파일 전송 방법 / 압축 포맷. 질문 3개 → 추천. 수치 없이 정성 규칙만 사용. */
(function(g){
  function transfer(a){ // a: {devices:'apple'|'mixed'|'pc', size:'small'|'medium'|'large', sensitive:bool, online:bool, keep:bool}
    var r=[];
    function add(name,why,score){r.push({name:name,why:why,score:score})}
    var s={cable:0,cloud:0,msg:0,nearby:0,session:0,mail:0},w={};
    function p(k,n,t){s[k]+=n;(w[k]=w[k]||[]).push(t)}
    if(a.devices==='apple'){p('nearby',4,'같은 애플 기기끼리라면 AirDrop이 가장 빠르고 매끄럽습니다.')}
    if(a.devices==='mixed'){p('session',2,'운영체제가 달라도 앱 설치 없이(웹) 쓸 수 있습니다.');p('cloud',2,'계정만 같으면 어느 기기에서든 열 수 있습니다.');p('nearby',1,'기종 조합에 따라 근거리 공유가 되기도 하니 먼저 한 번 시험해 볼 가치는 있습니다.')}
    if(a.devices==='pc'){p('session',2,'PC에서는 브라우저만 있으면 됩니다.');p('cable',2,'폰과 PC 사이는 케이블이 가장 단순합니다.');p('cloud',1,'폰·PC 모두 같은 계정으로 접근할 수 있습니다.')}
    if(a.size==='small'){p('msg',3,'작은 파일은 이미 쓰는 메신저로 충분합니다.');p('mail',2,'작은 파일은 이메일 첨부로도 됩니다.');p('session',1,'로그인 없이 바로 옮길 수 있습니다.')}
    if(a.size==='medium'){p('session',2,'수십~수백 MB 단위는 세션형 도구나 클라우드가 무난합니다.');p('cloud',2,'업로드 후 링크로 받을 수 있습니다.');p('cable',1,'안정성이 필요하면 케이블입니다.')}
    if(a.size==='large'){p('cable',4,'큰 파일·많은 파일은 케이블이 가장 안정적이고 인터넷을 쓰지 않습니다.');p('cloud',1,'저장 용량이 충분하다면 클라우드도 가능합니다.');p('nearby',2,'근거리 공유는 인터넷 용량을 쓰지 않고 큰 파일에도 빠릅니다(기종 조합이 맞을 때).')}
    if(a.sensitive){p('cable',4,'제3자 서버를 거치지 않아 민감한 자료에 가장 안전한 축에 듭니다.');p('nearby',2,'기기 간 직접 전송이라 서버 보관이 남지 않습니다.');s.session-=2;s.mail-=2;s.msg-=1;w.session=(w.session||[]).concat(['서비스 서버를 임시로 거치는 방식이라 민감 자료에는 신중해야 합니다.'])}
    if(!a.online){p('cable',3,'인터넷이 없어도 됩니다.');p('nearby',2,'근거리 공유는 인터넷 없이도 동작하는 경우가 많습니다.');s.cloud-=3;s.session-=3;s.msg-=3;s.mail-=3}
    if(a.keep){p('cloud',3,'계속 보관하고 다른 기기에서도 열어야 하면 클라우드가 맞습니다.');s.session-=2}
    var names={cable:'USB 케이블',cloud:'클라우드 드라이브',msg:'메신저 나에게 보내기',nearby:'근거리 공유(AirDrop·Quick Share 등)',session:'세션 코드형 웹 도구(OneSync 등)',mail:'이메일 첨부'};
    Object.keys(s).forEach(function(k){add(names[k],(w[k]||[]).join(' '),s[k])});
    r.sort(function(x,y){return y.score-x.score});return r.filter(function(x){return x.score>0}).slice(0,3);
  }
  function archive(a){ // a: {goal:'compat'|'small'|'unix'|'repair'|'secret', recipient:'any'|'tech', split:bool}
    var r=[];
    if(a.goal==='compat')r.push(['ZIP','거의 모든 OS가 기본으로 열 수 있습니다. 받는 사람이 누구든 가장 안전한 선택입니다.']);
    if(a.goal==='small')r.push(['7z','일반적으로 ZIP보다 작게 압축되는 편이지만(내용에 따라 다름) 받는 사람이 7-Zip 등 도구를 가지고 있어야 합니다.'],['tar.xz','유닉스 계열 환경에서 높은 압축률이 필요할 때']);
    if(a.goal==='unix')r.push(['tar.gz 또는 tar.zst','파일 권한·소유자·심볼릭 링크를 보존하려는 리눅스/맥 개발 환경에 맞습니다. ZIP은 이런 속성이 도구마다 다르게 처리될 수 있습니다.']);
    if(a.goal==='repair')r.push(['RAR','복구 레코드(손상 복구 정보)를 넣을 수 있습니다. 다만 압축 쪽은 WinRAR 등 전용 도구가 필요합니다.'],['7z / ZIP + 별도 PAR2','복구 정보를 별도 파일로 두는 방법도 있습니다.']);
    if(a.goal==='secret')r.push(['7z (헤더 암호화)','AES-256으로 파일 이름까지 숨길 수 있는 옵션이 있습니다.'],['ZIP (AES-256)','파일 내용은 암호화되지만 파일 이름 목록은 보일 수 있고, 구형 ZipCrypto는 약합니다. 도구에서 AES를 명시적으로 고르세요.']);
    if(a.split)r.push(['분할 압축','7z·ZIP·RAR 모두 볼륨 분할을 지원합니다. 받는 쪽이 모든 조각을 같은 폴더에 두고 첫 조각을 열어야 합니다.']);
    if(a.recipient==='any'&&a.goal!=='compat')r.push(['(참고) ZIP','받는 사람의 환경을 모르면 호환성이 좋은 ZIP이 여전히 안전한 기본값입니다.']);
    return r;
  }
  var api={transfer:transfer,archive:archive};
  g.Chooser=api;if(typeof module!=='undefined')module.exports=api;
  if(typeof document==='undefined')return;
  var T=g.TK,h=T.h;
  function radios(name,legend,opts,def){
    var fs=h('fieldset',{},[h('legend',{text:legend})]);
    opts.forEach(function(o,i){var id=name+'-'+o[0]+Math.random().toString(36).slice(2,5);
      var inp=h('input',{type:'radio',name:name+Math.random().toString(36).slice(2,5)+'g',id:id,value:o[0]});
      inp._group=name;fs.appendChild(h('label',{'class':'opt','for':id},[inp,o[1]]));
      if(o[0]===def)inp.checked=true});
    // group radios by shared name
    var gname=name+'_'+Math.random().toString(36).slice(2,6);
    [].forEach.call(fs.querySelectorAll('input'),function(i){i.name=gname});
    fs.val=function(){var c=fs.querySelector('input:checked');return c?c.value:null};return fs;
  }
  function mountTransfer(root){
    var dev=radios('dev','기기 조합',[['apple','애플 기기끼리(아이폰↔맥 등)'],['mixed','아이폰↔안드로이드 등 섞여 있음'],['pc','폰↔PC(윈도우/리눅스 포함)']],'mixed');
    var size=radios('size','옮길 양',[['small','작은 파일 몇 개(문서, 사진 몇 장)'],['medium','영상 한두 개·사진 수십 장'],['large','대용량·수백 장·폴더 통째']],'small');
    var sens=h('label',{'class':'opt'},[h('input',{type:'checkbox'}),'민감한 자료입니다(신분증, 계약서 등)']);
    var onl=h('label',{'class':'opt'},[h('input',{type:'checkbox'}),'지금 인터넷이 없거나 쓰고 싶지 않습니다']);
    var keep=h('label',{'class':'opt'},[h('input',{type:'checkbox'}),'옮긴 뒤에도 계속 보관·공유해야 합니다']);
    var out=h('div',{'class':'out','aria-live':'polite'});
    function calc(){var res=transfer({devices:dev.val(),size:size.val(),sensitive:sens.firstChild.checked,online:!onl.firstChild.checked,keep:keep.firstChild.checked});
      out.innerHTML='<p><b>추천 순서</b></p><ol style="margin:0 0 0 18px">'+res.map(function(x){return '<li><b>'+x.name+'</b><br>'+x.why+'</li>'}).join('')+'</ol>'}
    root.appendChild(h('h3',{text:'파일 전송 방법 선택 도우미'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'상황을 고르면 어울리는 방법을 순서대로 보여 줍니다. 서비스별 용량 한도는 위 비교표의 공식 문서에서 확인하세요.'}));
    [dev,size,sens,onl,keep].forEach(function(e){root.appendChild(e);e.addEventListener('change',calc)});
    root.appendChild(out);calc();
  }
  function mountArchive(root){
    var goal=radios('goal','가장 중요한 목표',[['compat','누가 받아도 열려야 함'],['small','파일을 최대한 작게'],['unix','리눅스/맥 권한·링크 보존'],['repair','일부 손상돼도 복구 가능하게'],['secret','암호로 파일 이름까지 숨기기']],'compat');
    var rec=radios('rec','받는 사람',[['any','잘 모르는 일반 사용자'],['tech','개발자·압축 도구를 쓰는 사람']],'any');
    var split=h('label',{'class':'opt'},[h('input',{type:'checkbox'}),'용량 제한 때문에 여러 조각으로 나눠야 합니다']);
    var out=h('div',{'class':'out','aria-live':'polite'});
    function calc(){var res=archive({goal:goal.val(),recipient:rec.val(),split:split.firstChild.checked});
      out.innerHTML=res.map(function(x){return '<p><b>'+x[0]+'</b> — '+x[1]+'</p>'}).join('')}
    root.appendChild(h('h3',{text:'압축 포맷 선택 도우미'}));
    root.appendChild(h('p',{'class':'tool-desc',text:'목표를 고르면 어울리는 포맷과 주의점을 알려 줍니다.'}));
    [goal,rec,split].forEach(function(e){root.appendChild(e);e.addEventListener('change',calc)});root.appendChild(out);calc();
  }
  g.addEventListener('DOMContentLoaded',function(){
    [].forEach.call(document.querySelectorAll('[data-tool="transfer"]'),mountTransfer);
    [].forEach.call(document.querySelectorAll('[data-tool="archive"]'),mountArchive);
  });
})(typeof window!=='undefined'?window:globalThis);
