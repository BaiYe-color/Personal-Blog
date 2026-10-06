const paths = {
  previous: '<path d="M6 5v14M18 5 8 12l10 7Z"/>',
  next: '<path d="M18 5v14M6 5l10 7-10 7Z"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  note: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="3"/>',
  loop: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>'
};
export function playerIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
export function floatingPlayerMarkup(mode = 'loop') {
  return `<section id="music-player" class="music-player floating-player" aria-label="浮动音乐播放器" hidden>
    <button id="player-launcher" class="player-note" aria-label="打开音乐播放器" aria-expanded="false" aria-controls="player-panel">${playerIcon('note')}</button>
    <div id="player-panel" class="player-glass-panel" role="region" aria-label="当前音乐与播放控制" aria-hidden="true" inert>
      <header class="player-panel-head"><span>NOW PLAYING</span><button id="player-close" aria-label="收起音乐播放器">${playerIcon('close')}</button></header>
      <img id="player-cover" class="player-panel-cover" alt="当前音乐封面">
      <div class="player-panel-copy"><strong id="player-title"></strong><span id="player-artist"></span></div>
      <div class="cassette-progress"><input data-music-seek type="range" min="0" max="1000" step="1" value="0" disabled aria-label="音乐进度"><div><time data-music-elapsed>00:00</time><time data-music-total>00:00</time></div></div>
      <div class="player-panel-buttons">
        <button data-play-mode="loop" aria-label="循环播放" aria-pressed="${mode === 'loop'}">${playerIcon('loop')}</button>
        <button data-music-step="-1" aria-label="上一首">${playerIcon('previous')}</button>
        <button data-music-toggle class="player-panel-play" aria-label="播放" aria-pressed="false">${playerIcon('play')}</button>
        <button data-music-step="1" aria-label="下一首">${playerIcon('next')}</button>
        <button data-play-mode="shuffle" aria-label="随机播放" aria-pressed="${mode === 'shuffle'}">${playerIcon('shuffle')}</button>
      </div>
      <p id="player-status" role="status"></p>
    </div>
    <audio id="music-audio" preload="none" hidden></audio>
  </section>`;
}
