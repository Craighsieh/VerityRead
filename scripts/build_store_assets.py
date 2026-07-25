"""Build deterministic Chrome Web Store assets from the approved brand mark."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
MARK_PATH = ROOT / "assets" / "brand" / "verityread-mark.png"
ICON_DIR = ROOT / "icons"
STORE_DIR = ROOT / "assets" / "store"


def vertical_gradient(size: tuple[int, int], start: str, end: str) -> Image.Image:
    width, height = size
    top = Image.new("RGB", (1, 1), start).getpixel((0, 0))
    bottom = Image.new("RGB", (1, 1), end).getpixel((0, 0))
    gradient = Image.new("RGB", size)
    pixels = gradient.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            round(top[channel] * (1 - ratio) + bottom[channel] * ratio)
            for channel in range(3)
        )
        for x in range(width):
            pixels[x, y] = color
    return gradient.convert("RGBA")


def add_soft_accents(canvas: Image.Image) -> None:
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = canvas.size
    draw.ellipse(
        (width * 0.64, -height * 0.45, width * 1.15, height * 0.6),
        fill=(18, 210, 200, 75),
    )
    draw.ellipse(
        (-width * 0.2, height * 0.55, width * 0.35, height * 1.35),
        fill=(255, 178, 36, 48),
    )
    canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(width * 0.05)))


def paste_centered(canvas: Image.Image, mark: Image.Image, target_height: int) -> None:
    ratio = target_height / mark.height
    target_width = round(mark.width * ratio)
    resized = mark.resize((target_width, target_height), Image.Resampling.LANCZOS)
    left = (canvas.width - resized.width) // 2
    top = (canvas.height - resized.height) // 2
    canvas.alpha_composite(resized, (left, top))


def save_icon(mark: Image.Image, size: int, path: Path) -> None:
    icon = mark.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(path, optimize=True)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    mark = Image.open(MARK_PATH).convert("RGBA")

    for size in (16, 48, 128):
        save_icon(mark, size, ICON_DIR / f"icon{size}.png")
    save_icon(mark, 128, STORE_DIR / "icon-128.png")

    small = vertical_gradient((440, 280), "#111B4D", "#124B69")
    add_soft_accents(small)
    paste_centered(small, mark, 214)
    small.convert("RGB").save(STORE_DIR / "promo-small-440x280.jpg", quality=94)

    marquee = vertical_gradient((1400, 560), "#111B4D", "#0C526B")
    add_soft_accents(marquee)
    paste_centered(marquee, mark, 430)
    marquee.convert("RGB").save(
        STORE_DIR / "promo-marquee-1400x560.jpg", quality=94
    )


if __name__ == "__main__":
    main()
