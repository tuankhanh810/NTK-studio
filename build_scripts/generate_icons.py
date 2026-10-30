import os
from PIL import Image, ImageDraw

def create_ntk_icon():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer rounded rectangle
    # Draw dark rounded rectangle with gradient effect
    bg_color = (11, 17, 30, 255)
    border_color = (56, 189, 248, 255)
    
    pad = 28
    radius = 96
    
    # Outer border
    draw.rounded_rectangle(
        [pad - 6, pad - 6, size - pad + 6, size - pad + 6],
        radius=radius + 6,
        fill=border_color
    )
    # Inner background
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=bg_color
    )

    # Stylized N (Cyan & White)
    cyan = (56, 189, 248, 255)
    white = (255, 255, 255, 255)
    purple = (192, 132, 252, 255)
    deep_purple = (168, 85, 247, 255)

    # Left stem of N
    draw.rounded_rectangle([132, 136, 180, 376], radius=8, fill=white)
    
    # Diagonal of N
    draw.polygon([(172, 136), (222, 136), (312, 376), (262, 376)], fill=cyan)
    
    # Right stem of N / spine of K
    draw.rounded_rectangle([264, 136, 312, 376], radius=8, fill=cyan)

    # Upper branch of K
    draw.polygon([(292, 272), (382, 144), (436, 144), (332, 284)], fill=purple)

    # Lower branch of K
    draw.polygon([(314, 260), (436, 368), (380, 376), (276, 288)], fill=deep_purple)

    # Glowing node circle
    draw.ellipse([304, 264, 328, 288], fill=white)
    draw.ellipse([310, 270, 322, 282], fill=cyan)

    # Save PNG
    public_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
    build_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
    os.makedirs(public_dir, exist_ok=True)
    os.makedirs(build_dir, exist_ok=True)

    png_path = os.path.join(public_dir, "icon.png")
    img.save(png_path, "PNG")
    print(f"Saved PNG to {png_path}")

    # Save ICO with multiple sizes
    ico_path_public = os.path.join(public_dir, "icon.ico")
    ico_path_build = os.path.join(build_dir, "icon.ico")
    
    img.save(
        ico_path_public,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    img.save(
        ico_path_build,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    print(f"Saved ICO to {ico_path_public} and {ico_path_build}")

if __name__ == "__main__":
    create_ntk_icon()
