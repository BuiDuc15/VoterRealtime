import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function SessionUrlCard({ title, icon, url, showQR = true, warning }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">
        {icon} {title}
      </h3>
      {showQR && (
        <div className="flex justify-center">
          <QRCodeSVG value={url} size={160} />
        </div>
      )}
      <p className="break-all rounded bg-gray-100 p-2 font-mono text-sm">{url}</p>
      <button
        onClick={copy}
        className="h-12 min-w-[130px] rounded-lg bg-gray-900 px-4 text-white hover:bg-black"
      >
        {copied ? "✅ Đã copy!" : "📋 Copy link"}
      </button>
      {warning ? <p className="text-sm text-orange-600">⚠️ {warning}</p> : null}
    </div>
  );
}

