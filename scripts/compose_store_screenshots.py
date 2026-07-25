"""Compose real article and side-panel captures into 1280x800 store screenshots."""

from pathlib import Path
import shutil

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT / "assets" / "store" / "screenshots"
RAW_DIR = SCREENSHOT_DIR / ".raw"
LOCALES = ("en", "zh_TW", "zh_CN", "ja", "ko")


def compose(article_path: Path, panel_path: Path, output_path: Path) -> None:
    article = Image.open(article_path).convert("RGB")
    panel = Image.open(panel_path).convert("RGB")
    if article.size != (860, 800):
        raise ValueError(f"Unexpected article size: {article.size}")
    if panel.size != (420, 800):
        raise ValueError(f"Unexpected panel size: {panel.size}")

    canvas = Image.new("RGB", (1280, 800), "#EAF0F8")
    canvas.paste(article, (0, 0))
    canvas.paste(panel, (860, 0))
    draw = ImageDraw.Draw(canvas)
    draw.line((859, 0, 859, 800), fill="#334155", width=2)
    canvas.save(output_path, optimize=True)


def main() -> None:
    for locale in LOCALES:
        source = RAW_DIR / locale
        destination = SCREENSHOT_DIR / locale
        destination.mkdir(parents=True, exist_ok=True)
        compose(
            source / "article.png",
            source / "onboarding-panel.png",
            destination / "01-onboarding-1280x800.png",
        )
        compose(
            source / "article.png",
            source / "reading-panel.png",
            destination / "02-reading-assistant-1280x800.png",
        )
    shutil.rmtree(RAW_DIR)


if __name__ == "__main__":
    main()
