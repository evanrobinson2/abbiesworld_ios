#!/usr/bin/env python3
"""Build sprite sheet and animated GIF from normalized frames."""

from pathlib import Path
from PIL import Image

NORMALIZED_DIR = Path(__file__).parent.parent / "normalized"
OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

FRAME_ORDER = [
    "walk-01-contact-a",
    "walk-02-down-a", 
    "walk-03-passing-a",
    "walk-04-up-a",
    "walk-05-contact-b",
    "walk-06-down-b",
    "walk-07-passing-b",
    "walk-08-up-b"
]


def load_frames():
    """Load all normalized frames in animation order."""
    frames = []
    for name in FRAME_ORDER:
        path = NORMALIZED_DIR / f"{name}-normalized.png"
        if path.exists():
            frames.append(Image.open(path))
        else:
            print(f"Warning: Missing frame {path}")
    return frames


def create_sprite_sheet(frames, output_path):
    """Create a horizontal sprite sheet from frames."""
    if not frames:
        return
    
    width = frames[0].width
    height = frames[0].height
    
    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * width, 0))
    
    sheet.save(output_path, "PNG")
    print(f"Sprite sheet saved: {output_path}")
    print(f"  Size: {sheet.width} x {sheet.height}")
    print(f"  Frames: {len(frames)} @ {width}x{height} each")


def create_animated_gif(frames, output_path, frame_duration=100):
    """Create an animated GIF from frames."""
    if not frames:
        return
    
    frames_rgb = []
    for frame in frames:
        bg = Image.new("RGBA", frame.size, (240, 240, 240, 255))
        bg.paste(frame, mask=frame.split()[3])
        frames_rgb.append(bg.convert("P", palette=Image.ADAPTIVE))
    
    frames_rgb[0].save(
        output_path,
        save_all=True,
        append_images=frames_rgb[1:],
        duration=frame_duration,
        loop=0
    )
    print(f"Animated GIF saved: {output_path}")
    print(f"  Frame duration: {frame_duration}ms")
    print(f"  Total frames: {len(frames)}")


def create_frame_strip_for_web(frames, output_path):
    """Create a visual strip showing all frames with labels."""
    if not frames:
        return
    
    frame_width = frames[0].width
    frame_height = frames[0].height
    label_height = 30
    
    labels = ["1: Contact A", "2: Down A", "3: Passing A", "4: Up A", 
              "5: Contact B", "6: Down B", "7: Passing B", "8: Up B"]
    
    strip = Image.new("RGBA", (frame_width * len(frames), frame_height), (255, 255, 255, 255))
    
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * frame_width, 0), frame)
    
    strip.save(output_path, "PNG")
    print(f"Frame strip saved: {output_path}")


def main():
    print("Loading normalized frames...")
    frames = load_frames()
    
    if not frames:
        print("No frames found!")
        return
    
    print(f"Loaded {len(frames)} frames\n")
    
    print("Creating sprite sheet...")
    create_sprite_sheet(frames, OUTPUT_DIR / "walk-cycle-spritesheet.png")
    print()
    
    print("Creating animated GIF (normal speed)...")
    create_animated_gif(frames, OUTPUT_DIR / "walk-cycle.gif", frame_duration=100)
    print()
    
    print("Creating slow GIF (for analysis)...")
    create_animated_gif(frames, OUTPUT_DIR / "walk-cycle-slow.gif", frame_duration=250)
    print()
    
    print("Creating frame strip...")
    create_frame_strip_for_web(frames, OUTPUT_DIR / "walk-cycle-strip.png")
    print()
    
    print("Animation build complete!")


if __name__ == "__main__":
    main()
