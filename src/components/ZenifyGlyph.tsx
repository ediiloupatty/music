// The Zenify brand glyph: five equalizer bars. Used wherever the app logo mark
// appears inline (mobile header, logged-out avatar, etc.). The full squircle
// logo lives in /public/logo.svg + /public/logo.png; this is just the bars so it
// can sit inside the existing gradient circles. Kept in sync with logo.svg.
export default function ZenifyGlyph({
  size = 20,
  fill = "white",
  className,
}: {
  size?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} className={className}>
      <rect x="2.5" y="8" width="2.6" height="8" rx="1.3" />
      <rect x="6.6" y="5.5" width="2.6" height="13" rx="1.3" />
      <rect x="10.7" y="3.5" width="2.6" height="17" rx="1.3" />
      <rect x="14.8" y="6.5" width="2.6" height="11" rx="1.3" />
      <rect x="18.9" y="8.5" width="2.6" height="7" rx="1.3" />
    </svg>
  );
}
