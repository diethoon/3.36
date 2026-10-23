WML.define({
  id: 'wayward-portrait-ui',
  name: '모바일 세로 UI 개선',
  version: '0.1.0',
  game: '>=2026-10-04',
  description: '모바일 선택지의 세로 여백을 줄이는 UI 전용 애드온.',
  setup() {
    const id = 'wayward-portrait-ui-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '@media (max-width:760px),(orientation:portrait){#root button.p-3{padding-top:.55rem!important;padding-bottom:.55rem!important}#root .grid.grid-cols-1.gap-2{min-width:0;max-width:100%;overflow-wrap:anywhere}#root button{min-width:0;max-width:100%;overflow-wrap:anywhere}}';
    document.head.appendChild(style);
  }
});
