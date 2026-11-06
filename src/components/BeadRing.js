import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';

// A misbaha: n beads around a ring, a long "imam" bead and tassel at the top.
export default function BeadRing({ size, n, filled, theme }) {
  const beads = useMemo(() => {
    const R = 126, cx = 150, cy = 150, gap = 1.8;
    const step = 360 / (n + gap);
    const r = Math.max(3.2, Math.min(7.5, ((2 * Math.PI * R) / (n + gap)) * 0.34));
    return Array.from({ length: n }, (_, i) => {
      const a = ((-90 + step * (gap / 2 + 0.5 + i)) * Math.PI) / 180;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r };
    });
  }, [n]);

  return (
    <Svg width={size} height={size} viewBox="-4 -12 308 316">
      <Circle cx={150} cy={150} r={126} fill="none" stroke={theme.line} strokeWidth={1} />
      {beads.map((b, i) => {
        const on = i < filled;
        const cur = i === filled - 1;
        return <Circle key={i} cx={b.x} cy={b.y} r={cur ? b.r * 1.45 : b.r} fill={on ? theme.brass : theme.bead} />;
      })}
      <Line x1={150} y1={14} x2={150} y2={-6} stroke={theme.brass} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={150} y1={14} x2={143} y2={-4} stroke={theme.brass} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={150} y1={14} x2={157} y2={-4} stroke={theme.brass} strokeWidth={1.5} strokeLinecap="round" />
      <Ellipse cx={150} cy={24} rx={6} ry={11} fill={theme.brass} />
    </Svg>
  );
}
