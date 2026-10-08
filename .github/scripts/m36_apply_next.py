from pathlib import Path
import re
import subprocess
import tempfile

p = Path("Wayward_MOD_v3.36.html")
s = p.read_text(encoding="utf-8", errors="ignore")

if 'assay!=null&&u.jsxs("span"' not in s:
    old = 'const o=re(x=>x.dispatch),n=nI(),s=re(x=>g(x.state)),r=re(x=>Y(x.state)),a=s.taskTarget===e.id'
    new = 'const o=re(x=>x.dispatch),n=nI(),s=re(x=>g(x.state)),r=re(x=>Y(x.state)),assay=re(x=>{const t=x.state.player.magic;return t?Ace(t,x.state.slot,e.id,e.walletGold):null}),a=s.taskTarget===e.id'
    if s.count(old) != 1:
        raise SystemExit("e3 selector anchor mismatch")
    s = s.replace(old, new)

    old = 'e.tab>0&&u.jsxs("span",{className:"text-[0.7rem] text-yellow-600",children:[e.tab,"골드"]}),e.roundsOrdered>0'
    new = 'e.tab>0&&u.jsxs("span",{className:"text-[0.7rem] text-yellow-600 whitespace-nowrap flex-shrink-0",children:[e.tab,"골드"]}),assay!=null&&u.jsxs("span",{className:"text-[0.7rem] text-violet-300 whitespace-nowrap flex-shrink-0",title:"소지금 파악 — 추정 보유 골드",children:["✦ ~",assay,"골드"]}),e.roundsOrdered>0'
    if s.count(old) != 1:
        raise SystemExit("e3 render anchor mismatch")
    s = s.replace(old, new)

    start = s.find('function M36MobileRoomCustomer({customer:e,interaction:t,wife:o}){')
    end = s.find("function ", start + 10)
    if start < 0 or end < 0:
        raise SystemExit("room customer component missing")
    block = s[start:end]

    old = 'const ui=nI(),dispatch=re(d=>d.dispatch),active=(t?.customerId)===e.id'
    new = 'const ui=nI(),dispatch=re(d=>d.dispatch),assay=re(d=>{const t=d.state.player.magic;return t?Ace(t,d.state.slot,e.id,e.walletGold):null}),active=(t?.customerId)===e.id'
    if block.count(old) != 1:
        raise SystemExit("room selector anchor mismatch")
    block = block.replace(old, new, 1)

    old = 'e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0",children:[e.tab,"골드"]})'
    new = 'e.tab>0&&u.jsx("span",{className:"text-[0.7rem] text-yellow-600 flex-shrink-0 whitespace-nowrap",children:[e.tab,"골드"]}),assay!=null&&u.jsx("span",{className:"text-[0.7rem] text-violet-300 flex-shrink-0 whitespace-nowrap",title:"소지금 파악 — 추정 보유 골드",children:["✦ ~",assay,"골드"]})'
    if block.count(old) != 1:
        raise SystemExit("room render anchor mismatch")
    block = block.replace(old, new, 1)
    s = s[:start] + block + s[end:]

addon = '''<style id="m36-mobile-next-ui-v1">
@media(max-width:1023px){
  .m36-mobile-tabs > button{font-size:clamp(.75rem,3.4vw,1rem)!important;line-height:1!important;padding:.15rem .3rem!important}
  .m36-mobile-disabled-choice{display:flex;align-items:center;justify-content:space-between;gap:.5rem;min-width:0;padding:.45rem .55rem;margin:.08rem 0;border:1px solid rgb(68 64 60);border-radius:.45rem;background:rgba(28,25,23,.72);color:rgb(120 113 108)}
  .m36-mobile-disabled-choice .m36-choice-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
  .m36-mobile-disabled-choice .m36-choice-status{flex-shrink:0;font-size:.62rem;color:rgb(87 83 78);white-space:nowrap}
}
@media(min-width:1024px){.m36-mobile-disabled-choice{display:none!important}}
</style>
<script id="m36-mobile-next-ui-script">
(function(){
  var mq=window.matchMedia("(max-width:1023px)");
  function statusFor(text){
    if(/완료/.test(text)) return "완료";
    if(/오후 5시|영업.*전/.test(text)) return "영업 전";
    if(/늦|시간이 부족|시간.*없|너무 늦/.test(text)) return "시간 부족";
    if(/종료|마감|끝났/.test(text)) return "종료";
    if(/없습니다|없어요|방 안에/.test(text)) return "이용 불가";
    return "사용 불가";
  }
  function updateDisabled(){
    if(!mq.matches) return;
    document.querySelectorAll(".mobile-layout button:disabled").forEach(function(btn){
      if(btn.dataset.m36DisabledReplaced==="1") return;
      if(btn.closest(".m36-mobile-disabled-choice")) return;
      var text=(btn.textContent||"").replace(/\s+/g," ").trim();
      if(!text) return;
      var row=document.createElement("div");
      row.className="m36-mobile-disabled-choice";
      row.innerHTML='<span class="m36-choice-label"></span><span class="m36-choice-status"></span>';
      row.querySelector(".m36-choice-label").textContent=text;
      row.querySelector(".m36-choice-status").textContent=statusFor(text);
      btn.dataset.m36DisabledReplaced="1";
      btn.replaceWith(row);
    });
  }
  function updateCategories(){
    if(!mq.matches) return;
    document.querySelectorAll(".mobile-layout h4").forEach(function(h){
      var title=(h.textContent||"").trim();
      if(title!=="외출" && title.indexOf("마을 둘러보기")!==0) return;
      if(h.dataset.m36CategoryBound==="1") return;
      var list=h.nextElementSibling;
      if(!list) return;
      h.dataset.m36CategoryBound="1";
      h.style.cursor="pointer";
      h.style.display="flex";
      h.style.alignItems="center";
      h.style.justifyContent="space-between";
      var arrow=document.createElement("span");
      arrow.className="m36-category-arrow";
      arrow.textContent="▾";
      arrow.style.cssText="font-size:.75rem;color:rgb(87 83 78);";
      h.appendChild(arrow);
      list.dataset.m36CategoryList="1";
      list.style.display="none";
      h.addEventListener("click",function(){
        var open=list.style.display!=="none";
        list.style.display=open?"none":"";
        arrow.textContent=open?"▾":"▴";
      });
    });
  }
  function desktopRestore(){
    if(mq.matches) return;
    document.querySelectorAll(".mobile-layout h4").forEach(function(h){
      var title=(h.textContent||"").trim();
      if(title!=="외출" && title.indexOf("마을 둘러보기")!==0) return;
      var list=h.nextElementSibling;
      if(list && list.dataset.m36CategoryList==="1") list.style.display="";
      var arrow=h.querySelector(".m36-category-arrow");
      if(arrow) arrow.remove();
      delete h.dataset.m36CategoryBound;
      h.style.cursor="";
      h.style.display="";
      h.style.alignItems="";
      h.style.justifyContent="";
    });
  }
  function sync(){updateDisabled();updateCategories();desktopRestore();}
  new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled"]});
  window.addEventListener("resize",sync);
  sync();
})();
</script>'''

if 'm36-mobile-next-ui-v1' not in s:
    if "</body>" not in s:
        raise SystemExit("</body> not found")
    s = s.replace("</body>", addon + "</body>", 1)

p.write_text(s, encoding="utf-8")

assert 'assay!=null&&u.jsxs("span"' in s
assert 'm36-mobile-next-ui-v1' in s

scripts = re.findall(r"<script[^>]*>(.*?)</script>", s, flags=re.S | re.I)
for idx, src in enumerate(scripts):
    tmp = Path(tempfile.gettempdir()) / f"m36-check-{idx}.js"
    tmp.write_text(src, encoding="utf-8")
    r = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"node --check failed script {idx}: {r.stderr[:2000]}")

print("validated", len(scripts), "inline scripts")
