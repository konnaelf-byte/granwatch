#!/bin/bash
set -e
cd "$(dirname "$0")/.."
python3 scripts/marketing-card.py --headline "She doesn't need a phone." --sub "One shared ring shows the whole family when Gran was last visited." --out "Marketing Engine/media/2026-09-08-tue-how-it-works.png" --size portrait
python3 scripts/marketing-card.py --headline "For those who actually care." --sub "See when Gran was last visited. She doesn't need a phone." --out "Marketing Engine/media/2026-09-09-wed-badge.png" --size portrait
python3 scripts/marketing-card.py --headline "How often should you visit your elderly parents?" --sub "An honest answer, from a family who asked the same thing at 11pm." --out "Marketing Engine/media/2026-09-10-thu-guide.png" --size portrait
python3 scripts/marketing-card.py --headline "This weekend, go." --sub "Take the kids. Take a cake. Turn it green." --out "Marketing Engine/media/2026-09-11-fri-weekend.png" --size portrait
python3 scripts/marketing-card.py --headline "Who's visiting Gran this week?" --sub "Decide it on Sunday, not on Friday." --out "Marketing Engine/media/2026-09-13-sun-family-prompt.png" --size portrait
python3 scripts/marketing-card.py --headline "Loneliness is not a soft problem." --sub "The WHO links it to around 100 deaths every hour worldwide." --out "Marketing Engine/media/2026-09-14-mon-mission-stat.png" --size portrait
echo rendered
