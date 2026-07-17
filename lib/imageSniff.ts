/**
 * Определение типа изображения по СОДЕРЖИМОМУ (magic bytes).
 *
 * Зачем: `file.type` и `file.name` приходят от клиента и подделываются. Раньше
 * загрузка аватара верила им обоим — и клиентский `file.type` уходил в Storage
 * как contentType, а расширение бралось из имени файла. В публичном бакете это
 * означало «положи произвольные байты и назови их как хочешь».
 *
 * Проверяем только те форматы, которые реально принимаем.
 */

export type SniffedImage = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: 'png' };
  }
  // WebP: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
