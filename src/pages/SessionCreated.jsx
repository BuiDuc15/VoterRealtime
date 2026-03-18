import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Monitor, Settings, Smartphone } from "lucide-react";

const CARD_STYLES = {
  blue: "border-blue-200 bg-blue-50",
  purple: "border-violet-200 bg-violet-50",
  amber: "border-amber-200 bg-amber-50",
};
const CARD_HEADER = {
  blue: "text-blue-700",
  purple: "text-violet-700",
  amber: "text-amber-700",
};

function UrlCard({ label, icon, url, color, showQR, warning, delay }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border p-4 sm:p-5 ${CARD_STYLES[color]}`}
    >
      <div
        className={`mb-2 flex items-center gap-2 sm:mb-3 ${CARD_HEADER[color]}`}
      >
        {icon}
        <h3 className="text-base font-semibold sm:text-lg">{label}</h3>
      </div>
      {showQR ? (
        <div className="mb-2 flex justify-center sm:mb-3">
          <QRCodeSVG
            value={url}
            size={120}
            bgColor="transparent"
            fgColor="#1e1b4b"
          />
        </div>
      ) : null}
      <p className="mb-2 break-all rounded-lg bg-white/80 p-2 font-mono text-[11px] text-gray-600 sm:mb-3 sm:text-xs">
        {url}
      </p>
      <button
        onClick={copy}
        className="h-9 rounded-lg bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:h-10 sm:px-4 sm:text-sm"
      >
        {copied ? "✓ Đã copy!" : "📋 Copy link"}
      </button>
      {warning ? (
        <p className="mt-2 text-xs text-amber-600">⚠️ {warning}</p>
      ) : null}
    </motion.div>
  );
}

export default function SessionCreated() {
  const { code } = useParams();
  const navigate = useNavigate();
  const base = useMemo(() => window.location.origin, []);

  const cards = [
    {
      label: "Link Vote",
      icon: <Smartphone size={18} />,
      url: `${base}/vote/${code}`,
      color: "blue",
      showQR: true,
    },
    {
      label: "Màn hình chiếu",
      icon: <Monitor size={18} />,
      url: `${base}/display/${code}`,
      color: "purple",
      showQR: true,
    },
    {
      label: "Trang Admin",
      icon: <Settings size={18} />,
      url: `${base}/admin/${code}`,
      color: "amber",
      showQR: false,
      warning: "Lưu mật khẩu admin của bạn!",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-5"
        >
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            ✅ Phiên bình chọn đã được tạo!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Mã phiên:{" "}
            <span className="font-mono font-semibold text-violet-600">{code}</span>
          </p>
        </motion.div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
          {cards.map((card, i) => (
            <UrlCard key={card.label} {...card} delay={i * 0.1} />
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate(`/admin/${code}`)}
          className="h-11 w-full rounded-xl bg-violet-600 font-semibold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 sm:h-12"
        >
          Vào trang Admin →
        </motion.button>
      </div>
    </div>
  );
}
