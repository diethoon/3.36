from pathlib import Path

p = Path("Wayward_MOD_v3.36.html")
raw = p.read_text(encoding="utf-8")

if "function M36MobilePleasureFixed" in raw:
    print("M36_GAUGE_ALREADY_PRESENT")
    raise SystemExit(0)

old_gauge = '''U&&I&&u.jsxs("div",{className:"mb-3 space-y-1.5",children:[u.jsx(t_,{label:"당신",value:I.playerPleasure,color:"bg-blue-500"}),u.jsx(t_,{label:"그녀",value:I.elenaMoaning,color:"bg-pink-500"})]}),K&&(N==null?void 0:N.patronPleasure)!=null&&u.jsxs("div",{className:"mb-3 space-y-1.5",children:[u.jsx(t_,{label:"그 사내",value:N.patronPleasure,color:"bg-violet-500"}),u.jsx(t_,{label:"그녀",value:N.elenaPleasure??0,color:"bg-pink-500"})]}),'''
new_gauge = '''U&&I&&u.jsxs("div",{className:"mb-3 space-y-1.5 m36-mobile-choice-gauge",children:[u.jsx(t_,{label:"당신",value:I.playerPleasure,color:"bg-blue-500"}),u.jsx(t_,{label:"그녀",value:I.elenaMoaning,color:"bg-pink-500"})]}),K&&(N==null?void 0:N.patronPleasure)!=null&&u.jsxs("div",{className:"mb-3 space-y-1.5 m36-mobile-choice-gauge",children:[u.jsx(t_,{label:"그 사내",value:N.patronPleasure,color:"bg-violet-500"}),u.jsx(t_,{label:"그녀",value:N.elenaPleasure??0,color:"bg-pink-500"})]}),'''

old_dialogue = '''function M36MobileDialogueFixed({event:e,wifeName:t}){if(!e||["confrontation","outfit_reaction","back_room_interrupt"].includes(e.type))return null;const o=e.type==="wife_conversation",n=e.type==="sex_scene",r=e.type==="patron_interaction"&&e.customerName?e.customerName+" & "+t:o||n?t:"⚠ 돌발 상황";return u.jsxs("div",{className:"m36-mobile-dialogue-fixed",children:[u.jsx("div",{className:"m36-mobile-dialogue-label",children:o?"[대화] "+t+" <> 당신":"[이벤트] "+r}),u.jsx("div",{className:"m36-mobile-dialogue-box",children:u.jsx("p",{className:"text-sm text-stone-200 leading-relaxed whitespace-pre-wrap break-words",children:e.text})})]})}'''
new_dialogue = '''function M36MobileDialogueFixed({event:e,wifeName:t}){if(!e||["confrontation","outfit_reaction","back_room_interrupt"].includes(e.type))return null;const o=e.type==="wife_conversation",n=e.type==="sex_scene",r=e.type==="patron_interaction"&&e.customerName?e.customerName+" & "+t:o||n?t:"⚠ 돌발 상황";return u.jsxs("div",{className:"m36-mobile-dialogue-fixed",children:[u.jsx("div",{className:"m36-mobile-dialogue-label",children:o?"[대화] "+t+" <> 당신":"[이벤트] "+r}),u.jsx("div",{className:"m36-mobile-dialogue-box",children:u.jsx("p",{className:"text-sm text-stone-200 leading-relaxed whitespace-pre-wrap break-words",children:e.text})})]})}
function M36MobilePleasureFixed({state:e}){const t=e.pendingEvent,o=Ye(e),n=Y(e),r=t?.type==="sex_scene",a=t?.type==="patron_interaction";if(!r&&!a)return null;return r&&o?u.jsxs("div",{className:"m36-mobile-pleasure-fixed",children:[u.jsx(t_,{label:"당신",value:o.playerPleasure,color:"bg-blue-500"}),u.jsx(t_,{label:"그녀",value:o.elenaMoaning,color:"bg-pink-500"})]}):a&&n?.patronPleasure!=null?u.jsxs("div",{className:"m36-mobile-pleasure-fixed",children:[u.jsx(t_,{label:"그 사내",value:n.patronPleasure,color:"bg-violet-500"}),u.jsx(t_,{label:"그녀",value:n.elenaPleasure??0,color:"bg-pink-500"})]}):null}'''

old_aoe = '''u.jsx(M36MobileDialogueFixed,{event:e.pendingEvent,wifeName:d.name}),u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})'''
new_aoe = '''u.jsx(M36MobileDialogueFixed,{event:e.pendingEvent,wifeName:d.name}),u.jsx(M36MobilePleasureFixed,{state:e}),u.jsx("div",{className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",children:u.jsx(HD,{})})'''

assert raw.count(old_gauge) == 1, f"gauge anchor count={raw.count(old_gauge)}"
assert raw.count(old_dialogue) == 1, f"dialogue anchor count={raw.count(old_dialogue)}"
assert raw.count(old_aoe) == 1, f"AOe anchor count={raw.count(old_aoe)}"
assert raw.count("</head>") == 1

raw = raw.replace(old_gauge, new_gauge, 1)
raw = raw.replace(old_dialogue, new_dialogue, 1)
raw = raw.replace(old_aoe, new_aoe, 1)

style = '''<style id="wayward-mobile-pleasure-fixed-v1">
@media(max-width:1023px){
  .mobile-action-scroll .m36-mobile-choice-gauge{display:none !important;}
  .m36-mobile-pleasure-fixed{
    flex:0 0 auto;position:relative;z-index:29;display:grid;gap:.35rem;
    padding:.25rem .45rem .4rem;background:rgb(28 25 23);
    border-bottom:1px solid rgba(68,64,60,.78);
  }
}
@media(min-width:1024px){.m36-mobile-pleasure-fixed{display:none !important;}}
</style>'''
raw = raw.replace("</head>", style + "</head>", 1)
p.write_text(raw, encoding="utf-8")

print("M36_GAUGE_PATCH_APPLIED")
