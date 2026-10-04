from pathlib import Path
import re
import subprocess

PATH=Path("Wayward_MOD_v3.36.html")
CHUNK=64*1024

def replace_once(old: str,new: str):
    ob=old.encode("utf-8");nb=new.encode("utf-8")
    tmp=PATH.with_suffix(".html.tmp")
    keep=max(0,len(ob)-1);carry=b"";count=0
    with PATH.open("rb") as src,tmp.open("wb") as dst:
        while True:
            c=src.read(CHUNK)
            if not c: break
            d=carry+c;cur=0
            while True:
                i=d.find(ob,cur)
                if i<0: break
                dst.write(d[cur:i]);dst.write(nb);count+=1;cur=i+len(ob)
            d=d[cur:]
            if len(d)>keep:
                if keep: dst.write(d[:-keep]);carry=d[-keep:]
                else: dst.write(d);carry=b""
            else: carry=d
        dst.write(carry)
    if count!=1:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"replacement count={count} old={old[:120]!r}")
    tmp.replace(PATH)

OLD_STATUS=r'''function M36MobileStatusPanel(){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),ids=Object.keys(state.characters);
  const rooms=Yie(state,wx,{proximity}),extra=new Set;
  if(!wx.includes(current))extra.add(current);
  for(const id of ids){const room=Hn(state,id);if(room&&!wx.includes(room))extra.add(room)}
  const order=[...extra,...rooms];
  return u.jsx("div",{className:"m36-mobile-status-panel min-w-0",children:order.map(room=>{
    const canSee=room===current||!proximity;
    const women=ids.map((id,index)=>({id,index,wife:state.characters[id]})).filter(row=>row.wife&&Hn(state,row.id)===room);
    const staff=m315StaffAt(state,room);
    const count=women.length+staff.length+(room===current?1:0);
    if(count===0)return null;
    return u.jsxs("div",{className:"mb-2",children:[
      u.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[
        u.jsx("span",{className:`text-[0.62rem] font-semibold uppercase tracking-widest ${room===current?"text-amber-400/90":canSee?"text-stone-500":"text-stone-600"}`,children:gs(room).replace(/^the /,"")}),
        u.jsx("span",{className:"text-[0.62rem] text-stone-600",children:room===current?"현재 위치":String(count)}),
        u.jsx("span",{className:"flex-1 h-px bg-stone-800"})
      ]}),
      room===current&&u.jsx(bOe,{}),
      staff.map(row=>u.jsx(M315StaffCard,{row,canSee},`mod-staff-status:${row.kind}`)),
      women.map(({id,index,wife})=>u.jsx(BD,{id,wife,index,canSee},id))
    ]},room);
  })});
}'''
NEW_STATUS=r'''function M36MobileStatusPanel(){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),ids=Object.keys(state.characters);
  const rooms=Yie(state,wx,{proximity}),extra=new Set;
  if(!wx.includes(current))extra.add(current);
  for(const id of ids){const room=Hn(state,id);if(room&&!wx.includes(room))extra.add(room)}
  const order=[...extra,...rooms];
  return u.jsx("div",{className:"m36-mobile-status-panel min-w-0",children:order.map(room=>{
    const canSee=room===current||!proximity;
    const women=ids.map((id,index)=>({id,index,wife:state.characters[id]})).filter(row=>row.wife&&Hn(state,row.id)===room);
    const staff=m315StaffAt(state,room);
    const count=women.length+staff.length+(room===current?1:0);
    if(count===0)return null;
    return u.jsxs("div",{className:"mb-1.5",children:[
      u.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[
        u.jsx("span",{className:`text-[0.62rem] font-semibold uppercase tracking-widest ${room===current?"text-amber-400/90":canSee?"text-stone-500":"text-stone-600"}`,children:gs(room).replace(/^the /,"")}),
        u.jsx("span",{className:"text-[0.62rem] text-stone-600",children:room===current?"현재 위치":String(count)}),
        u.jsx("span",{className:"flex-1 h-px bg-stone-800"})
      ]}),
      room===current&&u.jsx(bOe,{}),
      staff.map(row=>u.jsx(M315StaffCard,{row,canSee},`mod-staff-status:${row.kind}`)),
      women.map(({id,index,wife})=>u.jsx("div",{className:"m36-mobile-wife-status",children:u.jsx(BD,{id,wife,index,canSee},id)},id)),
      u.jsx(M36MobileRoomActivity,{room,canSee})
    ]},room);
  })});
}'''
OLD_ROOM=r'''function M36MobileRoomActivity(){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),ids=Object.keys(state.characters);
  const rooms=Yie(state,wx,{proximity}),extra=new Set;
  if(!wx.includes(current))extra.add(current);
  for(const id of ids){const room=Hn(state,id);if(room&&!wx.includes(room))extra.add(room)}
  const order=[...extra,...rooms];
  const sections=order.map(room=>{
    const canSee=room===current||!proximity;
    const patrons=state.customers.filter(customer=>Zi(customer)&&ht(state,customer.id)===room);
    const visitors=b7(state,room);
    return {room,canSee,patrons,visitors};
  }).filter(section=>section.patrons.length>0||section.visitors.length>0);
  if(sections.length===0)return null;
  return u.jsxs("section",{className:"m36-mobile-room-activity shrink-0 min-w-0 px-1 pb-1",children:sections.map(({room,canSee,patrons,visitors})=>u.jsxs("div",{className:"mb-1.5",children:[
    u.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[
      u.jsx("span",{className:`text-[0.62rem] font-semibold uppercase tracking-widest ${room===current?"text-amber-400/90":canSee?"text-stone-500":"text-stone-600"}`,children:gs(room).replace(/^the /,"")}),
      u.jsx("span",{className:"text-[0.62rem] text-stone-600",children:String(patrons.length+visitors.length)}),
      u.jsx("span",{className:"flex-1 h-px bg-stone-800"})
    ]}),
    patrons.map(customer=>canSee?u.jsx(e3,{customer},customer.id):u.jsxs("div",{className:"flex items-center gap-1.5 px-1.5 py-0.5 text-[0.7rem] text-stone-500",children:[
      u.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-stone-700 flex-shrink-0","aria-hidden":!0}),
      u.jsx("span",{className:"truncate",children:customer.name})
    ]},customer.id)),
    visitors.map(({of,person})=>u.jsx(wOe,{of,person},person.id))
  ]},room))});
}'''
NEW_ROOM=r'''function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){
  const state=re(d=>d.state),proximity=Rt(d=>d.proximityMode),current=vt(state),rooms=targetRoom?[targetRoom]:Yie(state,wx,{proximity});
  const sections=rooms.map(room=>{
    const canSee=targetCanSee??(room===current||!proximity);
    const patrons=state.customers.filter(customer=>Zi(customer)&&ht(state,customer.id)===room);
    const visitors=b7(state,room);
    return {room,canSee,patrons,visitors};
  }).filter(section=>section.patrons.length>0||section.visitors.length>0);
  if(sections.length===0)return null;
  return u.jsxs("section",{className:"m36-mobile-room-activity shrink-0 min-w-0 px-0 pb-0",children:sections.map(({room,canSee,patrons,visitors})=>u.jsxs("div",{className:"m36-mobile-room-line",children:[
    u.jsxs("span",{className:"m36-mobile-room-label",children:[gs(room).replace(/^the /," "),u.jsx("span",{className:"text-stone-600",children:String(patrons.length+visitors.length)})]}),
    patrons.map(customer=>canSee?u.jsx(e3,{customer},customer.id):u.jsxs("span",{className:"text-[0.58rem] text-stone-500 truncate",children:[customer.name]},customer.id)),
    visitors.map(({of,person})=>u.jsx(wOe,{of,person},person.id))
  ]},room))});
}'''
CSS=r'''<style id="wayward-mobile-cleanup-v7">
@media(max-width:1023px){
.m36-mobile-tabs{flex:0 0 22px !important;height:22px !important;min-height:22px !important;max-height:22px !important}
.m36-mobile-tabs > button{height:22px !important;min-height:0 !important;padding:0 .15rem !important;font-size:.52rem !important;line-height:22px !important;letter-spacing:.03em !important;white-space:nowrap !important}
.m36-mobile-wife-status{min-width:0 !important;margin:0 !important}
.m36-mobile-wife-status > div{margin:.1rem 0 !important;padding:.22rem .25rem !important;gap:.25rem !important}
.m36-mobile-wife-status > div > div > div{gap:.3rem !important;line-height:1.05 !important;min-width:0 !important}
.m36-mobile-wife-status > div > div > div > span{font-size:.58rem !important}
.m36-mobile-wife-status .grid{grid-template-columns:repeat(5,minmax(0,1fr)) !important;gap:.12rem !important;margin-top:.15rem !important}
.m36-mobile-wife-status .grid > span{min-width:0 !important;flex-direction:column !important;align-items:stretch !important;gap:.08rem !important}
.m36-mobile-wife-status .grid > span > span:first-child{width:auto !important;text-align:center !important;font-size:.46rem !important;letter-spacing:0 !important;white-space:nowrap !important;overflow:hidden !important}
.m36-mobile-wife-status .grid > span > span:nth-child(2){width:100% !important;min-width:0 !important;height:3px !important}
.m36-mobile-room-activity{padding:0 !important;margin:.1rem 0 .25rem !important}
.m36-mobile-room-line{display:flex !important;flex-wrap:wrap !important;align-items:center !important;gap:.12rem !important;min-width:0 !important;line-height:1 !important}
.m36-mobile-room-label{display:inline-flex !important;align-items:center !important;gap:.12rem !important;flex:0 0 auto !important;font-size:.54rem !important;line-height:1 !important;color:rgb(168 162 158) !important;white-space:nowrap !important}
.m36-mobile-room-line > .group{flex:1 1 auto !important;min-width:0 !important;display:flex !important;flex-wrap:wrap !important;gap:.15rem !important;padding:.08rem .15rem !important;margin:0 !important;border-color:rgb(68 64 60) !important;line-height:1 !important}
.m36-mobile-room-line > .group > span{font-size:.56rem !important;line-height:1 !important;min-width:0 !important}
.m36-mobile-room-line > .group > span.text-pink-400{flex:0 0 100% !important;margin-left:.55rem !important;font-size:.54rem !important;line-height:1.05 !important}
.m36-mobile-room-line > .group > span.flex{flex-shrink:0 !important;white-space:nowrap !important}
}
</style>'''
replace_once(OLD_STATUS,NEW_STATUS)
replace_once(OLD_ROOM,NEW_ROOM)
replace_once('u.jsx(M36MobileRoomActivity,{})','')
replace_once('</head>',CSS+'\n</head>')
subprocess.run(["git","diff","--check"],check=True)

out=Path("/tmp/wayward-node-check");out.mkdir(exist_ok=True)
for f in out.glob("*.js"): f.unlink()
buf=b"";active=False;idx=0;handle=None;keep=2048
with PATH.open("rb") as f:
    while True:
        c=f.read(CHUNK)
        if not c: break
        buf+=c
        while True:
            if not active:
                m=re.search(br"<script\b[^>]*>",buf,re.I)
                if not m:
                    if len(buf)>keep: buf=buf[-keep:]
                    break
                buf=buf[m.end():];idx+=1;handle=(out/f"s{idx}.js").open("wb");active=True
            else:
                m=re.search(br"</script\s*>",buf,re.I)
                if not m:
                    if len(buf)>keep: handle.write(buf[:-keep]);buf=buf[-keep:]
                    break
                handle.write(buf[:m.start()]);buf=buf[m.end():];handle.close();handle=None;active=False
if active and handle: handle.write(buf);handle.close()
scripts=list(out.glob("*.js"))
if not scripts: raise RuntimeError("NO_SCRIPT_BLOCKS")
for s in scripts:
    result=subprocess.run(["node","--check",str(s)],capture_output=True,text=True)
    if result.returncode:
        print(result.stderr);raise RuntimeError("NODE_CHECK_FAIL "+s.name)
print("NODE_CHECK=PASS",len(scripts))

total=PATH.stat().st_size
if total<19000000: raise RuntimeError("EOF_STREAM_INVALID")
print("EOF_STREAM=PASS",total)
def count_marker(needle):
    count=0;carry=b""
    with PATH.open("rb") as f:
        while True:
            c=f.read(CHUNK)
            if not c: break
            d=carry+c;count+=d.count(needle);carry=d[-max(0,len(needle)-1):]
    return count
for needle,expected in [
    (b'u.jsx(M36MobileRoomActivity,{room,canSee})',1),
    (b'u.jsx(M36MobileRoomActivity,{})',0),
    (b'm36-mobile-wife-status',1),
    (b'wayward-mobile-cleanup-v7',1),
    (b'hideStats:!1,forceVisibility:!0',1),
    (b'height:22px !important',1)]:
    got=count_marker(needle);print("CHECK",needle,got)
    if (expected==0 and got!=0) or (expected>0 and got<expected): raise RuntimeError("MARKER_CHECK_FAIL")
