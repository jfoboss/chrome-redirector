"""Рисует иконки расширения (синий квадрат со стрелкой) без сторонних библиотек.

Иконка 128px — с прозрачными полями 16px, как требуют правила Chrome Web Store.
Запуск: python3 scripts/make-icons.py
"""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLUE = b'\x25\x63\xeb\xff'
WHITE = b'\xff\xff\xff\xff'
EMPTY = b'\x00\x00\x00\x00'


def pixel(fx, fy):
    r = .2  # скругление углов
    dx = max(r - fx, 0, fx - (1 - r))
    dy = max(r - fy, 0, fy - (1 - r))
    if dx * dx + dy * dy > r * r:
        return EMPTY
    shaft = .22 <= fx <= .6 and abs(fy - .5) <= .09
    head = .55 <= fx <= .8 and abs(fy - .5) <= (.8 - fx) * 1.1
    return WHITE if shaft or head else BLUE


def png(size, pad, path):
    art = size - 2 * pad
    rows = []
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            if pad <= x < size - pad and pad <= y < size - pad:
                row += pixel((x - pad + .5) / art, (y - pad + .5) / art)
            else:
                row += EMPTY
        rows.append(row)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
                     + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b''))


for size in (16, 32, 48):
    png(size, 0, ROOT / 'extension' / 'icons' / f'{size}.png')
png(128, 16, ROOT / 'extension' / 'icons' / '128.png')
