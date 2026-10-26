// EduFlow — сборка кейса для портфолио.
// Выполняется плагином EduFlow Case Builder внутри файла eduflow (переменная figma передаётся загрузчиком).
//
// Правила обновления:
// - блоки живут на странице «Кейс — EduFlow» и узнаются по pluginData blockId;
// - пересобирается только блок, у которого в BLOCKS повышен rev, или которого нет на странице;
//   остальные блоки (и ручные правки в них) не трогаются;
// - заблокированный блок (замок в слоях, Shift+Ctrl/Cmd+L) не трогается никогда.

const VERSION = 'итерация 2.1';

const SCREENS = {
  landing: '288:2781',
  registration: '253:3643',
  signin: '253:4095',
  catalog: '234:2749',
  coursePromo: '256:3267',
  myCourses: '252:3045',
  course: '252:3269',
  lesson: '253:4151',
  profile: '253:4375',
  chat: '2001:93441',
  calendar: '262:1312',
  certificate: '342:5373',
};
const SERVICE_SCREENS = ['registration', 'signin', 'catalog', 'coursePromo', 'myCourses', 'course', 'lesson', 'profile', 'chat', 'calendar'];
const DESIGN_PAGE = '232:1705';
const CASE_PAGE = 'Кейс — EduFlow';

const C = {
  olive: '#515144',
  oliveCard: '#5D5D50',
  light: '#E1E2DF',
  paper: '#F5F5F4',
  grey: '#A6A6A6',
  sage: '#ABADA1',
  mid: '#96968B',
  yellow: '#FDF169',
  blue: '#CFDEFF',
  white: '#FFFFFF',
  ink: '#1E1E1A',
};

// Сетка: все отступы 40 — поля слева и справа, между панелями, между блоками.
// Панели — одна во всю ширину или две равные.
const W = 1920;
const M = 40;
const GAP = 40;
const CW = W - M * 2;
const HALF = (CW - GAP) / 2;
const PY = GAP / 2;
const R = 40;
const IN = 64;

const FONT = {};
const missingFonts = [];

// ---------- helpers ----------

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function fill(hex, opacity) {
  return [{ type: 'SOLID', color: rgb(hex), opacity: opacity === undefined ? 1 : opacity }];
}

// Берёт первый доступный шрифт из списка кандидатов.
async function pickFont(key, candidates) {
  for (const f of candidates) {
    try {
      await figma.loadFontAsync(f);
      FONT[key] = f;
      if (f !== candidates[0]) missingFonts.push(candidates[0].family + ' ' + candidates[0].style);
      return;
    } catch (e) { /* следующий кандидат */ }
  }
  throw new Error('Не удалось загрузить шрифт для «' + key + '»');
}

// o: x, y, size, font, color, width, lh, ls, align, name
function text(parent, chars, o) {
  const t = figma.createText();
  t.fontName = FONT[o.font || 'body'];
  t.characters = chars;
  t.fontSize = o.size || 24;
  t.fills = fill(o.color || C.ink);
  if (o.lh) t.lineHeight = { value: o.lh, unit: 'PERCENT' };
  if (o.ls !== undefined) t.letterSpacing = { value: o.ls, unit: 'PERCENT' };
  if (o.align) t.textAlignHorizontal = o.align;
  parent.appendChild(t);
  if (o.width) {
    t.textAutoResize = 'HEIGHT';
    t.resize(o.width, t.height);
  }
  t.x = o.x || 0;
  t.y = o.y || 0;
  if (o.name) t.name = o.name;
  return t;
}

// Двухтонный текст: первая часть цветом color, вторая — color2.
function text2(parent, a, b, o) {
  const t = text(parent, a + b, o);
  t.setRangeFills(a.length, a.length + b.length, fill(o.color2 || C.mid));
  return t;
}

function rect(parent, o) {
  const r = figma.createRectangle();
  r.resize(o.w, o.h);
  r.x = o.x || 0;
  r.y = o.y || 0;
  r.fills = fill(o.color || C.light);
  if (o.radius) r.cornerRadius = o.radius;
  if (o.name) r.name = o.name;
  parent.appendChild(r);
  return r;
}

function frame(parent, o) {
  const f = figma.createFrame();
  f.name = o.name || 'Frame';
  f.resize(o.w, o.h);
  f.x = o.x || 0;
  f.y = o.y || 0;
  f.fills = o.color ? fill(o.color) : [];
  if (o.radius) f.cornerRadius = o.radius;
  f.clipsContent = o.clip !== false;
  parent.appendChild(f);
  return f;
}

// Панель внутри блока. span: 'full' | 'left' | 'right'
function panel(block, span, h, color, name) {
  const x = span === 'right' ? M + HALF + GAP : M;
  const w = span === 'full' ? CW : HALF;
  return frame(block, { name: name || 'Panel', x: x, y: PY, w: w, h: h, color: color, radius: R });
}

// Подгоняет высоту узла под содержимое.
function fitHeight(node, bottomPad) {
  let bottom = 0;
  node.children.forEach(function (c) { bottom = Math.max(bottom, c.y + c.height); });
  node.resize(node.width, Math.round(bottom + bottomPad));
}

// Пилюля-тег. o: x, y, color (текст и обводка), stroke, bg, size
function chip(parent, label, o) {
  const f = figma.createFrame();
  f.name = 'Chip / ' + label;
  f.layoutMode = 'HORIZONTAL';
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.paddingLeft = f.paddingRight = 22;
  f.paddingTop = f.paddingBottom = 10;
  f.cornerRadius = 100;
  f.fills = o.bg ? fill(o.bg) : [];
  f.strokes = fill(o.stroke || o.color);
  f.strokeWeight = 1.5;
  parent.appendChild(f);
  text(f, label, { size: o.size || 22, font: 'head', color: o.color });
  f.x = o.x || 0;
  f.y = o.y || 0;
  return f;
}

function chipRow(parent, labels, o) {
  let x = o.x;
  labels.forEach(function (l) {
    const c = chip(parent, l, { x: x, y: o.y, color: o.color, bg: o.bg, stroke: o.stroke, size: o.size });
    x += c.width + 12;
  });
}

// Копия фрейма с дизайн-страницы в holder (остаётся редактируемой).
// crop: { sx, sy, sw } — фрагмент исходного фрейма, который растягивается на ширину holder.
async function placeScreen(holder, key, crop) {
  const src = await figma.getNodeByIdAsync(SCREENS[key]);
  if (!src) throw new Error('Не найден фрейм «' + key + '» (' + SCREENS[key] + ')');
  const c = crop || {};
  const k = holder.width / (c.sw || src.width);
  const copy = src.clone();
  holder.appendChild(copy);
  copy.rescale(k);
  copy.x = -Math.round((c.sx || 0) * k);
  copy.y = -Math.round((c.sy || 0) * k);
  copy.name = src.name;
  return copy;
}

const SHADOW = {
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 24 }, radius: 64, spread: 0, visible: true, blendMode: 'NORMAL',
};

// Экран-карточка без рамки устройства. o: x, y, w, h (по умолчанию пропорции 1440×1024), key, crop, radius, shadow
async function screenCard(parent, o) {
  const h = o.h || Math.round(o.w * 1024 / 1440);
  const f = frame(parent, { name: 'Screen / ' + o.key, x: o.x, y: o.y, w: o.w, h: h, color: C.paper, radius: o.radius === undefined ? 16 : o.radius });
  if (o.shadow !== false) f.effects = [SHADOW];
  await placeScreen(f, o.key, o.crop);
  return f;
}

// Окно браузера. o: x, y, w, h (высота области экрана), key
async function browser(parent, o) {
  const bar = Math.round(o.w * 0.034);
  const screenH = o.h || Math.round(o.w * 1024 / 1440);
  const win = frame(parent, { name: 'Mockup / Browser', x: o.x, y: o.y, w: o.w, h: bar + screenH, color: C.white, radius: Math.round(o.w * 0.014) });
  win.effects = [SHADOW];
  rect(win, { x: 0, y: 0, w: o.w, h: bar, color: C.paper, name: 'Toolbar' });
  const d = Math.round(bar * 0.26);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach(function (col, i) {
    const e = figma.createEllipse();
    e.resize(d, d);
    e.x = Math.round(bar * 0.5 + i * d * 1.8);
    e.y = Math.round((bar - d) / 2);
    e.fills = fill(col);
    e.name = 'Dot';
    win.appendChild(e);
  });
  rect(win, {
    x: Math.round(o.w * 0.35), y: Math.round(bar * 0.24), w: Math.round(o.w * 0.3),
    h: Math.round(bar * 0.52), color: C.light, radius: Math.round(bar * 0.26), name: 'Address bar',
  });
  const holder = frame(win, { name: 'Screen', x: 0, y: bar, w: o.w, h: screenH, color: C.paper });
  await placeScreen(holder, o.key);
  return win;
}

// Монитор на подставке. o: x, y, w (ширина корпуса), key
async function monitor(parent, o) {
  const bezel = Math.round(o.w * 0.02);
  const scrW = o.w - bezel * 2;
  const scrH = Math.round(scrW * 1024 / 1440);
  const bodyH = scrH + bezel * 2;
  const neckW = Math.round(o.w * 0.18);
  const neckH = Math.round(o.w * 0.12);
  const footW = Math.round(o.w * 0.38);
  const footH = Math.round(o.w * 0.018);

  const g = frame(parent, { name: 'Mockup / Monitor', x: o.x, y: o.y, w: o.w, h: bodyH + neckH + footH, clip: false });
  const neck = rect(g, { x: (o.w - neckW) / 2, y: bodyH - 2, w: neckW, h: neckH + 2, name: 'Neck' });
  neck.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 0.55, g: 0.55, b: 0.53, a: 1 } },
      { position: 1, color: { r: 0.8, g: 0.8, b: 0.78, a: 1 } },
    ],
  }];
  rect(g, { x: (o.w - footW) / 2, y: bodyH + neckH, w: footW, h: footH, color: '#C9CAC5', radius: footH / 2, name: 'Foot' });
  const body = rect(g, { x: 0, y: 0, w: o.w, h: bodyH, color: '#1B1B19', radius: Math.round(o.w * 0.018), name: 'Body' });
  body.effects = [SHADOW];
  const screen = frame(g, { name: 'Screen', x: bezel, y: bezel, w: scrW, h: scrH, color: C.paper, radius: Math.round(o.w * 0.006) });
  await placeScreen(screen, o.key);
  return g;
}

// Подпись раздела в углу панели: «01 / Регистрация».
function tag(parent, num, label, color) {
  return text(parent, num + ' / ' + label, { x: IN, y: IN - 8, size: 24, font: 'head', color: color, name: 'Label' });
}

// ---------- blocks ----------

async function blockCover(b) {
  const p = panel(b, 'full', 1200, C.olive, 'Cover');

  chipRow(p, ['Концептуальный проект', 'EdTech', 'UX/UI', 'Web'], { x: IN, y: IN, color: C.light, stroke: C.mid });
  const year = chip(p, '2025', { y: IN, color: C.light, stroke: C.mid });
  year.x = CW - IN - year.width;

  const wm = text(p, 'EDUFLOW', { y: 150, size: 300, font: 'bold', color: C.yellow, lh: 100, name: 'Wordmark' });
  wm.textAutoResize = 'WIDTH_AND_HEIGHT';
  wm.fontSize = Math.floor(wm.fontSize * (CW - IN * 2) / wm.width);
  wm.x = Math.round((CW - wm.width) / 2);

  const mw = 1040;
  const mon = await monitor(p, { x: (CW - mw) / 2, y: Math.round(wm.y + wm.height * 0.6), w: mw, key: 'landing' });
  const bottom = mon.y + mon.height;

  const sideW = (CW - mw) / 2 - IN - 40;
  const left = text(p, 'Онлайн-школа\nIT-профессий', { x: IN, size: 30, font: 'head', color: C.white, lh: 125, width: sideW, name: 'Subtitle' });
  left.y = bottom - left.height;
  const right = text(p, 'Лендинг\n10 экранов сервиса\nСертификат', { size: 24, color: C.sage, lh: 140, width: sideW, align: 'RIGHT', name: 'Scope' });
  right.x = CW - IN - sideW;
  right.y = bottom - right.height;

  p.resize(CW, bottom + IN);
}

async function blockAbout(b) {
  const p = panel(b, 'full', 900, C.light, 'About');

  const pill = chip(p, 'О проекте', { x: IN, y: IN, color: C.olive });
  const head = text2(p, 'Онлайн-школа IT-профессий, ', 'где всё нужное — под рукой студента', {
    x: IN, y: pill.y + pill.height + 40, size: 60, font: 'head', color: C.ink, color2: C.mid, lh: 110, width: 780, name: 'Headline',
  });

  const colW = 640;
  const top = head.y + head.height + 64;
  const meta = [
    ['Тип', 'Концептуальный проект'],
    ['Роль', 'UX/UI-дизайн'],
    ['Год', '2025'],
    ['Объём', '10 экранов, лендинг, сертификат'],
  ];
  meta.forEach(function (m, k) {
    const y = top + k * 68;
    rect(p, { x: IN, y: y, w: colW, h: 1, color: C.grey, name: 'Divider' });
    text(p, m[0], { x: IN, y: y + 20, size: 22, color: C.mid });
    text(p, m[1], { x: IN + 160, y: y + 18, size: 24, font: 'head', color: C.ink, width: colW - 160, align: 'RIGHT' });
  });
  rect(p, { x: IN, y: top + meta.length * 68, w: colW, h: 1, color: C.grey, name: 'Divider' });

  // Каскад экранов справа
  const cw = 640;
  await screenCard(p, { x: 980, y: IN, w: cw, key: 'catalog' });
  await screenCard(p, { x: 1080, y: IN + 150, w: cw, key: 'lesson' });
  const last = await screenCard(p, { x: 1180, y: IN + 300, w: cw, key: 'chat' });

  p.resize(CW, Math.max(last.y + last.height, top + meta.length * 68) + IN);
}

async function blockApproach(b) {
  const p = panel(b, 'full', 900, C.olive, 'Approach');
  text(p, 'Подход', { x: IN, y: IN, size: 60, font: 'head', color: C.white, name: 'Title' });

  const n = 3;
  const g = 24;
  const cw = (CW - IN * 2 - g * (n - 1)) / n;
  const vh = Math.round(cw * 0.62);
  const top = IN + 120;

  const cards = [
    ['Всё под рукой', 'Курсы, уроки, чат и календарь в одном кабинете'],
    ['Фокус на учёбе', 'Спокойная охристая палитра не отвлекает от материала'],
    ['Не как у всех', 'Смелый для EdTech визуал — отражение подхода школы'],
  ];
  for (let i = 0; i < n; i++) {
    const card = frame(p, { name: 'Card / ' + cards[i][0], x: IN + i * (cw + g), y: top, w: cw, h: 600, color: C.oliveCard, radius: 28 });
    const vis = frame(card, { name: 'Visual', x: 16, y: 16, w: cw - 32, h: vh, color: C.light, radius: 18 });

    if (i === 0) {
      // шапка личного кабинета: навигация, поиск, календарь, чат, профиль
      const hh = 96;
      const s = await screenCard(vis, { x: 32, y: Math.round(vh / 2 - hh - 10), w: vis.width - 64, h: hh, key: 'myCourses', crop: { sx: 760, sy: 4, sw: 680 }, radius: 14 });
      s.name = 'Header';
      const s2 = await screenCard(vis, { x: 32, y: s.y + hh + 20, w: vis.width - 64, h: hh, key: 'chat', crop: { sx: 760, sy: 4, sw: 680 }, radius: 14 });
      s2.name = 'Header active';
    } else if (i === 1) {
      const sw = [C.olive, C.mid, C.sage, C.light, C.yellow];
      const stripeW = (vis.width - 64) / sw.length;
      sw.forEach(function (col, k) {
        const r = rect(vis, { x: 32 + k * stripeW, y: 32, w: stripeW, h: vh - 64, color: col, name: 'Stripe ' + col });
        if (col === C.light) { r.strokes = fill(C.sage); r.strokeWeight = 1; }
      });
    } else {
      await placeScreen(vis, 'landing', { sx: 440, sy: 110, sw: 560 });
    }

    text(card, cards[i][0], { x: 32, y: vh + 48, size: 34, font: 'head', color: C.white, width: cw - 64 });
    const sub = text(card, cards[i][1], { x: 32, y: vh + 100, size: 22, color: C.sage, lh: 140, width: cw - 64 });
    card.resize(cw, sub.y + sub.height + 32);
  }

  fitHeight(p, IN);
}

async function blockNumbers(b) {
  // Левая половина: 10 экранов сервиса
  const l = panel(b, 'left', 700, C.light, 'Numbers / Screens');
  const num = text(l, '10', { x: IN, y: IN - 24, size: 200, font: 'head', color: C.olive, lh: 100 });
  text(l, 'экранов\nличного кабинета', { x: IN + num.width + 28, y: num.y + num.height - 80, size: 26, font: 'head', color: C.olive, lh: 120 });
  const cols = 5;
  const g = 12;
  const tw = (HALF - IN * 2 - g * (cols - 1)) / cols;
  const th = Math.round(tw * 1024 / 1440);
  const gy = num.y + num.height + 48;
  for (let i = 0; i < SERVICE_SCREENS.length; i++) {
    await screenCard(l, {
      x: IN + (i % cols) * (tw + g), y: gy + Math.floor(i / cols) * (th + g),
      w: tw, h: th, key: SERVICE_SCREENS[i], radius: 6, shadow: false,
    });
  }
  fitHeight(l, IN);

  // Правая половина: 2×2 карточки
  const r = panel(b, 'right', l.height, C.light, 'Numbers / More');
  const pad = 24;
  const cw = (HALF - pad * 3) / 2;
  const ch = (l.height - pad * 3) / 2;
  const cells = [['1', 'лендинг'], ['1', 'сертификат'], ['5', 'цветов'], ['2', 'шрифта']];
  for (let i = 0; i < 4; i++) {
    const c = frame(r, { name: 'Cell / ' + cells[i][1], x: pad + (i % 2) * (cw + pad), y: pad + Math.floor(i / 2) * (ch + pad), w: cw, h: ch, color: C.paper, radius: 28 });
    text(c, cells[i][0], { x: 32, y: 16, size: 120, font: 'head', color: C.olive, lh: 100 });
    text(c, cells[i][1], { x: 32, y: ch - 32 - 30, size: 26, font: 'head', color: C.olive });

    const vx = cw * 0.45;
    const vw = cw - vx - 24;
    if (i === 0) {
      await screenCard(c, { x: vx, y: 24, w: vw, h: ch - 24, key: 'landing', radius: 10, shadow: false });
    } else if (i === 1) {
      const cwid = Math.round(cw * 0.55);
      await screenCard(c, { x: cw - cwid - 24, y: (ch - cwid * 595 / 842) / 2, w: cwid, h: Math.round(cwid * 595 / 842), key: 'certificate', radius: 8 });
    } else if (i === 2) {
      [C.olive, C.mid, C.sage, C.light, C.yellow].forEach(function (col, k) {
        const e = figma.createEllipse();
        e.resize(80, 80);
        e.x = cw - 24 - 80 - (4 - k) * 52;
        e.y = (ch - 80) / 2;
        e.fills = fill(col);
        e.strokes = fill(C.paper);
        e.strokeWeight = 4;
        e.name = 'Color ' + col;
        c.appendChild(e);
      });
    } else {
      text(c, 'Aa', { x: vx, y: 36, size: 110, font: 'bold', color: C.olive, lh: 100 });
      text(c, 'Aa', { x: vx, y: 36 + 120, size: 110, font: 'body', color: C.mid, lh: 100 });
    }
  }
}

async function blockJtbd(b) {
  const p = panel(b, 'full', 900, C.olive, 'JTBD');
  text(p, 'Что нужно студенту', { x: IN, y: IN, size: 60, font: 'head', color: C.white, name: 'Title' });
  text(p, 'Jobs To Be Done', { x: IN, y: IN + 80, size: 24, color: C.sage });

  const jobs = [
    ['найти курс под свою цель', 'Каталог'],
    ['видеть свой прогресс', 'Мои курсы'],
    ['не пропустить вебинар и дедлайн', 'Календарь'],
    ['быстро спросить наставника', 'Чат'],
    ['подтвердить новые навыки', 'Сертификат'],
  ];
  const g = 16;
  const cw = (CW - IN * 2 - g * 4) / 5;
  const ch = 260;
  const top = IN + 200;
  jobs.forEach(function (j, i) {
    const c = frame(p, { name: 'Job ' + (i + 1), x: IN + i * (cw + g), y: top + i * 64, w: cw, h: ch, color: C.light, radius: 24 });
    text(c, '0' + (i + 1), { x: 28, y: 24, size: 28, font: 'head', color: C.mid });
    const t = text(c, j[0], { x: 28, size: 28, font: 'head', color: C.olive, lh: 120, width: cw - 56 });
    t.y = ch - 28 - 40 - t.height;
    chip(c, j[1], { x: 28, y: ch - 28 - 36, color: C.olive, bg: C.yellow, stroke: C.yellow, size: 18 });
  });

  fitHeight(p, IN);
}

async function blockAuth(b) {
  const h = 760;
  const pairs = [['left', 'registration', '01', 'Регистрация'], ['right', 'signin', '02', 'Вход']];
  for (const s of pairs) {
    const p = panel(b, s[0], h, C.light, 'Auth / ' + s[3]);
    tag(p, s[2], s[3], C.olive);
    // окно выходит за правый и нижний край панели
    await browser(p, { x: IN, y: IN + 72, w: 1000, key: s[1] });
  }
}

const BLOCKS = [
  { id: 'cover', rev: 2, name: '01 Обложка', build: blockCover },
  { id: 'about', rev: 2, name: '02 О проекте', build: blockAbout },
  { id: 'goals', rev: 2, name: '03 Подход', build: blockApproach },
  { id: 'numbers', rev: 2, name: '04 В цифрах', build: blockNumbers },
  { id: 'jtbd', rev: 2, name: '05 Что нужно студенту', build: blockJtbd },
  { id: 'auth', rev: 2, name: '06 Регистрация и вход', build: blockAuth },
];

// ---------- page & blocks management ----------

async function casePage() {
  let page = null;
  figma.root.children.forEach(function (p) {
    if (!page && p.getPluginData('eduflowCase') === '1') page = p;
  });
  if (!page) {
    figma.root.children.forEach(function (p) { if (!page && p.name === CASE_PAGE) page = p; });
  }
  if (!page) {
    page = figma.createPage();
    page.name = CASE_PAGE;
  }
  await page.loadAsync();
  page.setPluginData('eduflowCase', '1');
  return page;
}

// Пробные слайды первой версии плагина отодвигаются вправо, чтобы не пересекаться с блоками.
function moveLegacy(page) {
  const legacy = ['01 Cover', '02 About', '03 Catalog', '04 Design system'];
  page.children.forEach(function (n) {
    if (n.type === 'FRAME' && legacy.indexOf(n.name) !== -1 && !n.getPluginData('blockId') && n.x < W + 200) {
      n.x += W + 400;
      n.name = n.name + ' (черновик v0)';
    }
  });
}

// Ревизия собранного блока; у блоков, собранных до появления rev, она берётся из номера итерации.
function blockRev(node) {
  const rev = parseInt(node.getPluginData('rev'), 10);
  if (!isNaN(rev)) return rev;
  const m = /итерация (\d+)/.exec(node.getPluginData('version'));
  return m ? parseInt(m[1], 10) : 0;
}

async function main() {
  await Promise.all([
    pickFont('body', [{ family: 'Golos Text', style: 'Regular' }, { family: 'Inter', style: 'Regular' }]),
    pickFont('head', [{ family: 'PP Neue Montreal', style: 'Medium' }, { family: 'Golos Text', style: 'Medium' }, { family: 'Inter', style: 'Medium' }]),
    pickFont('bold', [{ family: 'PP Neue Montreal', style: 'Bold' }, { family: 'Golos Text', style: 'Bold' }, { family: 'Inter', style: 'Bold' }]),
  ]);

  const designPage = await figma.getNodeByIdAsync(DESIGN_PAGE);
  if (!designPage) throw new Error('Не найдена страница design — плагин нужно запускать в файле eduflow');
  await designPage.loadAsync();

  const page = await casePage();
  moveLegacy(page);

  const existing = {};
  page.children.forEach(function (n) {
    const id = n.getPluginData('blockId');
    if (id) existing[id] = n;
  });

  let built = 0;
  const skipped = [];
  const ordered = [];
  for (let i = 0; i < BLOCKS.length; i++) {
    const def = BLOCKS[i];
    const old = existing[def.id];
    if (old && old.locked) {
      skipped.push(def.name);
      ordered.push(old);
      continue;
    }
    if (old && blockRev(old) >= def.rev) {
      ordered.push(old);
      continue;
    }
    const b = figma.createFrame();
    b.name = def.name;
    b.resize(W, 100);
    b.fills = fill(C.paper);
    b.clipsContent = true;
    page.appendChild(b);
    await def.build(b);
    // у первого и последнего блока внешний отступ тоже 40
    if (i === 0) b.children.forEach(function (c) { c.y += PY; });
    fitHeight(b, i === BLOCKS.length - 1 ? PY * 2 : PY);
    b.setPluginData('blockId', def.id);
    b.setPluginData('version', VERSION);
    b.setPluginData('rev', String(def.rev));
    if (old) old.remove();
    ordered.push(b);
    built++;
  }

  let y = 0;
  ordered.forEach(function (b) {
    b.x = 0;
    b.y = y;
    y += b.height;
  });

  await figma.setCurrentPageAsync(page);
  figma.viewport.scrollAndZoomIntoView(ordered);

  page.setPluginData('lastRun', VERSION + ' · ' + new Date().toISOString());

  let msg = built
    ? 'Кейс обновлён (' + VERSION + '): пересобрано блоков — ' + built + '.'
    : 'Кейс актуален (' + VERSION + '): изменений нет.';
  if (skipped.length) msg += ' Заблокированы и не тронуты: ' + skipped.join(', ') + '.';
  if (missingFonts.length) msg += ' Нет шрифтов: ' + missingFonts.join(', ') + ' — использован запасной.';
  return msg;
}

return await main();
