// RKRT.in UI Components - Gauge
// Semi-circular gauge for displaying scores

import T from '../../lib/theme';

export function Gauge({ score }) {
  const r = 44;
  const c = Math.PI * r;
  const o = c - (score / 100) * c;
  const col = score >= 70 ? T.a : score >= 40 ? T.y : T.r;
  const label = score >= 70 ? "STRONG" : score >= 40 ? "BUILDING" : "WEAK";

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="160" height="96" viewBox="0 0 100 60">
        {/* Background arc */}
        <path
          d="M 6 56 A 44 44 0 0 1 94 56"
          fill="none"
          stroke={T.m}
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 6 56 A 44 44 0 0 1 94 56"
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={o}
          style={{ transition: "all 0.8s" }}
        />
        {/* Score text */}
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fill={T.t}
          fontSize="20"
          fontWeight="800"
        >
          {score}
        </text>
        {/* Label */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fill={col}
          fontSize="7"
          fontWeight="700"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

export default Gauge;
