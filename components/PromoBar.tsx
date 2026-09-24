const PROMO_ITEMS = [
  "Free delivery within FUNAAB campus",
  "Order via WhatsApp in seconds",
  "Exclusively for FUNAAB students",
];

export function PromoBar() {
  const items = [...PROMO_ITEMS, ...PROMO_ITEMS];

  return (
    <div
      className="w-full py-2 overflow-hidden"
      style={{
        background: "linear-gradient(90deg, var(--gold-dark), var(--gold-primary), var(--gold-shine), var(--gold-primary), var(--gold-dark))",
      }}
      aria-label="Promotional announcements"
    >
      <div className="animate-marquee flex w-max items-center">
        {items.map((text, i) => (
          <span
            key={i}
            className="flex items-center text-xs font-semibold tracking-wide whitespace-nowrap"
            style={{ color: "#1a0e00" }}
            aria-hidden={i >= PROMO_ITEMS.length}
          >
            <span className="px-6">{text}</span>
            <span aria-hidden="true" className="opacity-40">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
