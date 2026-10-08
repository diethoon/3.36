from pathlib import Path

p=Path("Wayward_MOD_v3.36.html")
s=p.read_text(encoding="utf-8")

for a,b in {
    'label:"부탁하기"':'label:"부탁"',
    'label:"지배적"':'label:"지배"',
    'label:"기만적"':'label:"기만"',
    'label:"주인으로서 접대"':'label:"접대"',
    'label:"골드를 위해"':'label:"골드"',
    'label:"그녀의 호기심"':'label:"호기심"',
}.items():
    s=s.replace(a,b)

needle=".m36-responsive-reasons{"
pos=0
blocks=0
while True:
    i=s.find(needle,pos)
    if i < 0:
        break
    end=s.find("</style>",i)
    if end < 0:
        raise SystemExit("responsive reason style block is unterminated")
    block=s[i:end]
    block=block.replace("display:grid!important;","display:flex!important;")
    block=block.replace("grid-template-columns:repeat(2,minmax(0,1fr))!important;","")
    block=block.replace("grid-column:1 / -1!important;","")
    block=block.replace("width:100%!important;","")
    block=block.replace("overflow:hidden!important;","")
    block=block.replace("text-overflow:clip!important;","")
    block=block.replace("align-items:stretch!important;","align-items:center!important;")
    block=block.replace("margin:0 0 1px 0!important;","margin:0 2px 0 0!important;")
    block=block.replace(
        "padding:6px 6px!important;\n    min-height:32px!important;",
        "padding:6px 6px!important;\n    min-height:32px!important;"
    )
    block=block.replace(
        ".m36-responsive-reasons>button{\n    min-width:0!important;",
        ".m36-responsive-reasons>button{\n    flex:0 0 auto!important;\n    min-width:0!important;"
    )
    s=s[:i]+block+s[end:]
    pos=i+len(block)
    blocks+=1

if blocks < 1:
    raise SystemExit("no responsive reason style block found")

for needle in ['label:"부탁"','label:"접대"','label:"골드"','label:"호기심"']:
    if needle not in s:
        raise SystemExit("missing compact label: "+needle)

if "grid-template-columns:repeat(2,minmax(0,1fr))!important;" in s:
    raise SystemExit("reason grid declaration still present")

p.write_text(s,encoding="utf-8")
print("COMPACT_LAYOUT_READY_BLOCKS",blocks)
