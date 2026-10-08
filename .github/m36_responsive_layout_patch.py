from pathlib import Path
p=Path("Wayward_MOD_v3.36.html")
s=p.read_text(encoding="utf-8")
old=r'''<style id="m36-responsive-ui-20261009">
@media (max-width:700px){
  .m36-responsive-request{
    display:flex!important;
    flex-wrap:nowrap!important;
    align-items:stretch!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-request>button{
    flex:1 1 0!important;
    min-width:0!important;
    white-space:nowrap!important;
    padding:7px 5px!important;
    min-height:34px!important;
    line-height:1.1!important;
    font-size:clamp(.72rem,3.3vw,.84rem)!important;
  }
  .m36-responsive-reasons{
    display:flex!important;
    flex-wrap:wrap!important;
    align-items:center!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-reasons>span{
    flex:0 0 auto!important;
    margin-right:2px!important;
    white-space:nowrap!important;
  }
  .m36-responsive-reasons>button{
    flex:0 1 auto!important;
    min-width:0!important;
    white-space:nowrap!important;
    padding:6px 8px!important;
    min-height:32px!important;
    line-height:1.1!important;
    font-size:clamp(.68rem,3vw,.8rem)!important;
  }
}
</style>'''
new=r'''<style id="m36-responsive-ui-20261009">
@media (max-width:700px){
  .m36-responsive-request{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    align-items:stretch!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-request>button{
    width:100%!important;
    min-width:0!important;
    box-sizing:border-box!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:clip!important;
    padding:7px 4px!important;
    min-height:34px!important;
    line-height:1.1!important;
    font-size:clamp(.72rem,3.3vw,.84rem)!important;
  }
  .m36-responsive-reasons{
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
  }
}
</style>'''
if old not in s:
    raise SystemExit("responsive CSS block not found")
s=s.replace(old,new,1)
p.write_text(s,encoding="utf-8")
print("RESPONSIVE_LAYOUT_PATCH_APPLIED")
