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
    ["Показы", RUB.format(r.impressions)],
    ["Users", RUB.format(r.users)],
    ["Лиды", RUB.format(r.leads)],
    ["Квал. лиды", RUB.format(r.qleads)],
    ["Покупатели", RUB2.format(r.buyers)],
    ["Orders", RUB2.format(r.orders)],
  ];
  document.getElementById("ue-funnel").innerHTML = `
    <div class="funnel">
      ${steps
        .map(
          ([label, value], idx) => `
        <div class="funnel__group">
          ${idx > 0 ? '<span class="funnel__arrow" aria-hidden="true"></span>' : ""}
          <div class="funnel__step tool__funnel-step">
            <span class="tool__funnel-value">${value}</span>
            <span class="tool__funnel-label">${label}</span>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;
}

function renderStats(r) {
  const cards = [
    ["Выручка", RUB.format(r.revenue) + " ₽"],
    ["Прибыль", RUB.format(r.profit) + " ₽", r.profit >= 0 ? "ok" : "bad"],
    ["ROI", PCT.format(r.roi), r.roi >= 1 ? "ok" : "warn"],
    ["ARPPU", RUB2.format(r.arppu) + " ₽"],
    ["ARPU", RUB2.format(r.arpu) + " ₽"],
    ["CPO", RUB2.format(r.cpo) + " ₽"],
    ["Расходы на привлечение", RUB.format(r.acquisitionCosts) + " ₽"],
    ["Валовая прибыль", RUB.format(r.grossProfit) + " ₽"],
  ];
  document.getElementById("ue-stats").innerHTML = cards
    .map(
      ([label, value, tone]) => `
    <div class="stat-card${tone ? ` stat-card--${tone}` : ""}">
      <span class="stat-card__label">${label}</span>
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
        ${cols.map((c) => `<th>${c.label}</th>`).join("")}
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

function update() {
  const inputs = readInputs();
  const result = calcFunnel(inputs);
  renderFunnel(result);
  renderStats(result);
  renderTable(inputs);
}

document.getElementById("ue-form").addEventListener("input", update);
update();
