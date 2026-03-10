// RKRT.in UI Components - CopyButton
// Button that copies text to clipboard with visual feedback

import { useState } from 'react';
import { copyToClipboard } from '../../lib/utils';

export function CopyButton({ text, label = "Copy Link" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "#052e16" : "#0a0a0a",
        border: "1px solid #22c55e",
        color: "#22c55e",
        padding: "6px 14px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "transform 0.15s",
        transform: copied ? "scale(0.95)" : "scale(1)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}
    >
      {copied ? "✓ Copied!" : `📋 ${label}`}
    </button>
  );
}

export default CopyButton;
