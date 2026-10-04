#!/usr/bin/env python3
from pathlib import Path
import os
import re
import subprocess

SRC = Path("Wayward_MOD_v3.36.html")
TMP = SRC.with_suffix(".mobileui.tmp")
CHUNK = 64 * 1024

components = b"""function M36MobileStatusLabel(location){
  return ({
    taproom:"홀",
    back_room:"뒷방",
    upstairs_hall:"객실 1",
    upstairs_room_2:"객실 2",
    bedroom:"침실",
    elena_room:"침실",
    bathhouse:"목욕탕",
    bathroom:"욕실",
    kitchen:"주방"
  })[location]??location??"알 수 없음";
}
function M36MobilePersistentStatus(){
  const state=re(x=>x.state),dispatch=re(x=>x.dispatch),wife=g(state),playerLoc=be(state),[open,setOpen]=Z.useState(!1);
  const energy=Math.round(state.player?.stats?.energy??0);
  const wifeEnergy=Math.round(wife.stats?.energy??0),wifeMood=Math.round(wife.stats?.mood??0),wifeTrust=Math.round(wife.relationship?.trust??0);
  const wifeTask=jF(wife,state);
  const nav=action=>{dispatch(action);setOpen(!1);};
  return u.jsxs("div",{className:"m36-mobile-status",children:[
    u.jsx("button",{type:"button",onClick:()=>setOpen(v=>!v),className:"m36-mobile-status-row",style:{width:"100%",background:"transparent",border:0,padding:0,textAlign:"left"},children:[
      u.jsx("span",{className:"m36-mobile-status-label",children:"현재 위치"}),
      u.jsx("span",{className:"m36-mobile-status-value",children:M36MobileStatusLabel(playerLoc)}),
      u.jsx("span",{className:"m36-mobile-status-meta",children:open?"▾":"▸"})
    ]}),
    u.jsxs("div",{className:"m36-mobile-status-row",children:[
      u.jsx("span",{className:"m36-mobile-status-label",children:"당신"}),
      u.jsx("span",{className:"m36-mobile-status-value",children:state.phase==="prep"?"준비 중":"진행 중"}),
      u.jsxs("span",{className:"m36-mobile-status-meta",children:["기력 ",energy]})
    ]}),
    u.jsxs("div",{className:"m36-mobile-status-row",children:[
      u.jsx("span",{className:"m36-mobile-status-label",children:wife.name||"피파"}),
      u.jsx("span",{className:"m36-mobile-status-value",children:wifeTask}),
      u.jsxs("span",{className:"m36-mobile-status-meta",children:["기력 ",wifeEnergy," · 기분 ",wifeMood," · 신뢰 ",wifeTrust]})
    ]}),
    open&&u.jsxs("div",{className:"m36-mobile-nav-grid",children:[
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"return_to_taproom"}),children:"홀"}),
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"go_to_back_room"}),children:"뒷방"}),
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"go_to_bedroom"}),children:"침실"}),
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"go_upstairs"}),children:"객실 1"}),
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"go_upstairs",room:"upstairs_room_2"}),children:"객실 2"}),
      u.jsx("button",{type:"button",className:"m36-mobile-nav-button",onClick:()=>nav({type:"enter_bathhouse"}),children:"목욕탕"})
    ]})
  ]});
}
function M36MobileCurrentActivity(){
  const state=re(x=>x.state),wife=g(state),playerLoc=be(state),task=jF(wife,state);
  const text=state.phase==="prep"?wife.name+"은(는) 영업 준비를 돕고 있습니다.":wife.name+"은(는) "+task+".";
  const meta="현재 위치: "+M36MobileStatusLabel(playerLoc)+" · "+task;
  return u.jsxs("section",{className:"m36-mobile-current-activity",children:[
    u.jsx("div",{className:"m36-mobile-current-activity-title",children:"현재 활동"}),
    u.jsx("div",{className:"m36-mobile-current-activity-text",children:text}),
    u.jsx("div",{className:"m36-mobile-current-activity-meta",children:meta})
  ]});
}
"""

css = b"""<style id="wayward-mobile-ui-v2">
@media (max-width:1023px) {
  .m36-mobile-status { flex:0 0 auto; padding:.2rem .25rem; border-bottom:1px solid rgba(68,64,60,.72); }
  .m36-mobile-status-row { display:flex; align-items:baseline; gap:.4rem; min-width:0; line-height:1.15; }
  .m36-mobile-status-label { flex:0 0 auto; color:rgb(168 162 158); font-size:.66rem; white-space:nowrap; }
  .m36-mobile-status-value { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgb(231 229 228); font-size:.66rem; }
  .m36-mobile-status-meta { margin-left:auto; color:rgb(120 113 108); font-size:.58rem; white-space:nowrap; }
  .m36-mobile-nav-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.3rem; margin-top:.45rem; }
  .m36-mobile-nav-button { min-height:32px; padding:.25rem .35rem; border:1px solid rgb(68 64 60); border-radius:.3rem; background:rgb(28 25 23); color:rgb(214 211 209); font-size:.68rem; text-align:left; }
  .m36-mobile-current-activity { flex:0 0 auto; margin:.25rem .25rem .35rem; padding:.35rem .45rem; border:1px solid rgba(120,53,15,.55); border-radius:.3rem; background:rgba(69,26,3,.20); }
  .m36-mobile-current-activity-title { color:rgb(251 191 36); font-size:.62rem; font-weight:700; }
  .m36-mobile-current-activity-text { margin-top:.12rem; color:rgb(231 229 228); font-size:.72rem; line-height:1.2; overflow-wrap:anywhere; }
  .m36-mobile-current-activity-meta { margin-top:.1rem; color:rgb(120 113 108); font-size:.58rem; }
}
</style>
"""

def count_stream(needle: bytes) -> int:
    count = 0
    carry = b""
    keep = max(0, len(needle) - 1)
    with SRC.open("rb") as f:
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            data = carry + chunk
            count += data.count(needle)
            carry = data[-keep:] if keep else b""
    return count

def patch_streaming(replacements):
    max_len = max(len(old) for old, _ in replacements)
    carry = b""
    with SRC.open("rb") as src, TMP.open("wb") as dst:
        while True:
            chunk = src.read(CHUNK)
            if not chunk:
                break
            data = carry + chunk
            safe = max(0, len(data) - max_len + 1)
            emit = data[:safe]
            carry = data[safe:]
            for old, new in replacements:
                emit = emit.replace(old, new)
            dst.write(emit)
        emit = carry
        for old, new in replacements:
            emit = emit.replace(old, new)
        dst.write(emit)
    os.replace(TMP, SRC)

def extract_scripts():
    out = Path("/tmp/m36-inline")
    out.mkdir(parents=True, exist_ok=True)
    for p in out.glob("*.js"):
        p.unlink()
    files = []
    buf = b""
    in_script = False
    current = None
    idx = 0
    with SRC.open("rb") as f:
        while True:
            chunk = f.read(CHUNK)
            eof = not chunk
            buf += chunk
            while True:
                if not in_script:
                    a = buf.find(b"<script")
                    if a < 0:
                        if eof:
                            buf = b""
                        else:
                            buf = buf[-8192:]
                        break
                    b = buf.find(b">", a + 7)
                    if b < 0:
                        buf = buf[a:]
                        break
                    idx += 1
                    current = out / f"{idx}.js"
                    current.write_bytes(b"")
                    files.append(current)
                    buf = buf[b + 1:]
                    in_script = True
                else:
                    a = buf.find(b"</script>")
                    if a < 0:
                        if eof:
                            if current is not None:
                                with current.open("ab") as cf:
                                    cf.write(buf)
                            buf = b""
                            in_script = False
                        else:
                            keep = len(b"</script>") - 1
                            if current is not None and len(buf) > keep:
                                with current.open("ab") as cf:
                                    cf.write(buf[:-keep])
                            buf = buf[-keep:]
                        break
                    if current is not None:
                        with current.open("ab") as cf:
                            cf.write(buf[:a])
                    buf = buf[a + len(b"</script>"):]
                    current = None
                    in_script = False
            if eof:
                break
    return files

def main():
    if count_stream(b"wayward-mobile-ui-v2") != 0:
        raise SystemExit("MARKER_ALREADY_PRESENT")

    replacements = [
        (b"function AOe(){", components + b"function AOe(){"),
        (
            b"</head>",
            css + b"</head>",
        ),
        (
            b'u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})',
            b'u.jsx(M36MobilePersistentStatus,{}),u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})',
        ),
        (
            b'!y&&u.jsx("div",{className:"shrink-0 border-b border-stone-700",children:u.jsx(rI,{compact:!0})}),',
            b'!y&&u.jsx("div",{className:"shrink-0 border-b border-stone-700",children:u.jsx(rI,{compact:!0})}),u.jsx(M36MobileCurrentActivity,{}),',
        ),
    ]

    for old, _ in replacements:
        expected = 1
        actual = count_stream(old)
        if actual != expected:
            raise SystemExit(f"TARGET_COUNT_MISMATCH {actual} != {expected}: {old[:120]!r}")

    patch_streaming(replacements)

    assert count_stream(b"function M36MobilePersistentStatus()") == 1
    assert count_stream(b"function M36MobileCurrentActivity()") == 1
    assert count_stream(b"u.jsx(M36MobilePersistentStatus,{})") == 1
    assert count_stream(b"u.jsx(M36MobileCurrentActivity,{})") == 1
    assert count_stream(b"wayward-mobile-ui-v2") == 1

    scripts = extract_scripts()
    print("INLINE_SCRIPTS", len(scripts))
    for f in scripts:
        subprocess.run(["node", "--check", str(f)], check=True)
    print("NODE_CHECK=PASS")

if __name__ == "__main__":
    main()
