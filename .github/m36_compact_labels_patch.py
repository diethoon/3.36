from pathlib import Path
import re

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

new='''.m36-responsive-reasons{
    display:flex!important;
    flex-wrap:wrap!important;
    align-items:center!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-reasons>span{
    flex:0 0 auto!important;
    white-space:nowrap!important;
    margin:0 2px 0 0!important;
  }
  .m36-responsive-reasons>button{
    flex:0 0 auto!important;
    min-width:0!important;
    box-sizing:border-box!important;
    white-space:nowrap!important;
    padding:6px 6px!important;
    min-height:32px!important;
    line-height:1.1!important;
    font-size:clamp(.68rem,3vw,.8rem)!important;
  }'''

pattern=r'(?s).m36-responsive-reasons{.*?}s*.m36-responsive-reasons>span{.*?}s*.m36-responsive-reasons>button{.*?}'
s2,n=re.subn(pattern,new,s)
if n < 1:
    raise SystemExit("no responsive reason CSS blocks found")
s=s2

for needle in ['label:"부탁"','label:"접대"','label:"골드"','label:"호기심"']:
    if needle not in s:
        raise SystemExit("missing compact label: "+needle)

for m in re.finditer(r'(?s).m36-responsive-reasons{.*?}(?:s*.m36-responsive-reasons>span{.*?})?(?:s*.m36-responsive-reasons>button{.*?})?',s):
    if 'grid-template-columns:' in m.group(0):
        raise SystemExit("reason grid still present")

p.write_text(s,encoding="utf-8")
print("COMPACT_LAYOUT_READY_BLOCKS",n)
