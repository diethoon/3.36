// Source for the compatibility entry; rebuild HTML with build.cjs after host changes.
WML.define({
 id:'wayward-mod-host',name:'Wayward MOD 호환 안내',version:'4.0',game:'2026-10-04',
 description:'통합 MOD HTML의 WML 연결 상태와 중복 기능을 안내합니다. 이 항목을 꺼도 HTML에 포함된 MOD 기능은 제거되지 않습니다.',
 roles:['hotkeys','stats','cheat-editor','theme','music','image-variants'],
 symbols:{
   "waywardModHost": {"raw":{"2026-10-04":"m4WmlHost"},"doc":"통합 MOD HTML의 연결 상태와 설정 진입점. 바닐라에는 없는 호스트 계약.","find":{"all":["openSettings:"],"len":801,"any":["balanceOwner:","baseVersion:","engineBuild:","translation:","keyOwner:","overlaps:"]}}
 },
 setup(api){
  const host=api.fn('waywardModHost')();
  if(host?.version!=='4.0'||host.engineBuild!=='2026-10-04')throw Error('이 항목은 Wayward MOD v4.0 WML HTML용입니다.');
  api.provide(host);
  const render=body=>{
   const h=api.ui.h,s=host.status(),key=s.keyOwner==='wayworks'?'WAYWORKS':s.keyOwner==='kknd-hotkeys'?'WML 단축키':'기존 MOD';
   body.append(h('p',{},'Wayward MOD '+host.version+' · 엔진 '+host.engineBuild+' · 한패 v1.5'),
    h('p',{},'단축키: '+key+' / 밸런스: '+(s.balanceOwner==='balance'?'WML 밸런스':'기존 MOD')),
    h('p',{class:'wml-note'},'이 항목은 연결 안내입니다. 끄더라도 HTML에 포함된 MOD 전체가 비활성화되는 것은 아닙니다.'),
    api.ui.button('기존 MOD 설정 열기',()=>host.openSettings()));
   const overlaps=s.loaded.filter(id=>id!==api.id&&host.overlaps[id]);
   if(overlaps.length)body.append(h('p',{},'함께 켜진 중복 기능'),h('ul',{},...overlaps.map(id=>h('li',{},id+' — '+host.overlaps[id]))));
   if(overlaps.some(id=>!['balance','wayworks','kknd-hotkeys'].includes(id)))body.append(h('p',{class:'wml-note'},'중복 기능은 조합별 확인이 필요합니다. 목록에 연결됐다는 것만으로 모든 동작의 호환을 보장하지 않습니다.'));
   body.append(h('p',{class:'wml-small'},'같은 애드온을 구 모드 매니저와 WML 양쪽에 중복 설치하지 마세요.'));
  };
  api.ui.settings(render);
  api.ui.addButton({label:'MOD',title:'Wayward MOD 연결 상태',onClick:()=>api.ui.window({id:'wayward-mod-host',title:'Wayward MOD 연결 상태',width:480,height:420,render})});
 }
});
