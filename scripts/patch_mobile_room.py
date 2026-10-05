from pathlib import Path
import shutil

P=Path("Wayward_MOD_v3.36.html")
CH=65536

def U(s):
    return s.encode("utf-8")

def replace_once(old,new,label):
    tmp=P.with_suffix(".tmp")
    carry=b""
    count=0
    with P.open("rb") as src, tmp.open("wb") as dst:
        while True:
            chunk=src.read(CH)
            if not chunk:
                break
            data=carry+chunk
            safe=max(0,len(data)-(len(old)-1))
            part,carry=data[:safe],data[safe:]
            count += part.count(old)
            dst.write(part.replace(old,new))
        count += carry.count(old)
        dst.write(carry.replace(old,new))
    if count!=1:
        tmp.unlink(missing_ok=True)
        raise SystemExit(f"{label}: expected 1, got {count}")
    shutil.move(tmp,P)
    print(label)

replace_once(
    U('''    u.jsxs("span",{className:"m36-mobile-room-label",children:[gs(room).replace(/^the /," "),u.jsx("span",{className:"text-stone-600",children:String(patrons.length+visitors.length)})]}),'''),
    U('''    u.jsx("span",{className:"m36-mobile-room-label",children:gs(room).replace(/^the /," ")}),'''),
    "room count"
)

replace_once(
    U('''    patrons.map(customer=>canSee?u.jsx(e3,{customer},customer.id):u.jsxs("span",{className:"text-[0.58rem] text-stone-500 truncate",children:[customer.name]},customer.id)),'''),
    U('''    patrons.map(customer=>canSee?u.jsx(M36MobileRoomCustomer,{customer},customer.id):u.jsxs("span",{className:"text-[0.58rem] text-stone-500 truncate",children:[customer.name]},customer.id)),'''),
    "room customer call"
)

marker=b'function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){'
compact=U(r'''function M36MobileRoomCustomer({customer:e}){
  const state=re(x=>x.state),ui=nI(),wife=g(state),active=Y(state),attending=(active?.customerId)===e.id;
  return u.jsx(Hc,{bare:!0,placement:"side",interactive:!1,width:400,className:"block",content:u.jsx(_Oe,{customer:e}),children:u.jsxs("div",{onMouseEnter:()=>ui.hover({kind:"customer",id:e.id}),onMouseLeave:()=>ui.hover(null),onClick:()=>ui.toggle({kind:"customer",id:e.id}),className:["group flex flex-col items-start gap-0 px-1.5 py-0.5 rounded border cursor-default",ui.isActive("customer",e.id)?"border-stone-600 bg-stone-800/60":"border-transparent hover:border-stone-700 hover:bg-stone-800/60"].join(" "),children:[
    u.jsxs("div",{className:"flex items-center gap-1.5 min-w-0 w-full",children:[
      u.jsx("span",{className:"font-medium truncate",children:e.name}),
      e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0",children:[e.tab,"\uACE8\uB4DC"]})
    ]}),
    attending&&u.jsx("span",{className:"text-[0.7rem] text-pink-400 leading-tight",children:(wife.name||"\uC5D8\uB808\uB098")+"\uAC00 \uC751\uB300 \uC911"})
  ]})})
}
''')
replace_once(marker,compact+marker,"compact customer renderer")
