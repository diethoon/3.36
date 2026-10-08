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

old='''  .m36-responsive-reasons{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    align-items:stretch!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-reasons>span{
    grid-column:1 / -1!important;
    white-space:nowrap!important;
    margin:0 0 1px 0!important;
  }
  .m36-responsive-reasons>button{
    width:100%!important;
    min-width:0!important;
    box-sizing:border-box!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:clip!important;
    padding:6px 6px!important;
    min-height:32px!important;
    line-height:1.1!important;
    font-size:clamp(.68rem,3vw,.8rem)!important;
  }'''
new='''  .m36-responsive-reasons{
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
if old not in s:
    raise SystemExit("target reason grid CSS not found")
s=s.replace(old,new,1)

for needle in ['label:"부탁"','label:"접대"','label:"골드"','label:"호기심"']:
    if needle not in s:
        raise SystemExit("missing compact label: "+needle)
if 'grid-template-columns:repeat(2,minmax(0,1fr))' in s:
    raise SystemExit("reason grid still present")

p.write_text(s,encoding="utf-8")
print("COMPACT_LAYOUT_READY")
