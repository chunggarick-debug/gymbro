# 產生 GymBro.AI App 圖示（Pillow）
from PIL import Image, ImageDraw

def make_icon(size, path):
    S = 512
    img = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(img)
    # 背景漸層（深藍）
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(11 + 10 * t), int(18 + 16 * t), int(32 + 22 * t)))

    cyan = (34, 211, 238)
    dark = (8, 20, 40)

    # 啞鈴槓
    d.rounded_rectangle([72, 240, 440, 272], radius=16, fill=cyan)
    # 握把
    d.rounded_rectangle([236, 230, 276, 282], radius=8, fill=dark)
    # 鈴片（左 2 + 右 2）
    for x in [96, 160, 352, 416]:
        d.rounded_rectangle([x, 196, x + 40, 316], radius=12, fill=dark, outline=cyan, width=6)

    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, 'PNG')
    print('saved', path)

make_icon(192, 'icons/icon-192.png')
make_icon(512, 'icons/icon-512.png')
print('done')
