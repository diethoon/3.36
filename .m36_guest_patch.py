from pathlib import Path
import hashlib, re, subprocess, sys

ROOT=Path(".")
p=ROOT/"Wayward_MOD_v3.36.html"
d=p.read_bytes()

old_w=b'''u.jsxs("div",{className:"m36-mobile-store-status-line",children:[
      u.jsx("span",{className:"m36-mobile-store-label",children:gs(wifeLoc).replace(/^the /,"")}),
      u.jsx("span",{className:"m36-mobile-store-value",children:wifeRoomCount})
    ]})'''
assert d.count(old_w)==1, d.count(old_w)
assert d.count(b"wifeLoc!==playerLoc")==0
d=d.replace(old_w,b"wifeLoc!==playerLoc&&"+old_w,1)

start=d.find(b"function M36MobileRoomCustomer")
end=d.find(b"function M36MobileRoomActivity",start)
assert start>=0 and end>start

new_fn='''function M36MobileRoomCustomer({customer:e,interaction:t,wife:o}){
  const ui=nI(),dispatch=re(d=>d.dispatch),active=(t?.customerId)===e.id,joined=(t?.joinedPatronIds??[]).includes(e.id),crowd=(t?.crowdPatronIds??[]).includes(e.id),canAct=!active&&!joined&&!crowd;
  return u.jsx(Hc,{bare:!0,placement:"side",interactive:!1,width:400,className:"block",content:u.jsx(_Oe,{customer:e}),children:u.jsxs("div",{onMouseEnter:()=>ui.hover({kind:"customer",id:e.id}),onMouseLeave:()=>ui.hover(null),onClick:()=>ui.toggle({kind:"customer",id:e.id}),className:["group flex flex-col items-start gap-0 px-1.5 py-0.5 rounded border cursor-default",ui.isActive("customer",e.id)?"border-stone-600 bg-stone-800/60":"border-transparent hover:border-stone-700 hover:bg-stone-800/60"].join(" "),children:[
  u.jsxs("div",{className:"flex items-center gap-1.5 min-w-0 w-full whitespace-nowrap",children:[
    u.jsx("span",{className:"m36-mobile-room-customer-name font-medium truncate",style:{fontSize:".7rem",lineHeight:"1"},children:e.name}),
    e.order&&e.status!=="arrived"&&u.jsx("span",{className:"text-[0.7rem] text-stone-500 truncate",children:u.koLabel("order",e.order)}),
    e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0",children:[e.tab,"골드"]})
  ]}),
  (active||joined||crowd)&&u.jsx("span",{className:"m36-mobile-room-response text-[0.7rem] text-pink-400 leading-tight whitespace-nowrap",children:(o.name||"엘레나")+"가 응대 중"}),
  canAct&&e.status==="arrived"&&u.jsx(E1,{compact:!0,label:"인사하기",onClick:()=>dispatch({type:"greet",customerId:e.id})}),
  canAct&&(e.status==="greeted"||e.status==="wants_more")&&u.jsx(E1,{compact:!0,label:"주문받기",onClick:()=>dispatch({type:"take_order",customerId:e.id})}),
  canAct&&e.status==="ordered"&&u.jsx(c3e,{compact:!0,customer:e,onServe:()=>dispatch({type:"serve",customerId:e.id}),onApologize:()=>dispatch({type:"apologize_out_of_stock",customerId:e.id})})
]})})
}
'''.encode()
d=d[:start]+new_fn+d[end:]

stack=b'.m36-mobile-room-line > .group ~ .group{flex:0 0 100% !important;max-width:100% !important;}\n'
marker=b'.m36-mobile-room-line > .group{flex:1 1 auto !important;'
assert d.count(stack)==0 and d.count(marker)>=1
d=d.replace(marker,stack+marker,1)
p.write_bytes(d)

# Static syntax check.
target=d.find(b"function M36MobileRoomCustomer")
scan=0
while True:
    s=d.find(b"<script",scan)
    if s<0: raise SystemExit("script start not found")
    gt=d.find(b">",s)
    e=d.find(b"</script>",gt+1)
    if gt<target<e:
        Path("/tmp/m36-main.js").write_bytes(d[gt+1:e])
        break
    scan=e+9
r=subprocess.run(["node","--check","/tmp/m36-main.js"],capture_output=True,text=True)
if r.returncode:
    print(r.stderr)
    raise SystemExit(r.returncode)

# Update forensic document without duplicating the section.
doc=ROOT/"idea/GPT_RUNTIME_FORENSIC_FALLBACK.md"
s=doc.read_text(encoding="utf-8")
marker="### 28. 2026-10-08 M36 손님 액션/행 분리 패치 성공 경로"
if marker not in s:
    s += """
### 28. 2026-10-08 M36 손님 액션/행 분리 패치 성공 경로

19MB급 HTML은 ChatGPT context에 적재하지 않고 Vercel/Git runner filesystem에서 targeted patch한다.

    M36MobileRoomCustomer에 기존 greet/take_order/serve/apologize dispatch 복원
    → 고객별 full-width row
    → Elena 위치는 wifeLoc!==playerLoc 조건 유지
    → containing script node --check
    → diff --check
    → temporary patch script 제거
    → final git commit/push

주의:
    - action semantics를 새 로직으로 대체하지 않는다.
    - 대형 HTML 전체를 모델 context에 출력하지 않는다.
"""
    doc.write_text(s,encoding="utf-8")

# Final working-tree checks.
assert d.count(b"wifeLoc!==playerLoc")==1
for q in (
    'label:"인사하기"'.encode(),
    'label:"주문받기"'.encode(),
    'type:"greet",customerId:e.id'.encode(),
    'type:"take_order",customerId:e.id'.encode(),
    'type:"serve",customerId:e.id'.encode(),
    'type:"apologize_out_of_stock",customerId:e.id'.encode(),
    stack,
):
    assert d.count(q)>=1, q

# Commit final state and remove this script before commit.
subprocess.run(["git","config","user.name","vercel-build"],check=True)
subprocess.run(["git","config","user.email","vercel-build@users.noreply.github.com"],check=True)
subprocess.run(["git","rm","-f",".m36_guest_patch.py"],check=False)
subprocess.run(["git","add","Wayward_MOD_v3.36.html","idea/GPT_RUNTIME_FORENSIC_FALLBACK.md"],check=True)
subprocess.run(["git","commit","-m","fix(mobile): restore guest actions and stack room rows"],check=True)
res=subprocess.run(["git","push","origin","HEAD:mobile-migration-v1"],capture_output=True,text=True)
if res.returncode:
    print(res.stdout)
    print(res.stderr)
    raise SystemExit(res.returncode)
print("M36_GUEST_VERCEL_GIT_PUSH_PASS")
print("SIZE",len(d))
print("SHA256",hashlib.sha256(d).hexdigest())
