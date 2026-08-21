export function PromoBar() {
  return (
    <div
      className="w-full py-2 text-center text-xs font-semibold tracking-wide overflow-hidden"
      style={{
        background: "linear-gradient(90deg, var(--gold-dark), var(--gold-primary), var(--gold-shine), var(--gold-primary), var(--gold-dark))",
        color: "#1a0e00",
      }}
    >
      <div className="flex items-center justify-center gap-6 px-4 flex-wrap">
        <span>✦ Free delivery within FUNAAB campus</span>
        <span className="hidden sm:inline">✦ Order via WhatsApp in seconds</span>
        <span className="hidden md:inline">✦ Exclusively for FUNAAB students</span>
      </div>
    </div>
  );
}
