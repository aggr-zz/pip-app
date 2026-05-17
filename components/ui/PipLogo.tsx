interface PipLogoProps {
  size?: number;
  color?: string;
}

/**
 * Логотип pip. Word-mark "pip" с золотой монетой вместо точки над "i".
 * Использует CSS-переменные из tokens.css, поэтому работает в server-компонентах.
 */
export function PipLogo({ size = 64, color }: PipLogoProps) {
  // Координаты coin зависят от размера (соотношение из дизайн-системы)
  const coinSize = Math.round(size * 0.187);
  const coinTop = Math.round(size * 0.115);

  return (
    <span
      className="lv"
      style={{ fontSize: size, color, lineHeight: 0.9 }}
      aria-label="pip"
    >
      p
      <span className="lv__i">
        ı
        <span
          className="lv__coin"
          style={{ width: coinSize, height: coinSize, top: coinTop }}
        />
      </span>
      p
    </span>
  );
}
