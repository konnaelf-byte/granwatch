#!/usr/bin/env python3
"""Add elder.birthdayTip to all 8 locales (2026-08-20)."""
import json, io, os

K = {
  "en": "Tip: tap the year at the top of the calendar to jump straight to the right year.",
  "af": "Wenk: tik op die jaartal boaan die kalender om direk na die regte jaar te spring.",
  "nl": "Tip: tik op het jaartal bovenaan de kalender om direct naar het juiste jaar te springen.",
  "fr": "Astuce : touchez l'année en haut du calendrier pour aller directement à la bonne année.",
  "de": "Tipp: Tippen Sie oben im Kalender auf die Jahreszahl, um direkt zum richtigen Jahr zu springen.",
  "es": "Consejo: toca el año en la parte superior del calendario para ir directamente al año correcto.",
  "pt": "Dica: toque no ano no topo do calendário para ir direto ao ano certo.",
  "fil": "Tip: i-tap ang taon sa itaas ng kalendaryo para direktang tumalon sa tamang taon.",
}

base = os.path.join(os.path.dirname(__file__), "..", "client", "src", "locales")
for lang, text in K.items():
    p = os.path.join(base, f"{lang}.json")
    with io.open(p, encoding="utf-8") as f:
        data = json.load(f)
    assert "elder" in data, f"{lang}: no elder section"
    data["elder"]["birthdayTip"] = text
    with io.open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(lang, "ok")
