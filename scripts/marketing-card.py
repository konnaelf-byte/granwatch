#!/usr/bin/env python3
"""GranWatch Marketing Engine — brand-true social card renderer (PIL + Inter).

Usage (from the project root):
  python3 scripts/marketing-card.py --headline "For those who actually care." \
      --sub "See when Gran was last visited. She doesn't need a phone." \
      --out "Marketing Engine/media/2026-09-08.png" [--size square|portrait] [--kicker "GranWatch"]

Follows BRAND.md v2: cream #FCF8F1, ink #1D140D, primary red #BA2D1F, muted #6E6459,
status green #22C55E base bar, mascot = client/public/icon-512.png (THE only gran),
Inter ExtraBold headline / Medium body, wordmark in single ink colour.
"""
import argparse, os, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "Marketing Engine", "fonts")
ICON = os.path.join(ROOT, "client", "public", "icon-512.png")
HEART = os.path.join(ROOT, "Brand Assets", "granwatch-heart-2048.png")

CREAM, INK, RED, MUTED, GREEN, PANEL = "#FCF8F1", "#1D140D", "#BA2D1F", "#6E6459", "#22C55E", "#F6EDE0"

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, f"Inter-{name}.ttf"), size)

def rounded_icon(size, radius_ratio=0.22):
    icon = Image.open(ICON).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    icon.putalpha(mask)
    return icon

def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_w: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def render(headline, sub, out, size="portrait", kicker="GranWatch", footer="Keep Gran in the green.", cta="granwatch.app"):
    W, H = (1080, 1350) if size == "portrait" else (1080, 1080)
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    pad = 84

    # header: mascot + wordmark
    icon = rounded_icon(120)
    img.paste(icon, (pad, pad), icon)
    d.text((pad + 120 + 28, pad + 26), kicker, font=font("ExtraBold", 56), fill=INK)

    # headline
    y = pad + 120 + 96
    hf = font("ExtraBold", 92 if size == "portrait" else 84)
    lines = wrap(d, headline, hf, W - 2 * pad)
    while len(lines) > 4 and hf.size > 60:
        hf = font("ExtraBold", hf.size - 6); lines = wrap(d, headline, hf, W - 2 * pad)
    for ln in lines:
        d.text((pad, y), ln, font=hf, fill=INK); y += int(hf.size * 1.12)

    # sub
    if sub:
        y += 28
        sf = font("Medium", 44)
        for ln in wrap(d, sub, sf, W - 2 * pad):
            d.text((pad, y), ln, font=sf, fill=MUTED); y += int(sf.size * 1.35)

    # heart accent — the official brand heart asset
    hy = y + 36
    if os.path.exists(HEART):
        heart = Image.open(HEART).convert("RGBA").resize((44, 44), Image.LANCZOS)
        img.paste(heart, (pad, hy), heart)
    else:
        d.ellipse([pad, hy, pad + 22, hy + 22], fill=RED)

    # portrait: the mascot, large, fills the lower half (THE only gran)
    if size == "portrait":
        big = 460
        top = hy + 90
        avail = (H - 18 - 130) - top
        big = min(big, avail)
        if big > 200:
            m = rounded_icon(big, 0.2)
            img.paste(m, (W - pad - big, H - 18 - 140 - big), m)

    # footer + green base bar
    bar_h = 18
    d.rectangle([0, H - bar_h, W, H], fill=GREEN)
    ff = font("Bold", 34)
    d.text((pad, H - bar_h - 110), footer, font=ff, fill=INK)
    cf = font("Medium", 32)
    d.text((W - pad - d.textlength(cta, font=cf), H - bar_h - 106), cta, font=cf, fill=RED)

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--headline", required=True)
    ap.add_argument("--sub", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--size", default="portrait", choices=["portrait", "square"])
    ap.add_argument("--kicker", default="GranWatch")
    ap.add_argument("--footer", default="Keep Gran in the green.")
    ap.add_argument("--cta", default="granwatch.app")
    a = ap.parse_args()
    print(render(a.headline, a.sub, a.out, a.size, a.kicker, a.footer, a.cta))
