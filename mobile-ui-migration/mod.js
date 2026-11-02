WML.define({
  id: "mobile-ui-migration",
  name: "M36 ëª¨ë°”ì¼ UI ë§ˆì´ê·¸ë ˆì´ì…˜",
  version: "1.4.0",
  game: "2026-10-24-pre7",
  platform: "mobile",
  description: "4.38MB WML ë¹Œë“œìš©: ìƒíƒœÂ·ëŒ€í™”Â·ê²Œì´ì§€ ê³ ì •, ê¸´ ìƒíƒœ ë¬¸êµ¬ ë§ì¤„ìž„, ì „ì²´í™”ë©´Â·ë¹„í™œì„± í–‰ë™ ì ‘ê¸°",
  symbols: {
    React: { raw: { "2026-10-24-pre7": "J" } },
    layout: { raw: { "2026-10-24-pre7": "Ast" } },
  },
  setup(api) {
    const React = api.fn("React");
    const h = React.createElement;
    const GAME_SELECTOR = "#root";
    const ACTION_PANEL_CLASS = "m36-ui-migration-action-panel";
    const ACTION_SCROLL_CLASS = "m36-ui-migration-action-scroll";
    const PINNED_PANEL_CLASS = "m36-ui-migration-pinned-panel";
    const STYLE_ID = "m36-mobile-ui-migration-style";
    const MOBILE_PORTRAIT = window.matchMedia("(max-width: 1023px) and (orientation: portrait)");
    const hostPlatform = api.host?.platform || "unknown";
    const mobileHost = hostPlatform === "mobile" ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

    function componentName(node) {
      return React.isValidElement(node) && typeof node.type === "function"
        ? node.type.name
        : "";
    }

    function containsComponent(node, name, predicate) {
      if (!React.isValidElement(node)) return false;
      if (componentName(node) === name && (!predicate || predicate(node))) return true;

      let found = false;
      React.Children.forEach(node.props?.children, (ch¶»§q«^u½¸ ¤ì(€€€€€¥˜€ …µ½‰¥±•!½ÍÐñð€…5=	%1}A=IQI%P¹µ…Ñ¡•Ì¤É•ÑÕÉ¸ì(€€€€€½¹ÍÐÉ½½Ð€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È¡5}M1Q=H¤ì(€€€€€¥˜€ …É½½Ð¤É•ÑÕÉ¸ì(€€€€€½¹ÍÐµ•¹Ô€ôÉÉ…ä¹™É½´¡É½½Ð¹ÅÕ•ÉåM•±•Ñ½É±° ‰‰ÕÑÑ½¸ˆ¤¤¹™¥¹ ¡‰ÕÑÑ½¸¤€ôø(€€€€€€€‰ÕÑÑ½¸¹•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ¤€ôôô€‹®¦S®&Ðˆñð(€€€€€€€‰ÕÑÑ½¸¹Ñ¥Ñ±”€ôôô€‹®¦S®&Ðˆñð(€€€€€€€‰ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð¹ÑÉ¥´ ¤€ôôô€‹ŠbÀˆ(€€€€€€¤ì(€€€€€¥˜€ …µ•¹Ôñð€…µ•¹Ô¹Á…É•¹Ñ±•µ•¹Ð¤É•ÑÕÉ¸ì(€€€€€¥˜€ …™Õ±±ÍÉ••¹	ÕÑÑ½¸ñð€…™Õ±±ÍÉ••¹	ÕÑÑ½¸¹¥Í½¹¹•Ñ•¤ì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹±…ÍÍ9…µ”€ô(€€€€€€€€€€¡ÑåÁ•½˜µ•¹Ô¹±…ÍÍ9…µ”€ôôô€‰ÍÑÉ¥¹œˆ€üµ•¹Ô¹±…ÍÍ9…µ”€è€ˆˆ¤€¬(€€€€€€€€€€ˆ´ÌØµÕ¤µµ¥É…Ñ¥½¸µ™Õ±±ÍÉ••¸µ‰ÕÑÑ½¸ˆì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ´ÌØµÕ¤µµ¥É…Ñ¥½¸µ™Õ±±ÍÉ••¸ˆ°€ˆÄˆ¤ì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹ŠnØˆì(€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°Ñ½±•Õ±±ÍÉ••¸¤ì(€€€€€ô(€€€€€¥˜€¡™Õ±±ÍÉ••¹	ÕÑÑ½¸¹Á…É•¹Ñ±•µ•¹Ð€„ôôµ•¹Ô¹Á…É•¹Ñ±•µ•¹Ðñð(€€€€€€€€€™Õ±±ÍÉ••¹	ÕÑÑ½¸¹¹•áÑ±•µ•¹ÑM¥‰±¥¹œ€„ôôµ•¹Ô¤ì(€€€€€€€µ•¹Ô¹Á…É•¹Ñ±•µ•¹Ð¹¥¹Í•ÉÑ	•™½É”¡™Õ±±ÍÉ••¹	ÕÑÑ½¸°µ•¹Ô¤ì(€€€€€ô(€€€€€ÕÁ‘…Ñ•Õ±±ÍÉ••¹	ÕÑÑ½¸ ¤ì(€€€ô((€€€±•ÐÅÕ•Õ•€ô™…±Í”ì(€€€™Õ¹Ñ¥½¸ÅÕ•Õ•Må¹Œ ¤ì(€€€€€¥˜€¡ÅÕ•Õ•¤É•ÑÕÉ¸ì(€€€€€ÅÕ•Õ•€ôÑÉÕ”ì(€€€€€Ý¥¹‘½Ü¹É•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”  ¤€ôøì(€€€€€€€ÅÕ•Õ•€ô™…±Í”ì(€€€€€€€Íå¹Õ±±ÍÉ••¹	ÕÑÑ½¸ ¤ì(€€€€€€€É•¹‘•É¥Í…‰±•‘¡½¥•Ì ¤ì(€€€€€ô¤ì(€€€ô((€€€½¹ÍÐÉ½½Ð€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È¡5}M1Q=H¤ì(€€€±•ÒÚîÆ­y