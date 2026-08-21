#!/usr/bin/env python3
"""Add elder.visitWhenQ / visitToday / visitOtherDay / visitBackdateHint to all 8 locales (backdated visit logging, 2026-08-21)."""
import json, os

KEYS = {
    "en":  {"visitWhenQ": "When was the visit?", "visitToday": "Today", "visitOtherDay": "Other day", "visitBackdateHint": "You can log visits up to 3 months back."},
    "af":  {"visitWhenQ": "Wanneer was die besoek?", "visitToday": "Vandag", "visitOtherDay": "Ander dag", "visitBackdateHint": "Jy kan besoeke tot 3 maande terug aanteken."},
    "nl":  {"visitWhenQ": "Wanneer was het bezoek?", "visitToday": "Vandaag", "visitOtherDay": "Andere dag", "visitBackdateHint": "Je kunt bezoeken tot 3 maanden terug loggen."},
    "fr":  {"visitWhenQ": "Quand a eu lieu la visite ?", "visitToday": "Aujourd'hui", "visitOtherDay": "Autre jour", "visitBackdateHint": "Vous pouvez noter des visites jusqu'à 3 mois en arrière."},
    "de":  {"visitWhenQ": "Wann war der Besuch?", "visitToday": "Heute", "visitOtherDay": "Anderer Tag", "visitBackdateHint": "Besuche können bis zu 3 Monate rückwirkend eingetragen werden."},
    "es":  {"visitWhenQ": "¿Cuándo fue la visita?", "visitToday": "Hoy", "visitOtherDay": "Otro día", "visitBackdateHint": "Puedes registrar visitas de hasta 3 meses atrás."},
    "pt":  {"visitWhenQ": "Quando foi a visita?", "visitToday": "Hoje", "visitOtherDay": "Outro dia", "visitBackdateHint": "Você pode registrar visitas de até 3 meses atrás."},
    "fil": {"visitWhenQ": "Kailan ang dalaw?", "visitToday": "Ngayon", "visitOtherDay": "Ibang araw", "visitBackdateHint": "Maaari kang mag-log ng dalaw hanggang 3 buwan pabalik."},
}

base = os.path.join(os.path.dirname(__file__), "..", "client", "src", "locales")
for lang, kv in KEYS.items():
    p = os.path.join(base, f"{lang}.json")
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
    d.setdefault("elder", {}).update(kv)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(lang, "ok")
