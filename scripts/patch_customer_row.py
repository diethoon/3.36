from pathlib import Path
import shutil

p=Path("Wayward_MOD_v3.36.html")
CH=65536

def U(s):
    return s.encode("utf-8")

def replace_once(old,new,label):
    tmp=p.with_suffix(".tmp")
    carry=b""
    count=0
    with p.open("rb") as src,tmp.open("wb") as dst:
        while True:
            c=src.read(CH)
            if not c:
                break
            d=carry+c
            safe=max(0,len(d)-(len(old)-1))
            part,carry=d[:safe],d[safe:]
            count += part.count(old)
            dst.write(part.replace(old,new))
        count += carry.count(old)
        dst.write(carry.replace(old,new))
    if count != 1:
        tmp.unlink(missing_ok=True)
        raise SystemExit(f"{label}:{count}")
    shutil.move(tmp,p)

replace_once(
    U('''function M36MobileRoomCustomer({customer:e}){
  const state=re(x=>x.state),ui=nI(),wife=g(state),active=Y(state),attending=(active?.customerId)===e.id;
  return u.jsx(Hc,{bare:!0,placement:"side",interactive:!1,width:400,className:"block",content:u.jsx(_Oe,{customer:e}),children:u.jsxs("div",{onMouseEnter:()=>ui.hover({kind:"customer",id:e.id}),onMouseLeave:()=>ui.hover(null),onClick:()=>ui.toggle({kind:"customer",id:e.id}),className:["group flex flex-col items-start gap-0 px-1.5 py-0.5 rounded border cursor-default",ui.isActive("customer",e.id)?"border-stone-600 bg-stone-800/60":"border-transparent hover:border-stone-700 hover:bg-stone-800/60"].join(" "),children:[
    u.jsxs("div",{className:"flex items-center gap-1.5 min-w-0 w-full",children:[
      u.jsx("span",{className:"font-medium truncate",children:e.name}),
      e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0",children:[e.tab,"골드"]})
    ]}),
    attending&&u.jsx("span",{className:"text-[0.7rem] text-pink-400 leading-tight",children:(wife.name||"엘레나")+"가 응대 중"})
  ]})})
}
'''),
    U('''function M36MobileRoomCustomer({customer:e,interaction:t,wife:o}){
  const ui=nI(),active=(t?.customerId)===e.id,joined=(t?.joinedPatronIds??[]).includes(e.id),crowd=(t?.crowdPatronIds??[]).includes(e.id);
  return u.jsx(Hc,{bare:!0,placement:"side",interactive:!1,width:400,className:"block",content:u.jsx(_Oe,{customer:e}),children:u.jsxs("div",{onMouseEnter:()=>ui.hover({kind:"customer",id:e.id}),onMouseLeave:()=>ui.hover(null),onClick:()=>ui.toggle({kind:"customer",id:e.id}),className:["group flex flex-col items-start gap-0 px-1.5 py-0.5 rounded border cursor-default",ui.isActive("customer",e.id)?"border-stone-600 bg-stone-800/60":"border-transparent hover:border-stone-700 hover:bg-stone-800/60"].join(" "),children:[
    u.jsxs("div",{className:"flex items-center gap-1.5 min-w-0 w-full whitespace-nowrap",children:[
      u.jsx("span",{className:"font-medium truncate",children:e.name}),
      e.order&&e.status!=="arrived"&&u.jsx("span",{className:"text-[0.7rem] text-stone-500 truncate",children:u.koLabel("order",e.order)}),
      e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0",children:[e.tab,"골드"]})
    ]}),
    (active||joined||crowd)&&u.jsx("span",{className:"text-[0.7rem] text-pink-400 leading-tight whitespace-nowrap truncate",children:(o.name||"엘레나")+"가 응대 중"})
  ]})})
}
'''),
    "customer-renderer"
)

replace_once(
    U('''    patrons.map(customer=>canSee?u.jsx(M36MobileRoomCustomer,{customer},customer.id):u.jsxs("span",{className:"text-[0.58rem] text-stone-500 truncate",children:[customer.name]},customer.id)),'''),
    U('''    patrons.map(customer=>canSee?u.jsx(M36MobileRoomCustomer,{customer,interaction:activePatronInteraction,wife},customer.id):u.jsxs("span",{className:"text-[0.58rem] text-stone-500 truncate",children:[customer.name]},customer.id)),'''),
    "customer-call"
)

replace_once(
    U('''function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),rooms=targetRoom?[targetRoom]:Yie(state,wx,{proximity});'''),
    U('''function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),rooms=targetRoom?[targetRoom]:Yie(state,wx,{proximity}),activePatronInteraction=G9(state),wife=g(state);'''),
    "activity-sources"
)

print("PATCH_OK",p.stat().st_size)
