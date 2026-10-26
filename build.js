// EduFlow — сборка кейса для портфолио.
// Выполняется плагином EduFlow Case Builder внутри файла eduflow (переменная figma передаётся загрузчиком).
//
// Правила обновления:
// - блоки живут на странице «Кейс — EduFlow» и узнаются по pluginData blockId;
// - при каждом запуске блоки из BLOCKS пересобираются на своём месте;
// - заблокированный блок (замок в слоях, Shift+Ctrl/Cmd+L) не трогается — так сохраняются ручные правки.

const VERSION = 'итерация 1';

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
  calendar: '262:1312',
  certificate: '342:5373',
};
const DESIGN_PAGE = '232:1705';
const CASE_PAGE = 'Кейс — EduFlow';

const C = {
  olive: '#515144',
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

// Сетка: ширина блока 1920, поля слева и справа одинаковые, панели — одна во всю ширину или две равные.
const W = 1920;
const M = 80;
const GAP = 24;
const CW = W - M * 2;
const HALF = (CW - GAP) / 2;
const PY = GAP / 2;
const R = 40;
const IN = 72;

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

async function pickFont(key, family, style, fallbackStyle) {
  try {
    await figma.loadFontAsync({ family: family, style: style });
    FONT[key] = { family: family, style: style };
  } catch (e) {
    const fb = { family: 'Inter', style: fallbackStyle };
    await figma.loadFontAsync(fb);
    FONT[key] = fb;
    missingFonts.push(family + ' ' + style);
  }
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

// Подгоняет высоту панели (и блока) под содержимое.
function fitHeight(node, bottomPad) {
  let bottom = 0;
  node.children.forEach(function (c) { bottom = Math.max(bottom, c.y + c.height); });
  node.resize(node.width, Math.round(bottom + bottomPad));
}

// Пилюля-тег. o: x, y, color (текст и обводка), bg, size
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
  const out = [];
  labels.forEach(function (l) {
    const c = chip(parent, l, { x: x, y: o.y, color: o.color, bg: o.bg, stroke: o.stroke, size: o.size });
    x += c.width + 12;
    out.push(c);
  });
  return out;
}

// Копия фрейма с дизайн-страницы, вписанная по ширине в holder (остаётся редактируемой).
async function placeScreen(holder, key) {
  const src = await figma.getNodeByIdAsync(SCREENS[key]);
  if (!src) throw new Error('Не найден фрейм «' + key + '» (' + SCREENS[key] + ')');
  const copy = src.clone();
  holder.appendChild(copy);
  copy.rescale(holder.width / src.width);
  copy.x = 0;
  copy.y = 0;
  copy.name = src.name;
  return copy;
}

const SHADOW = {
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.22 },
  offset: { x: 0, y: 32 }, radius: 80, spread: 0, visible: true, blendMode: 'NORMAL',
};

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

// ---------- blocks ----------

async function blockCover(b) {
  const p = panel(b, 'full', 1200, C.olive, 'Cover');

  chipRow(p, ['Концептуальный проект', 'EdTech', 'UX/UI', 'Web'], { x: IN, y: IN, color: C.light, stroke: C.mid });
  const year = chip(p, '[год]', { y: IN, color: C.light, stroke: C.mid });
  year.x = CW - IN - year.width;

  const wm = text(p, 'EDUFLOW', { y: 150, size: 300, font: 'bold', color: C.yellow, lh: 100, name: 'Wordmark' });
  wm.textAutoResize = 'WIDTH_AND_HEIGHT';
  wm.fontSize = Math.floor(wm.fontSize * (CW - IN * 2) / wm.width);
  wm.x = Math.round((CW - wm.width) / 2);

  const mw = 1000;
  const mon = await monitor(p, { x: (CW - mw) / 2, y: Math.round(wm.y + wm.height * 0.6), w: mw, key: 'landing' });
  const bottom = mon.y + mon.height;

  const sideW = (CW - mw) / 2 - IN - 40;
  const left = text(p, 'Онлайн-школа IT-профессий: от первого урока до первого оффера', {
    x: IN, size: 28, font: 'head', color: C.white, lh: 130, width: sideW, name: 'Subtitle',
  });
  left.y = bottom - left.height;
  const right = text(p, 'Лендинг\n10 экранов сервиса\nСертификат', {
    size: 24, color: C.sage, lh: 140, width: sideW, align: 'RIGHT', name: 'Scope',
  });
  right.x = CW - IN - sideW;
  right.y = bottom - right.height;

  p.resize(CW, bottom + IN);
}

async function blockAbout(b) {
  const p = panel(b, 'full', 1000, C.light, 'About');

  const pill = chip(p, 'О проекте', { y: IN, color: C.olive });
  pill.x = Math.round((CW - pill.width) / 2);

  const head = text2(p, 'Онлайн-школа IT-профессий,\n', 'где всё нужное — под рукой студента', {
    y: pill.y + pill.height + 48, size: 72, font: 'head', color: C.ink, color2: C.mid, lh: 112,
    width: 1300, align: 'CENTER', name: 'Headline',
  });
  head.x = Math.round((CW - 1300) / 2);

  const top = head.y + head.height + 140;
  const colW = (CW - IN * 2 - 120) / 2;

  const meta = [
    ['Тип', 'Концептуальный проект'],
    ['Сфера', 'EdTech, онлайн-образование'],
    ['Платформа', 'Web, desktop'],
    ['Объём', '10 экранов сервиса, сертификат, лендинг'],
    ['Роль', '[UX/UI-дизайнер]'],
    ['Год', '[год]'],
  ];
  meta.forEach(function (m, k) {
    const y = top + k * 76;
    rect(p, { x: IN, y: y, w: colW, h: 1, color: C.grey, name: 'Divider' });
    text(p, m[0], { x: IN, y: y + 22, size: 22, color: C.mid });
    text(p, m[1], { x: IN + 200, y: y + 20, size: 24, font: 'head', color: C.ink, width: colW - 200, align: 'RIGHT' });
  });
  rect(p, { x: IN, y: top + meta.length * 76, w: colW, h: 1, color: C.grey, name: 'Divider' });

  const dx = IN + colW + 120;
  const d1 = text(p,
    'EduFlow — концептуальный проект онлайн-школы, где можно пройти курсы и получить новую профессию в IT.',
    { x: dx, y: top, size: 34, font: 'head', color: C.ink, lh: 135, width: colW, name: 'Description' });
  text(p,
    'Сервис устроен так, чтобы всё необходимое было под рукой студента: каталог курсов, уроки и домашние задания, ' +
    'прогресс, календарь событий и связь с наставниками. Вместе с личным кабинетом спроектированы продающий лендинг школы ' +
    'и сертификат о прохождении курса.',
    { x: dx, y: d1.y + d1.height + 32, size: 26, color: C.olive, lh: 150, width: colW, name: 'Description 2' });

  fitHeight(p, IN + 24);
}

async function blockGoals(b) {
  const p = panel(b, 'full', 1000, C.olive, 'Goals');

  text(p, 'Цели\nи подход', { x: IN, y: IN, size: 72, font: 'head', color: C.white, lh: 105, name: 'Title' });

  const goals = [
    ['Всё под рукой. ', 'Каталог, уроки, домашние задания, прогресс, календарь и связь с наставником собраны в одном кабинете — студенту не нужно искать их по разным сервисам.'],
    ['Концентрация на учёбе. ', 'Спокойная охристая палитра не перетягивает внимание: интерфейс отходит на второй план и не отвлекает от материала.'],
    ['Смелость отойти от привычного. ', 'Необычная для EdTech цветовая композиция показывает подход школы: мы не боимся делать иначе.'],
  ];
  const gx = 760;
  const gw = CW - gx - IN;
  let y = IN + 8;
  goals.forEach(function (g, k) {
    text(p, '0' + (k + 1), { x: gx, y: y, size: 22, font: 'head', color: C.yellow, name: 'Index' });
    const t = text2(p, g[0], g[1], {
      x: gx, y: y + 44, size: 38, font: 'head', color: C.white, color2: C.sage, lh: 128, width: gw, name: 'Goal ' + (k + 1),
    });
    y = t.y + t.height + 64;
  });

  fitHeight(p, IN);
}

const BLOCKS = [
  { id: 'cover', name: '01 Обложка', build: blockCover },
  { id: 'about', name: '02 О проекте', build: blockAbout },
  { id: 'goals', name: '03 Цели и подход', build: blockGoals },
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

async function main() {
  await Promise.all([
    pickFont('body', 'Golos Text', 'Regular', 'Regular'),
    pickFont('head', 'PP Neue Montreal', 'Medium', 'Medium'),
    pickFont('bold', 'PP Neue Montreal', 'Bold', 'Bold'),
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
  for (const def of BLOCKS) {
    const old = existing[def.id];
    if (old && old.locked) {
      skipped.push(def.name);
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
    fitHeight(b, PY);
    b.setPluginData('blockId', def.id);
    b.setPluginData('version', VERSION);
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

  let msg = 'Кейс обновлён (' + VERSION + '): пересобрано блоков — ' + built + '.';
  if (skipped.length) msg += ' Заблокированы и не тронуты: ' + skipped.join(', ') + '.';
  if (missingFonts.length) msg += ' Нет шрифтов: ' + missingFonts.join(', ') + ' — заменены на Inter.';
  return msg;
}

return await main();
