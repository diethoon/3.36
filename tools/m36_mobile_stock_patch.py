#!/usr/bin/env python3
from pathlib import Path
import os, subprocess

SRC=Path("Wayward_MOD_v3.36.html")
TMP=SRC.with_suffix(".stock.tmp")
CHUNK=64*1024

component="""function M36MobileStockStatus(){
  const state=re(x=>x.state),dispatch=re(x=>x.dispatch);
  if(state.phase!=="prep") return null;
  const needs=x8(state),prices=Ah(state),priceInfo=l5(state),want=priceInfo.want;
  const totalNeed=dr.reduce((sum,key)=>sum+(needs[key]??0),0);
  if(totalNeed<=0) return null;
  const cost=Ki(want,prices),gold=state.economy?.gold??0;
  const canBuySome=Rw(state,want,prices,gold);
  const canBuy=Ki(canBuySome,prices);
  const shortOnGold=gold<cost;
  return u.jsxs("section",{className:"m36-mobile-stock",children:[
    u.jsxs("div",{className:"m36-mobile-stock-head",children:[
      u.jsx("span",{className:"m36-mobile-stock-title",children:"물자"}),
      u.jsx("span",{className:"m36-mobile-stock-meta",children:shortOnGold?"돈 부족 · 가능한 만큼":cost+"골드 필요"})
    ]}),
    u.jsxs("div",{className:"m36-mobile-stock-list",children:[
      u.jsxs("span",{children:["식재료 ",state.supplies?.food??0," / ",state.supplyTargets?.food??Ew.food]}),
      u.jsxs("span",{children:["맥주 ",state.supplies?.beer??0," / ",state.supplyTargets?.beer??Ew.beer]}),
      u.jsxs("span",{children:["와인 ",state.supplies?.wine??0," / ",state.supplyTargets?.wine??Ew.wine]})
    ]}),
    u.jsxs("button",{type:"button",onClick:()=>dispatch({type:"stock_up"}),className:"m36-mobile-stock-button",children:[
      u.jsx("span",{children:"물자 채우기"}),
      u.jsx("span",{className:"m36-mobile-stock-button-meta",children:shortOnGold?("가능 "+canBuy+"골드"):("약 "+cost+"골드 · 1시간")})
    ]})
  ]});
}
"""

css="""<style id="wayward-mobile-stock-v1">
@media(max-width:1023px){
  .m36-mobile-stock{flex:0 0 auto;padding:.2rem .25rem .3rem;border-bottom:1px solid rgba(68,64,60,.72)}
  .m36-mobile-stock-head{display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-bottom:.2rem}
  .m36-mobile-stock-title{color:rgb(245 158 11);font-size:.64rem;font-weight:700;white-space:nowrap}
  .m36-mobile-stock-meta{color:rgb(168 162 158);font-size:.56rem;white-space:nowrap}
  .m36-mobile-stock-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.2rem;color:rgb(168 162 158);font-size:.55rem;line-height:1.15}
  .m36-mobile-stock-list span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .m36-mobile-stock-button{width:100%;min-height:32px;margin-top:.25rem;padding:.25rem .45rem;display:flex;align-items:center;justify-content:space-between;gap:.3rem;border:1px solid rgb(120 53 15);border-radius:.3rem;background:rgb(124 45 18);color:rgb(255 247 237);font-size:.66rem}
  .m36-mobile-stock-button-meta{color:rgb(254 215 170);font-size:.55rem;white-space:nowrap}
}
</style>
""".encode("utf-8")
component=component.encode("utf-8")

def count_stream(needle:bytes)->int:
  count=0;carry=b"";keep=max(0,len(needle)-1)
  with SRC.open("rb") as f:
    while True:
      c=f.read(CHUNK)
      if not c: break
      d=carry+c
      count+=d.count(needle)
      carry=d[-keep:] if keep else b""
  return count

def patch_stream(repls):
  maxlen=max(len(a) for a,_ in repls)
  carry=b""
  with SRC.open("rb") as src,TMP.open("wb") as dst:
    while True:
      c=src.read(CHUNK)
      if not c: break
      d=carry+c
      safe=max(0,len(d)-maxlen+1)
      out=d[:safe];carry=d[safe:]
      for a,b in repls: out=out.replace(a,b)
      dst.write(out)
    out=carry
    for a,b in repls: out=out.replace(a,b)
    dst.write(out)
  os.replace(TMP,SRC)

def extract():
  out=Path("/tmp/m36-stock-inline");out.mkdir(exist_ok=True)
  for f in out.glob("*.js"): f.unlink()
  files=[];buf=b"";inside=False;cur=None;idx=0
  with SRC.open("rb") as f:
    while True:
      c=f.read(CHUNK);eof=not c;buf+=c
      while True:
        if not inside:
          a=buf.find(b"<script")
          if a<0:
            if eof: buf=b""
            else: buf=buf[-8192:]
            break
          b=buf.find(b">",a+7)
          if b<0: buf=buf[a:];break
          idx+=1;cur=out/f"{idx}.js";cur.write_bytes(b"");files.append(cur)
          buf=buf[b+1:];inside=True
        else:
          a=buf.find(b"</script>")
          if a<0:
            if eof:
              cur.open("ab").write(buf);buf=b"";inside=False
            else:
              keep=len(b"</script>")-1
              if len(buf)>keep: cur.open("ab").write(buf[:-keep])
              buf=buf[-keep:]
            break
          with cur.open("ab") as cf: cf.write(buf[:a])
          buf=buf[a+9:];cur=None;inside=False
      if eof: break
  return files

if count_stream(b"wayward-mobile-stock-v1")!=0:
  raise SystemExit("STOCK_MARKER_ALREADY_PRESENT")

repls=[
  (b"function AOe(){",component+b"function AOe(){"),
  (b"</head>",css+b"</head>"),
  (
    b'u.jsx(M36MobilePersistentStatus,{}),u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})',
    b'u.jsx(M36MobilePersistentStatus,{}),u.jsx(M36MobileStockStatus,{}),u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})'
  )
]
for old,_ in repls:
  if count_stream(old)!=1:
    raise SystemExit("TARGET_COUNT_MISMATCH")

patch_stream(repls)

for needle in [
  b"function M36MobileStockStatus()",
  b"u.jsx(M36MobileStockStatus,{})",
  b"wayward-mobile-stock-v1"
]:
  if count_stream(needle)!=1: raise SystemExit("PATCH_VALIDATION_FAIL")

files=extract()
for f in files:
  subprocess.run(["node","--check",str(f)],check=True)
print("INLINE_SCRIPTS",len(files))
print("NODE_CHECK=PASS")
