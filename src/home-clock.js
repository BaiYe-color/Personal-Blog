const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const civil = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hourCycle: 'h12' });
const lunar = new Intl.DateTimeFormat('en-US-u-ca-chinese', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' });
const fixedFestivals = { '1-1': '元旦', '3-8': '妇女节', '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节', '9-10': '教师节', '10-1': '国庆节' };
const lunarFestivals = { '1-1': '春节', '1-15': '元宵节', '5-5': '端午节', '7-7': '七夕', '8-15': '中秋节', '9-9': '重阳节', '12-8': '腊八节' };
// Qingming follows the solar term, rather than a fixed Gregorian or lunar date.
// Annual date source: https://www.hko.gov.hk/en/gts/astron2026/files/2026cal04.pdf
const annualFestivals = { '2026-04-05': '清明节' };
const partsOf = (formatter, date) => Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));

export function beijingClock(date = new Date(), extraFestivals = {}) {
  const part = partsOf(civil, date), moon = partsOf(lunar, date);
  const day = part.day.padStart(2, '0'), month = part.month.padStart(2, '0');
  const dateKey = `${part.year}-${month}-${day}`;
  const names = [fixedFestivals[`${Number(month)}-${Number(day)}`], annualFestivals[dateKey]];
  if (!moon.month.includes('bis')) names.push(lunarFestivals[`${moon.month}-${moon.day}`]);
  const tomorrow = partsOf(lunar, new Date(date.getTime() + 86400000));
  if (moon.month === '12' && tomorrow.month === '1' && tomorrow.day === '1') names.push('除夕');
  if (extraFestivals?.[dateKey]) names.push(extraFestivals[dateKey]);
  const hour24 = Number(part.hour) % 12 + (part.dayPeriod === 'PM' ? 12 : 0);
  return { day, month: months[Number(month) - 1], time: `${part.hour.padStart(2, '0')}:${part.minute} ${part.dayPeriod}`, dateKey, dateTime: `${dateKey}T${String(hour24).padStart(2, '0')}:${part.minute}:${part.second}+08:00`, festival: [...new Set(names.filter(Boolean))].join(' · ') };
}

// Locally drawn lettering: interrupted strokes, open counters and triangular forms.
// Keeping it as SVG makes the display independent of installed system fonts.
const glyphs = {
  A: 'M1 23 10 2 19 23M7 17h6', B: 'M2 13v10h10l6-5-6-5H2M2 2h10l6 5-4 4',
  C: 'M18 3H8L2 9v8l6 6h10', D: 'M2 2h9l7 7v7l-7 7H2V12',
  E: 'M18 2H2v8h12M2 15v8h16', F: 'M18 2H2v8h12M2 15v8',
  G: 'M18 3H8L2 9v8l6 6h10V13h-7', H: 'M2 2v21M18 2v8M18 15v8M2 12h16',
  I: 'M10 2v8M10 14v9', J: 'M18 2v15l-6 6H7l-5-5',
  L: 'M2 2v15l6 6h10', M: 'M2 23V2l8 10 8-10v8M18 15v8',
  N: 'M2 23V2l16 21M18 2v14', O: 'M8 2h5l5 6v9l-5 6H7l-5-6V8',
  P: 'M2 23V2h10l6 5-6 6H7', R: 'M2 23V2h10l6 5-6 6H7M11 15l8 8',
  S: 'M18 2H8L2 8l5 4h6l5 5-6 6H2', T: 'M1 2h18M10 8v15',
  U: 'M2 2v15l6 6h4l6-6v-5M18 2v5', V: 'M1 2l9 21 9-21',
  Y: 'M1 2l9 10 9-10M10 17v6',
};
export function geometricWord(word) {
  const letters = [...String(word).toUpperCase()].filter(letter => glyphs[letter]);
  return `<svg class="geometric-word" viewBox="0 0 ${Math.max(1, letters.length * 28 - 8)} 26" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false">${letters.map((letter, i) => `<path d="${glyphs[letter]}" transform="translate(${i * 28} 0)"/>`).join('')}</svg>`;
}
const timeMarkup = value => `${value.time.slice(0, -3)}<span class="clock-period" aria-hidden="true">${geometricWord(value.time.slice(-2))}</span>`;

export function clockMarkup(extraFestivals = {}) {
  const value = beijingClock(new Date(), extraFestivals);
  return `<aside class="compass-clock" aria-label="北京时间"><div class="clock-date" aria-hidden="true">${value.day}</div><div class="clock-month" aria-label="${value.month}">${geometricWord(value.month)}</div><div class="clock-detail"><time datetime="${value.dateTime}" aria-label="北京时间 ${value.time}">${timeMarkup(value)}</time><span class="clock-festival" ${value.festival ? '' : 'hidden'}><span class="clock-dash" aria-hidden="true">—</span><span class="clock-festival-name"></span></span></div></aside>`;
}

export function initClock(root, extraFestivals = {}) {
  if (!root) return () => {};
  let previousMonth = '', previousTime = '';
  function update() {
    const value = beijingClock(new Date(), extraFestivals);
    root.querySelector('.clock-date').textContent = value.day;
    root.setAttribute('aria-label', `${value.dateKey}，北京时间 ${value.time}${value.festival ? '，' + value.festival : ''}`);
    if (previousMonth !== value.month) {
      const month = root.querySelector('.clock-month');
      month.innerHTML = geometricWord(value.month); month.setAttribute('aria-label', value.month);
      previousMonth = value.month;
    }
    const time = root.querySelector('time');
    if (previousTime !== value.time) { time.innerHTML = timeMarkup(value); previousTime = value.time; }
    time.dateTime = value.dateTime; time.setAttribute('aria-label', `北京时间 ${value.time}`);
    root.querySelector('.clock-festival-name').textContent = value.festival;
    root.querySelector('.clock-festival').hidden = !value.festival;
  }
  update();
  const timer = setInterval(update, 1000);
  document.addEventListener('visibilitychange', update);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
}
