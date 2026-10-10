from pathlib import Path
import sys

path = Path("Wayward_MOD_v3.36.html")
text = path.read_text(encoding="utf-8")
original = text

if 'const M36_SAVE_SHARE_API=' in text:
    print("PATCH_ALREADY_PRESENT")
    raise SystemExit(0)

def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 anchor, found {count}")
    text = text.replace(old, new, 1)

helper = r'''const M36_SAVE_SHARE_API="https://wayward-save-share.trpgengine.workers.dev";
const M36_SAVE_TITLE_KEY="wayward-save-title-slot-";
function m36CloudSavedTitle(slot){
  try{return String(localStorage.getItem(M36_SAVE_TITLE_KEY+slot)||"").trim().slice(0,80);}
  catch{return"";}
}
'''
replace_once(
    "const kx=6;function fb({mode:e,onClose:t,onDone:o})",
    helper + "const kx=6;function fb({mode:e,onClose:t,onDone:o})",
    "insert share constants",
)
replace_once(
    "[E,R]=Z.useState(()=>m33SavePage()),B=Z.useMemo",
    '[E,R]=Z.useState(()=>m33SavePage()),[shareCode,setShareCode]=Z.useState(""),[shareNotice,setShareNotice]=Z.useState(""),[sharingSlot,setSharingSlot]=Z.useState(null),B=Z.useMemo',
    "add share modal state",
)
replace_once(
    'J.map(O=>u.jsx(EOe,{meta:O,mode:e,confirmDelete:w===O.slot,confirmOverwrite:x===O.slot,onClick:()=>A(O),onDelete:()=>q(O.slot)},O.slot))',
    'J.map(O=>u.jsx(EOe,{meta:O,mode:e,confirmDelete:w===O.slot,confirmOverwrite:x===O.slot,onClick:()=>A(O),onDelete:()=>q(O.slot),onShare:()=>shareSlot(O.slot),onRename:()=>renameSlot(O.slot),sharing:sharingSlot===O.slot},O.slot))',
    "wire per-slot buttons",
)
replace_once(
    'q=O=>{if(w!==O){k(O);return}a(O),k(null),b(ie=>ie+1)};Z.useEffect(()=>m33RememberPage(E),[E]);',
    r'''q=O=>{if(w!==O){k(O);return}a(O);try{localStorage.removeItem(M36_SAVE_TITLE_KEY+O)}catch{};k(null),b(ie=>ie+1)},
renameSlot=O=>{let next;try{next=window.prompt("이 저장 칸의 제목을 입력하세요. 비우면 기본 이름을 사용합니다.",m36CloudSavedTitle(O));}catch{return;}if(next===null)return;next=next.trim().slice(0,80);try{if(next)localStorage.setItem(M36_SAVE_TITLE_KEY+O,next);else localStorage.removeItem(M36_SAVE_TITLE_KEY+O);b(ie=>ie+1);setShareCode("");setShareNotice(next?"슬롯 제목을 저장했습니다.":"기본 슬롯 이름으로 되돌렸습니다.");}catch{setShareNotice("제목을 저장하지 못했습니다.");}},
shareSlot=async O=>{if(sharingSlot!==null)return;setSharingSlot(O);setShareCode("");setShareNotice("");try{const raw=localStorage.getItem(y0(O));if(!raw)throw new Error("비어 있는 저장 칸입니다.");const saved=JSON.parse(raw);if(!saved||!saved.state||typeof saved.state!=="object")throw new Error("정상적인 게임 저장 데이터가 아닙니다.");const meta=sb(O),title=m36CloudSavedTitle(O)||((meta.wifeName||"Wayward")+" · 진행일 "+(meta.day??"?"));const response=await fetch(M36_SAVE_SHARE_API+"/api/share?title="+encodeURIComponent(title),{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:raw});const data=await response.json().catch(()=>({}));if(!response.ok||!data.code)throw new Error(data.message||("공유 코드를 발급하지 못했습니다. HTTP "+response.status));setShareCode(data.code);setShareNotice(title+" · 7일 유효 · 한 번만 가져올 수 있습니다.");try{await navigator.clipboard.writeText(data.code);setShareNotice(title+" · 공유 코드를 복사했습니다. (7일 유효, 1회용)");}catch{}}catch(error){setShareNotice(String(error?.message||error));}finally{setSharingSlot(null);}};Z.useEffect(()=>m33RememberPage(E),[E]);''',
    "add share and rename handlers",
)
replace_once(
    'm&&u.jsx("span",{className:"text-xs text-rose-400",children:m})]})',
    r'''m&&u.jsx("span",{className:"text-xs text-rose-400",children:m}),
shareCode&&u.jsxs("div",{className:"w-full flex flex-wrap items-center gap-2 rounded border border-amber-800 bg-stone-950/60 px-3 py-2",children:[
u.jsx("span",{className:"text-xs text-stone-300",children:"공유 코드"}),
u.jsx("code",{className:"select-all font-mono text-base font-bold tracking-widest text-amber-300",children:shareCode}),
u.jsx("button",{type:"button",onClick:async()=>{try{await navigator.clipboard.writeText(shareCode);setShareNotice("공유 코드를 복사했습니다.");}catch{window.prompt("공유 코드를 복사하세요.",shareCode);}},className:"text-xs px-2 py-1 rounded border border-stone-600 text-stone-200 hover:border-amber-600",children:"코드 복사"})
]}),
shareNotice&&u.jsx("div",{className:"w-full text-xs text-amber-300",role:"status",children:shareNotice})]})''',
    "add share result notice",
)
old_slot = r'''function EOe({meta:e,mode:t,confirmDelete:o,confirmOverwrite:n,onClick:s,onDelete:r}){const a=t==="load"&&(!e.exists||!!e.corrupt);return u.jsxs("div",{className:lI(a),onClick:()=>!a&&s(),children:[u.jsxs("div",{className:"flex-1 min-w-0",children:[u.jsxs("div",{className:"text-sm font-medium text-stone-100",children:["저장 칸 ",e.slot+1,n&&u.jsx("span",{className:"ml-2 text-xs text-rose-300",children:"덮어쓰려면 다시 클릭하세요"})]}),u.jsx(VF,{meta:e})]}),e.exists&&u.jsx("button",{onClick:i=>{i.stopPropagation(),r()},className:["text-xs px-2 py-1 rounded border",o?"bg-rose-800 border-rose-600 text-white":"border-stone-600 text-stone-400 hover:border-rose-700 hover:text-rose-300"].join(" "),children:o?"확인":"삭제"})]})}'''
new_slot = r'''function EOe({meta:e,mode:t,confirmDelete:o,confirmOverwrite:n,onClick:s,onDelete:r,onShare:g,onRename:b,sharing:c}){
const a=t==="load"&&(!e.exists||!!e.corrupt);
return u.jsxs("div",{className:lI(a),onClick:()=>!a&&s(),children:[
u.jsxs("div",{className:"flex-1 min-w-0",children:[
u.jsxs("div",{className:"flex min-w-0 items-center gap-1 text-sm font-medium text-stone-100",children:[
u.jsx("span",{className:"min-w-0 truncate",children:m36CloudSavedTitle(e.slot)||("저장 칸 "+(e.slot+1))}),
n&&u.jsx("span",{className:"ml-1 text-xs text-rose-300",children:"덮어쓰려면 다시 클릭하세요"}),
u.jsx("button",{type:"button",onClick:i=>{i.stopPropagation();b?.();},className:"shrink-0 px-1 text-xs text-stone-400 hover:text-amber-300",title:"저장 칸 제목 바꾸기","aria-label":"저장 칸 "+(e.slot+1)+" 제목 바꾸기",children:"✎"})
]}),
u.jsx(VF,{meta:e})
]}),
e.exists&&u.jsxs("div",{className:"flex shrink-0 items-center gap-1",children:[
u.jsx("button",{type:"button",disabled:!!c||!!e.corrupt,onClick:i=>{i.stopPropagation();g?.();},className:"text-xs px-2 py-1 rounded border border-amber-800 text-amber-300 hover:border-amber-500 disabled:opacity-40",title:"공유 코드 발급","aria-label":"저장 칸 "+(e.slot+1)+" 공유 코드 발급",children:c?"전송…":"공유"}),
u.jsx("button",{onClick:i=>{i.stopPropagation(),r()},className:["text-xs px-2 py-1 rounded border",o?"bg-rose-800 border-rose-600 text-white":"border-stone-600 text-stone-400 hover:border-rose-700 hover:text-rose-300"].join(" "),children:o?"확인":"삭제"})
]})
]});
}'''
replace_once(old_slot, new_slot, "replace save slot card")
settings_import = r'''function M36CloudImportControl({onDone}){
  const importSave=re(i=>i.importSaveFromJSON);
  const [busy,setBusy]=Z.useState(false),[message,setMessage]=Z.useState("");
  const run=async()=>{
    let code;
    try{code=window.prompt("6자리 공유 코드를 입력하세요.");}catch{return;}
    if(code===null)return;
    code=code.trim();
    if(!/^[A-Za-z0-9]{6}$/.test(code)){setMessage("공유 코드는 영문자와 숫자 6자리입니다.");return;}
    if(!window.confirm("공유 세이브를 불러오면 현재 진행 상태가 바뀝니다. 계속할까요?"))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch(M36_SAVE_SHARE_API+"/api/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
      const raw=await response.text();
      if(!response.ok){let data={};try{data=JSON.parse(raw);}catch{}setMessage(data.message||("공유 세이브를 불러오지 못했습니다. HTTP "+response.status));return;}
      let title="Wayward Save";try{title=decodeURIComponent(response.headers.get("X-Share-Title")||title);}catch{}
      if(!importSave(raw)){setMessage("세이브 데이터는 받았지만 현재 게임에서 불러올 수 없습니다. 이 코드는 이미 사용 처리되었습니다.");return;}
      window.alert('"'+title+'" 세이브를 불러왔습니다.');
      onDone?.();
    }catch(error){setMessage("서버에 연결하지 못했습니다: "+String(error?.message||error));}
    finally{setBusy(false);}
  };
  return u.jsxs("section",{className:"border-t border-stone-800 pt-4",children:[
    u.jsx("div",{className:"text-xs text-stone-500 mb-2",children:"세이브 공유"}),
    u.jsx("p",{className:"text-xs text-stone-400 mb-3",children:"다른 기기에서 받은 6자리 공유 코드를 입력해 세이브를 가져옵니다. 코드는 7일간 유효하며 한 번만 사용할 수 있습니다."}),
    u.jsx("button",{type:"button",onClick:run,disabled:busy,className:"w-full text-sm px-3 py-2 rounded border border-amber-800 text-amber-300 hover:bg-stone-800 disabled:opacity-40",children:busy?"세이브 가져오는 중…":"공유 코드로 세이브 가져오기"}),
    message&&u.jsx("p",{className:"text-xs text-amber-300 mt-2",role:"status",children:message})
  ]});
}'''
replace_once("function XF({onClose:e})", settings_import+"function XF({onClose:e})", "insert settings import component")
replace_once(
    't.recordPlayerActions&&u.jsx(bPe,{}),u.jsx(_Pe,{}),n&&u.jsx(yPe,{}),u.jsxs("div",{className:"border-t border-stone-800 pt-4",children:[u.jsx("div",{className:"text-xs text-stone-500 mb-2",children:"위험 영역"})',
    't.recordPlayerActions&&u.jsx(bPe,{}),u.jsx(_Pe,{}),n&&u.jsx(yPe,{}),u.jsx(M36CloudImportControl,{onDone:e}),u.jsxs("div",{className:"border-t border-stone-800 pt-4",children:[u.jsx("div",{className:"text-xs text-stone-500 mb-2",children:"위험 영역"})',
    "add settings import control",
)
checks = [
    text.count('const M36_SAVE_SHARE_API=') == 1,
    text.count('function M36CloudImportControl') == 1,
    text.count('shareSlot=async O=>') == 1,
    'onShare:()=>shareSlot(O.slot)' in text,
    'onRename:()=>renameSlot(O.slot)' in text,
    'u.jsx(M36CloudImportControl,{onDone:e})' in text,
    text.count("</body>") == 1,
    text.endswith(original[-1500:]),
    "function WCe(e,t,o){" in text,
    'importSaveFromJSON:o=>{const n=zCe(o);' in text,
]
if not all(checks):
    raise SystemExit("Static validation failed: "+repr(checks))
path = Path(".github/apply_m36_save_share_patch.py")
path.write_text(script, encoding="utf-8")
print("PATCH_SCRIPT_WRITTEN; checks=" + repr(checks))
