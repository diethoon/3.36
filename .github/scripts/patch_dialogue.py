from pathlib import Path
import re

path = Path("Wayward_MOD_v3.36.html")
text = path.read_text(encoding="utf-8")

old_title = 'u.jsxs("h3",{className:"text-sm font-bold text-amber-400 uppercase tracking-wider mb-1",children:[wt,It&&u.jsxs("span",{className:"text-stone-500 normal-case font-normal ml-2",children:["› ",u.jsx("span",{className:"text-pink-300",children:nt[It]??ko14Conversation(It)})]})]}),'
new_title = 'u.jsxs("h3",{className:"text-sm font-bold text-amber-400 uppercase tracking-wider mb-1 m36-mobile-dialogue-source-title",children:[wt,It&&u.jsxs("span",{className:"text-stone-500 normal-case font-normal ml-2",children:["› ",u.jsx("span",{className:"text-pink-300",children:nt[It]??ko14Conversation(It)})]})]}),'

old_body = 'u.jsx("div",{className:`p-3 rounded-lg border-2 ${Be} bg-stone-800 mb-3`,children:u.jsx("p",{className:"text-sm text-stone-200 leading-relaxed",children:d.text})}),'
new_body = 'u.jsx("div",{className:`p-3 rounded-lg border-2 ${Be} bg-stone-800 mb-3 m36-mobile-dialogue-source-body`,children:u.jsx("p",{className:"text-sm text-stone-200 leading-relaxed",children:d.text})}),'

old_choice = 'u.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[m326CompletionChoices'
new_choice = '''u.jsxs("div",{className:"m36-mobile-dialogue-fixed",children:[
      u.jsx("div",{className:"m36-mobile-dialogue-label",children:ee?`[대화] ${o.name} <> 당신`:`[이벤트] ${wt}`}),
      u.jsx("div",{className:`m36-mobile-dialogue-box ${Be}`,children:u.jsx("p",{className:"text-sm text-stone-200 leading-relaxed whitespace-pre-wrap break-words",children:d.text})})
    ]}),
    u.jsxs("div",{className:"grid grid-cols-1 gap-2",children:[m326CompletionChoices'''

counts = (text.count(old_title), text.count(old_body), text.count(old_choice))
if counts != (1, 1, 1):
    raise SystemExit(f"anchor count mismatch: {counts}")

text = text.replace(old_title, new_title, 1)
text = text.replace(old_body, new_body, 1)
text = text.replace(old_choice, new_choice, 1)

css = '''<style id="wayward-mobile-dialogue-fixed-v1">
@media(max-width:1023px){
  .m36-mobile-dialogue-source-title,
  .m36-mobile-dialogue-source-body{display:none !important;}
  .m36-mobile-dialogue-fixed{
    position:sticky;
    top:0;
    z-index:30;
    display:block;
    margin:-.25rem -.25rem .45rem;
    padding:.3rem .35rem .4rem;
    background:rgb(28 25 23);
    border-bottom:1px solid rgba(68,64,60,.78);
  }
  .m36-mobile-dialogue-label{
    margin-bottom:.25rem;
    color:rgb(245 158 11);
    font-size:.66rem;
    font-weight:700;
    line-height:1.15;
    letter-spacing:.01em;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .m36-mobile-dialogue-box{
    padding:.55rem .65rem;
    border-width:1px;
    border-radius:.45rem;
    background:rgba(41,37,36,.96);
  }
}
@media(min-width:1024px){
  .m36-mobile-dialogue-fixed{display:none !important;}
}
</style>'''

if 'id="wayward-mobile-dialogue-fixed-v1"' in text:
    raise SystemExit("CSS already present")
if text.count("</head>") != 1:
    raise SystemExit("head anchor mismatch")
text = text.replace("</head>", css + "\n</head>", 1)

path.write_text(text, encoding="utf-8")
print("patched", text.count("m36-mobile-dialogue-fixed"))