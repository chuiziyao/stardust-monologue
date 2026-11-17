"""Curate QA stills into docs/img JPGs and build the poster."""
from PIL import Image
import os
os.makedirs("docs/img", exist_ok=True)
scenes = [
    ("s0-title", "00-monologue"), ("s1-bang", "01-singularity"),
    ("s2-eq", "02-laws"), ("s3-star", "03-stardust"), ("s4-helix", "04-life"),
    ("s5-neural", "05-mind"), ("s6-tokens", "06-language"),
    ("s7-candle", "07-meaning"), ("s8-credits", "08-echo"),
]
for src, dst in scenes:
    im = Image.open(f"samples/{src}.png").convert("RGB")
    im.save(f"docs/img/{dst}.jpg", quality=90, optimize=True)
    print("docs/img/" + dst + ".jpg")
# poster: the stardust forge (warm, iconic)
im = Image.open("samples/s3-star.png").convert("RGB")
im.save("海报.jpg", quality=92, optimize=True)
print("海报.jpg", im.size)
