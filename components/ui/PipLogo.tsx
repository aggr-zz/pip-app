interface PipLogoProps {
  size?: number;
  color?: string;
  /** Если указан — лого рендерится как <a href={href}> */
  href?: string;
}

/**
 * Логотип pip. Word-mark "pip" с золотой монетой вместо точки над "i".
 * Использует CSS-переменные из tokens.css, поэтому работает в server-компонентах.
 * Если передать href — оборачивается в <a>, тап ведёт на нужный роут.
 */
export function PipLogo({ size = 64, color, href }: PipLogoProps) {
  const coinSize = Math.round(size * 0.187);
  const coinTop  = Math.round(size * 0.115);

  const inner = (
    <>
      p
      <span className="lv__i">
        ı
        <span className="lv__coin" style={{ width: coinSize, height: coinSize, top: coinTop }} />
      </span>
      p
    </>
  );

  const shared = {
    className: 'lv',
    style: { fontSize: size, color, lineHeight: 0.9 } as React.CSSProperties,
    'aria-label': 'pip',
  };

  if (href) {
    return (
      <a
        href={href}
        {...shared}
        style={{ ...shared.style, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}
      >
        {inner}
      </a>
    );
  }

  return <span {...shared}>{inner}</span>;
}
