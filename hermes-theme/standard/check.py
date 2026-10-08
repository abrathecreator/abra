"""Проверки ABRAXUS STANDARD.

Запуск интерпретатором из установки Hermes — там уже есть ruamel.yaml и rich,
которыми Hermes сам читает и рисует скин, своих зависимостей у проверки нет:

    ~/.hermes/hermes-agent/venv/bin/python ~/Documents/abrasite/hermes-theme/standard/check.py

Другой путь к Hermes — через HERMES_AGENT_DIR. Рабочий ~/.hermes не трогается:
скин грузится настоящим skin_engine из временного HERMES_HOME.
"""

import json
import os
import re
import shutil
import sys
import tempfile
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SKIN_FILE = HERE / "abraxus.yaml"
TOKENS_FILE = HERE.parent / "tokens.json"
HERMES = Path(os.environ.get("HERMES_AGENT_DIR", Path.home() / ".hermes" / "hermes-agent"))

failures: list[str] = []
warnings: list[str] = []


def check(ok: bool, msg: str) -> None:
    print(("  ok   " if ok else "  FAIL ") + msg)
    if not ok:
        failures.append(msg)


def warn(msg: str) -> None:
    print("  warn " + msg)
    warnings.append(msg)


def section(title: str) -> None:
    print(f"\n── {title}")


# ── Цвет ────────────────────────────────────────────────────────────

def rgb(hex_color: str) -> list[int]:
    h = hex_color.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def luminance(hex_color: str) -> float:
    def channel(v: int) -> float:
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(v) for v in rgb(hex_color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def mix(fg: str, bg: str, alpha: float) -> list[float]:
    f, b = rgb(fg), rgb(bg)
    return [b[i] + (f[i] - b[i]) * alpha for i in range(3)]


# ── 1. Токены ───────────────────────────────────────────────────────

section("Токены: tokens.json ↔ сайт")
tokens_raw = json.loads(TOKENS_FILE.read_text(encoding="utf-8"))
tokens = {name: t["value"].upper() for group in ("base", "derived") for name, t in tokens_raw[group].items()}

for name, t in tokens_raw["base"].items():
    source = (REPO / t["source"]).read_text(encoding="utf-8")
    check(t["match"] in source, f"base {name} {t['value']} стоит в {t['source']}")

tokens_css = (REPO / "abra-tokens.css").read_text(encoding="utf-8")
for name, t in tokens_raw["derived"].items():
    fg, bg, alpha = t["mix"]
    expected = mix(tokens[fg], tokens[bg], alpha)
    drift = max(abs(e - v) for e, v in zip(expected, rgb(t["value"])))
    # ±1 на канал: в abra-tokens.css композиты округлены вручную
    check(drift <= 1, f"derived {name} {t['value']} = {fg} поверх {bg} × {alpha}")
    if t.get("match"):
        check(t["match"] in tokens_css, f"derived {name} совпадает с abra-tokens.css")

# ── 2. Структура YAML ───────────────────────────────────────────────

section("Структура YAML")
sys.path.insert(0, str(HERMES))
try:
    import hermes_yaml
except ImportError:
    sys.exit(f"Не найден Hermes в {HERMES}. Укажи путь: HERMES_AGENT_DIR=...")

text = SKIN_FILE.read_text(encoding="utf-8")
skin = hermes_yaml.safe_load(text)

# Документированные ключи: website/docs/user-guide/features/skins.md
TOP_KEYS = {"name", "description", "colors", "light_colors", "dark_colors", "spinner", "branding",
            "tool_prefix", "tool_emojis", "banner_logo", "banner_hero", "customCSS"}
BRANDING_KEYS = {"agent_name", "welcome", "goodbye", "response_label", "prompt_symbol", "help_header"}
SPINNER_KEYS = {"waiting_faces", "thinking_faces", "thinking_verbs", "wings"}
# Полный список цветовых токенов — канонический контракт apps/shared/src/skin.ts
shared_skin = (HERMES / "apps/shared/src/skin.ts").read_text(encoding="utf-8")
color_block = re.search(r"SKIN_COLOR_TOKENS = \[(.*?)\] as const", shared_skin, re.S).group(1)
COLOR_KEYS = set(re.findall(r"'([a-z_]+)'", color_block))

check(isinstance(skin, dict), "файл — YAML-словарь")
check(set(skin) <= TOP_KEYS, f"только документированные ключи верхнего уровня: {sorted(set(skin) - TOP_KEYS) or 'лишних нет'}")
check("customCSS" not in skin, "customCSS нет (правило STANDARD)")
check(SKIN_FILE.stem == skin.get("name"), "имя файла совпадает с name")
check(re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}", skin["name"]) is not None,
      "name проходит фильтр Desktop (SKIN_FILE_NAME_RE)")
check(len(skin.get("description", "")) <= 128, "description ≤ 128 символов (иначе Desktop его отбросит при старте)")
check(len(text.encode()) < 256_000, "файл меньше 256 КБ (MAX_SKIN_BYTES в Desktop)")
check(set(skin["colors"]) <= COLOR_KEYS, f"только известные цветовые токены: {sorted(set(skin['colors']) - COLOR_KEYS) or 'лишних нет'}")
missing = sorted(COLOR_KEYS - set(skin["colors"]))
check(not missing, f"заданы все {len(COLOR_KEYS)} цветовых токенов{': нет ' + ', '.join(missing) if missing else ''}")
check(set(skin["branding"]) == BRANDING_KEYS, "заданы все 6 ключей branding")
check(set(skin["spinner"]) == SPINNER_KEYS, "заданы все 4 ключа spinner")
check(all(isinstance(p, list) and len(p) == 2 for p in skin["spinner"]["wings"]), "wings — пары [левый, правый]")
check(all(re.fullmatch(r"#[0-9A-Fa-f]{6}", v) for v in skin["colors"].values()), "все цвета — #RRGGBB без альфы")

# ── 3. Ссылки на токены ─────────────────────────────────────────────

section("Цвета ↔ tokens.json")
token_values = set(tokens.values())
for line in text.splitlines():
    m = re.match(r'\s+([a-z_]+): "(#[0-9A-Fa-f]{6})"\s+# token: ([a-z-]+)', line)
    if m:
        key, value, token = m.groups()
        if tokens.get(token) != value.upper():
            check(False, f"{key}: {value} ≠ token {token} {tokens.get(token)}")
referenced = re.findall(r'^\s+([a-z_]+): "#', text, re.M)
annotated = re.findall(r'^\s+([a-z_]+): "#[0-9A-Fa-f]{6}"\s+# token: ', text, re.M)
check(sorted(referenced) == sorted(annotated), f"у всех {len(referenced)} цветов есть «# token:» и значение совпадает")
markup_hex = set(h.upper() for h in re.findall(r"\[(?:bold )?(?:dim )?(#[0-9A-Fa-f]{6})\]", skin["banner_logo"] + skin["banner_hero"]))
check(markup_hex <= token_values, f"цвета в логотипе и знаке — из токенов: {sorted(markup_hex)}")

# ── 4. Настоящий движок Hermes ──────────────────────────────────────

section("Загрузка настоящим skin_engine (временный HERMES_HOME)")
tmp_home = Path(tempfile.mkdtemp(prefix="abraxus-check-"))
try:
    (tmp_home / "skins").mkdir()
    shutil.copy(SKIN_FILE, tmp_home / "skins" / SKIN_FILE.name)
    os.environ["HERMES_HOME"] = str(tmp_home)
    from hermes_cli import skin_engine
    names = {s["name"]: s["source"] for s in skin_engine.list_skins()}
    check(names.get("abraxus") == "user", "skin_engine видит abraxus как пользовательский скин")
    loaded = skin_engine.load_skin("abraxus")
    check(loaded.name == "abraxus" and loaded.get_branding("agent_name") == "ABRAXUS",
          "load_skin вернул наш скин, а не откат на default")
    check(all(loaded.colors[k] == v for k, v in skin["colors"].items()), "все цвета дошли до SkinConfig без подмены")
    check(loaded.custom_css == "", "custom_css пуст")
    check(len(loaded.get_spinner_wings()) == len(skin["spinner"]["wings"]), "крылья спиннера разобраны движком")
    skin_engine.set_active_skin("abraxus")
    styles = skin_engine.get_prompt_toolkit_style_overrides()
    check(len(styles) > 40 and all("#" in s or s in ("", "{dim} italic") for s in styles.values() if s),
          f"стили prompt_toolkit для CLI построены ({len(styles)} классов)")
    check(skin_engine.get_active_prompt_symbol() == "› ", "символ приглашения: «› »")
finally:
    shutil.rmtree(tmp_home, ignore_errors=True)

# ── 5. Контрасты (WCAG) ─────────────────────────────────────────────

section("Контраст: текст ≥ 4,5:1, элементы управления ≥ 3:1")
c = {k: v.upper() for k, v in skin["colors"].items()}
PAIRS = [  # (что, цвет, фон, порог)
    ("текст на фоне", c["ui_text"], c["background"], 4.5),
    ("заголовки на фоне", c["ui_primary"], c["background"], 4.5),
    ("второстепенный текст", c["banner_dim"], c["background"], 4.5),
    ("медь на фоне", c["ui_accent"], c["background"], 4.5),
    ("медь на bg-warm (сайдбар Desktop)", c["ui_accent"], tokens["bg-warm"], 4.5),
    ("строки кода (accent-tint)", c["syntax_string"], c["background"], 4.5),
    ("успех", c["ui_ok"], c["background"], 4.5),
    ("предупреждение", c["ui_warn"], c["background"], 4.5),
    ("ошибка", c["ui_error"], c["background"], 4.5),
    ("текст статус-бара", c["status_bar_text"], c["status_bar_bg"], 4.5),
    ("приглушённый в статус-баре", c["status_bar_dim"], c["status_bar_bg"], 4.5),
    ("медь в статус-баре", c["status_bar_strong"], c["status_bar_bg"], 4.5),
    ("бейдж сессии CLI (фон bg-warm на меди)", c["status_bar_bg"], c["status_bar_strong"], 4.5),
    ("ошибка в статус-баре", c["status_bar_critical"], c["status_bar_bg"], 4.5),
    ("текст меню автодополнения", c["banner_text"], c["completion_menu_bg"], 4.5),
    ("приглушённый в меню", c["banner_dim"], c["completion_menu_meta_bg"], 3.0),
    ("активная строка меню", c["banner_title"], c["completion_menu_current_bg"], 4.5),
    ("текст в выделении", c["ui_text"], c["selection_bg"], 4.5),
    ("diff +: слово на заливке", c["diff_added_word"], c["diff_added"], 4.5),
    ("diff −: слово на заливке", c["diff_removed_word"], c["diff_removed"], 4.5),
    ("рамка баннера / линия ввода", c["banner_border"], c["background"], 3.0),
]
for what, fg, bg, need in PAIRS:
    ratio = contrast(fg, bg)
    check(ratio >= need, f"{what}: {fg} / {bg} = {ratio:.2f}:1 (нужно {need})")
ratio = contrast(c["ui_border"], c["background"])
print(f"  info ui_border {c['ui_border']} = {ratio:.2f}:1 — декоративная линия, как --border-surface на сайте")

# ── 6. Терминальная совместимость ───────────────────────────────────

section("Терминалы: ширина символов, разметка, размеры")


def ambiguous(s: str) -> list[str]:
    # Буквы не считаем: кириллица формально «A», но весь русский интерфейс Hermes
    # на ней, и терминалы с нею справляются. Опасны символы-рисунки.
    return sorted({ch for ch in s if unicodedata.east_asian_width(ch) in ("A", "W", "F")
                   and not unicodedata.category(ch).startswith("L")})


short = {
    "prompt_symbol": skin["branding"]["prompt_symbol"],
    "response_label": skin["branding"]["response_label"],
    "help_header": skin["branding"]["help_header"],
    "goodbye": skin["branding"]["goodbye"],
    "tool_prefix": skin["tool_prefix"],
    "spinner": "".join(skin["spinner"]["waiting_faces"] + skin["spinner"]["thinking_faces"]
                       + [x for pair in skin["spinner"]["wings"] for x in pair]),
}
for key, value in short.items():
    bad = ambiguous(value)
    check(not bad, f"{key}: только узкие символы (N/Na){'' if not bad else ' — неоднозначные: ' + ''.join(bad)}")
check(skin["branding"]["prompt_symbol"].strip() == skin["branding"]["prompt_symbol"], "prompt_symbol без пробелов (пробел Hermes добавит сам)")
for key in ("agent_name", "welcome"):
    bad = ambiguous(skin["branding"][key])
    if bad:
        warn(f"{key}: неоднозначные по ширине символы {''.join(bad)} — в CJK-терминале займут две клетки")
    else:
        check(True, f"{key}: только узкие символы")

TUI_LINE = re.compile(r"\[(?:bold\s+)?(?:dim\s+)?(#[0-9a-fA-F]{3,8})\]([\s\S]*?)(\[/\])")
for key, limit in (("banner_logo", 93), ("banner_hero", 30)):
    lines = [ln for ln in skin[key].split("\n") if ln.strip()]
    one_span = all(len(TUI_LINE.findall(ln)) == 1 and TUI_LINE.fullmatch(ln.rstrip()) for ln in lines)
    check(one_span, f"{key}: каждая строка — ровно одна группа [#hex]…[/] без текста снаружи (парсер TUI)")
    widths = [len(TUI_LINE.fullmatch(ln.rstrip()).group(2)) for ln in lines]
    check(max(widths) <= limit, f"{key}: ширина {max(widths)} ≤ {limit} колонок, {len(lines)} строк")
    allowed_ambiguous = set("█╗╔╝╚═║")  # те же блоки, что у встроенного логотипа Hermes
    stray = set(ambiguous(skin[key])) - allowed_ambiguous
    check(not stray, f"{key}: неоднозначные символы только из набора встроенного логотипа")

from rich.console import Console
from rich.text import Text
for key in ("banner_logo", "banner_hero"):
    rendered = Text.from_markup(skin[key]).plain
    expected = "\n".join(TUI_LINE.fullmatch(ln.rstrip()).group(2) if ln.strip() else ln for ln in skin[key].split("\n"))
    check(rendered == expected, f"{key}: Rich (CLI) показывает тот же текст, что парсер TUI — скобки не съедены")
console = Console(record=True, width=95, color_system="truecolor", file=open(os.devnull, "w"))
console.print(skin["banner_logo"])  # так его печатает hermes_cli/banner.py при ширине ≥ 95
printed = console.export_text()  # export_text очищает буфер — читаем один раз
check(len(printed.splitlines()) == len(skin["banner_logo"].split("\n")) and "[ .S Y S T E M   C O R E ]" in printed,
      "логотип печатается Rich в 95 колонок без переносов, подпись в скобках цела")

# ── Итог ────────────────────────────────────────────────────────────

print(f"\n{'ПРОВАЛ' if failures else 'OK'}: {len(failures)} ошибок, {len(warnings)} предупреждений")
sys.exit(1 if failures else 0)
