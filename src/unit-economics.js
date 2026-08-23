import "./style.css";
import "./metrica.js";

/* Живая воронка юнит-экономики — переизложение формул из
   "[ UTF _ Unit экономика ].xlsx" (Лист1) на JS.
   Направление расчёта Orders/Retention приведено к одному варианту:
   в исходнике базовая строка задавала Orders напрямую и выводила из
   него Retention, а все 9 строк чувствительности — наоборот, задавали
   Retention и выводили из него Orders. Для живого калькулятора взят
   второй вариант (Retention — рычаг, Orders — результат), так как
   он использован в 9 строках из 10 и логичнее для "что если" сценариев. */

const RUB = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const RUB2 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });

/* Пояснения к каждому параметру: что значит + как считается.
   Для рычагов (impressions...margin) формула — это как метрика
   обычно считается в реальности, а не как она попадает в этот
   калькулятор (там это просто поле ввода). */
const GLOSSARY = {
  impressions: {
    term: "Показы",
    def: "Сколько раз рекламное объявление показали пользователям.",
    formula: "Считается рекламной системой напрямую",
  },
  ctr: {
    term: "CTR",
    def: "Доля показов, по которым кликнули.",
    formula: "CTR = Клики / Показы",
  },
  cr1: {
    term: "CR1 — конверсия в заявку",
    def: "Доля перешедших пользователей, оставивших заявку.",
    formula: "CR1 = Заявки / Users",
  },
  cr2: {
    term: "CR2 — конверсия в квал. лид",
    def: "Доля заявок, прошедших квалификацию (реальный интерес и платёжеспособность).",
    formula: "CR2 = Квал. лиды / Лиды",
  },
  cr3: {
    term: "CR3 — конверсия в продажу",
    def: "Доля квалифицированных лидов, которые купили.",
    formula: "CR3 = Покупатели / Квал. лиды",
  },
  avPrice: {
    term: "Средний чек",
    def: "Средняя сумма одного заказа.",
    formula: "Средний чек = Выручка / Число заказов",
  },
  retention: {
    term: "Retention",
    def: "Среднее число повторных покупок на одного покупателя.",
    formula: "Retention = Заказы / Покупатели",
  },
  cpu: {
    term: "CPU — стоимость пользователя",
    def: "Сколько в среднем стоит привлечение одного перешедшего пользователя.",
    formula: "CPU = Расходы на рекламу / Users",
  },
  margin: {
    term: "Маржа",
    def: "Доля выручки, остающаяся после переменных затрат (себестоимости).",
    formula: "Маржа = Валовая прибыль / Выручка",
  },
  users: {
    term: "Users",
    def: "Пользователи, перешедшие по рекламе.",
    formula: "Users = Показы × CTR",
  },
  leads: {
    term: "Лиды",
    def: "Оставленные заявки.",
    formula: "Лиды = Users × CR1",
  },
  qleads: {
    term: "Квал. лиды",
    def: "Заявки, прошедшие квалификацию.",
    formula: "Квал. лиды = Лиды × CR2",
  },
  buyers: {
    term: "Покупатели",
    def: "Уникальные клиенты, совершившие покупку.",
    formula: "Покупатели = Квал. лиды × CR3",
  },
  orders: {
    term: "Orders",
    def: "Общее число заказов с учётом повторных покупок.",
    formula: "Orders = Покупатели × Retention",
  },
  arppu: {
    term: "ARPPU",
    def: "Средняя выручка с одного платящего клиента.",
    formula: "ARPPU = Средний чек × Retention",
  },
  acquisitionCosts: {
    term: "Расходы на привлечение",
    def: "Сколько всего потрачено на привлечение пользователей.",
    formula: "Расходы = CPU × Users",
  },
  cpo: {
    term: "CPO",
    def: "Стоимость привлечения одного заказа.",
    formula: "CPO = Расходы на привлечение / Orders",
  },
  revenue: {
    term: "Выручка",
    def: "Общая сумма всех заказов.",
    formula: "Выручка = ARPPU × Покупатели",
  },
  grossProfit: {
    term: "Валовая прибыль",
    def: "Прибыль до вычета расходов на привлечение.",
    formula: "Валовая прибыль = Выручка × Маржа",
  },
  arpu: {
    term: "ARPU",
    def: "Средняя валовая прибыль с одного пользователя воронки, включая некупивших.",
    formula: "ARPU = Валовая прибыль / Users",
  },
  profit: {
    term: "Прибыль",
    def: "Валовая прибыль за вычетом расходов на привлечение.",
    formula: "Прибыль = Валовая прибыль − Расходы на привлечение",
  },
  roi: {
    term: "ROI",
    def: "Во сколько раз валовая прибыль превышает затраты на привлечение.",
    formula: "ROI = Валовая прибыль / Расходы на привлечение",
  },
};

function infoBtn(key) {
  const g = GLOSSARY[key];
  if (!g) return "";
  return `<button type="button" class="info-btn" data-info-key="${key}" aria-label="Что такое «${g.term}» и как считается">?</button>`;
}

function calcFunnel(i) {
  const users = i.impressions * i.ctr;
  const leads = users * i.cr1;
  const qleads = leads * i.cr2;
  const buyers = qleads * i.cr3;
  const orders = buyers * i.retention;
  const arppu = i.avPrice * i.retention;
  const revenue = arppu * buyers;
  const acquisitionCosts = i.cpu * users;
  const grossProfit = revenue * i.margin;
  const cpo = orders > 0 ? acquisitionCosts / orders : 0;
  const arpu = users > 0 ? grossProfit / users : 0;
  const profit = grossProfit - acquisitionCosts;
  const roi = acquisitionCosts > 0 ? grossProfit / acquisitionCosts : 0;
  return {
    ...i,
    users,
    leads,
    qleads,
    buyers,
    orders,
    arppu,
    revenue,
    acquisitionCosts,
    grossProfit,
    cpo,
    arpu,
    profit,
    roi,
  };
}

/* Рычаги, для которых строится строка "+10%". CPU намеренно не
   варьируется — в исходнике он тоже был зафиксирован во всех строках
   чувствительности, включая "ВСЕ +10%". */
const LEVERS = [
  { key: "impressions", label: "Показы +10%" },
  { key: "ctr", label: "CTR +10%" },
  { key: "cr1", label: "CR1 +10%" },
  { key: "cr2", label: "CR2 +10%" },
  { key: "cr3", label: "CR3 +10%" },
  { key: "avPrice", label: "Ср. чек +10%" },
  { key: "retention", label: "Retention +10%" },
  { key: "margin", label: "Маржа +10%" },
];

function bump(inputs, keys) {
  const next = { ...inputs };
  keys.forEach((k) => {
    next[k] = next[k] * 1.1;
  });
  return next;
}

function readInputs() {
  const num = (id) => parseFloat(document.getElementById(id).value) || 0;
  return {
    impressions: num("ue-impressions"),
    ctr: num("ue-ctr") / 100,
    cr1: num("ue-cr1") / 100,
    cr2: num("ue-cr2") / 100,
    cr3: num("ue-cr3") / 100,
    avPrice: num("ue-avprice"),
    retention: num("ue-retention"),
    cpu: num("ue-cpu"),
    margin: num("ue-margin") / 100,
  };
}

function renderFunnel(r) {
  const steps = [
    ["impressions", "Показы", RUB.format(r.impressions)],
    ["users", "Users", RUB.format(r.users)],
    ["leads", "Лиды", RUB.format(r.leads)],
    ["qleads", "Квал. лиды", RUB.format(r.qleads)],
    ["buyers", "Покупатели", RUB2.format(r.buyers)],
    ["orders", "Orders", RUB2.format(r.orders)],
  ];
  document.getElementById("ue-funnel").innerHTML = steps
    .map(
      ([key, label, value]) => `
    <div class="stat-card">
      <span class="stat-card__label">${label} ${infoBtn(key)}</span>
      <span class="stat-card__value">${value}</span>
    </div>`
    )
    .join("");
}

function renderStats(r) {
  const cards = [
    ["revenue", "Выручка", RUB.format(r.revenue) + " ₽"],
    ["profit", "Прибыль", RUB.format(r.profit) + " ₽", r.profit >= 0 ? "ok" : "bad"],
    ["roi", "ROI", PCT.format(r.roi), r.roi >= 1 ? "ok" : "warn"],
    ["arppu", "ARPPU", RUB2.format(r.arppu) + " ₽"],
    ["arpu", "ARPU", RUB2.format(r.arpu) + " ₽"],
    ["cpo", "CPO", RUB2.format(r.cpo) + " ₽"],
    ["acquisitionCosts", "Расходы на привлечение", RUB.format(r.acquisitionCosts) + " ₽"],
    ["grossProfit", "Валовая прибыль", RUB.format(r.grossProfit) + " ₽"],
  ];
  document.getElementById("ue-stats").innerHTML = cards
    .map(
      ([key, label, value, tone]) => `
    <div class="stat-card${tone ? ` stat-card--${tone}` : ""}">
      <span class="stat-card__label">${label} ${infoBtn(key)}</span>
      <span class="stat-card__value">${value}</span>
    </div>`
    )
    .join("");
}

function renderTable(baselineInputs) {
  const cols = [
    { key: "impressions", label: "Показы", fmt: RUB },
    { key: "ctr", label: "CTR", fmt: PCT },
    { key: "users", label: "Users", fmt: RUB },
    { key: "cr1", label: "CR1", fmt: PCT },
    { key: "leads", label: "Лиды", fmt: RUB },
    { key: "cr2", label: "CR2", fmt: PCT },
    { key: "qleads", label: "Квал. лиды", fmt: RUB2 },
    { key: "cr3", label: "CR3", fmt: PCT },
    { key: "buyers", label: "Покупатели", fmt: RUB2 },
    { key: "retention", label: "Retention", fmt: RUB2 },
    { key: "orders", label: "Orders", fmt: RUB2 },
    { key: "avPrice", label: "Ср. чек", fmt: RUB },
    { key: "arppu", label: "ARPPU", fmt: RUB },
    { key: "cpu", label: "CPU", fmt: RUB },
    { key: "acquisitionCosts", label: "Расходы", fmt: RUB },
    { key: "cpo", label: "CPO", fmt: RUB2 },
    { key: "revenue", label: "Выручка", fmt: RUB },
    { key: "margin", label: "Маржа", fmt: PCT },
    { key: "grossProfit", label: "Вал. прибыль", fmt: RUB },
    { key: "arpu", label: "ARPU", fmt: RUB2 },
    { key: "profit", label: "Прибыль", fmt: RUB },
    { key: "roi", label: "ROI", fmt: PCT },
  ];

  const rows = [
    { label: "Базовый сценарий", data: calcFunnel(baselineInputs), isBase: true },
    ...LEVERS.map((lever) => ({
      label: lever.label,
      data: calcFunnel(bump(baselineInputs, [lever.key])),
    })),
    {
      label: "ВСЕ +10%",
      data: calcFunnel(bump(baselineInputs, LEVERS.map((l) => l.key))),
    },
  ];

  const thead = `
    <thead>
      <tr>
        <th>Сценарий</th>
        ${cols.map((c) => `<th>${c.label} ${infoBtn(c.key)}</th>`).join("")}
      </tr>
    </thead>`;

  const tbody = `
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr class="${row.isBase ? "tool__table-row--base" : ""}">
          <td class="tool__table-label">${row.label}</td>
          ${cols
            .map((c) => {
              const cellClass =
                c.key === "profit" || c.key === "roi" ? " class=\"tool__table-highlight\"" : "";
              return `<td${cellClass}>${c.fmt.format(row.data[c.key])}</td>`;
            })
            .join("")}
        </tr>`
        )
        .join("")}
    </tbody>`;

  document.getElementById("ue-table").innerHTML = thead + tbody;
}

/* Подсказки: одна плавающая карточка на всю страницу, позиционируется
   под кнопкой "?", по которой кликнули. Переоткрывается на каждый клик,
   закрывается по клику снаружи, Escape или при пересчёте формы (иначе
   после перерендера таблицы/карточек она может указывать в пустоту). */
const tip = document.getElementById("info-tip");
const tipTerm = document.getElementById("info-tip-term");
const tipDef = document.getElementById("info-tip-def");
const tipFormula = document.getElementById("info-tip-formula");

function hideTip() {
  tip.hidden = true;
  delete tip.dataset.openFor;
}

function showTip(btn) {
  const key = btn.dataset.infoKey;
  const g = GLOSSARY[key];
  if (!g) return;
  tipTerm.textContent = g.term;
  tipDef.textContent = g.def;
  tipFormula.textContent = g.formula;
  tip.hidden = false;
  tip.dataset.openFor = key;

  const rect = btn.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - tipRect.width - 12;
  left = Math.min(left, Math.max(12, maxLeft));
  const top = rect.bottom + window.scrollY + 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/* pointerdown, не click: срабатывает раньше и надёжнее закрывает попап
   при любом следующем взаимодействии, включая клики внутри <label>,
   где click иногда съедается нативной пересылкой фокуса на input. */
document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest(".info-btn");
  if (btn) {
    const already = tip.dataset.openFor === btn.dataset.infoKey && !tip.hidden;
    hideTip();
    if (!already) showTip(btn);
    e.preventDefault();
    return;
  }
  if (!tip.hidden) hideTip();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideTip();
});

function update() {
  hideTip();
  const inputs = readInputs();
  const result = calcFunnel(inputs);
  renderFunnel(result);
  renderStats(result);
  renderTable(inputs);
}

document.querySelectorAll("label[data-info]").forEach((label) => {
  label.insertAdjacentHTML("beforeend", " " + infoBtn(label.dataset.info));
});

document.getElementById("ue-form").addEventListener("input", update);
update();
