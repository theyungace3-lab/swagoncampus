// Condition label shown everywhere a product appears so customers can
// tell brand-new pieces ("NEW") from thrifted ones ("Thrift") at a glance.
export function ConditionBadge({
  condition,
  variant = "soft",
}: {
  condition?: "new" | "thrift";
  variant?: "soft" | "solid";
}) {
  const isThrift = condition === "thrift";
  const label = isThrift ? "Thrift" : "New";

  if (variant === "solid") {
    return (
      <span
        className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
        style={{ background: isThrift ? "#7c3aed" : "#16a34a", color: "white" }}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap"
      style={{
        background: isThrift ? "rgba(124,58,237,0.12)" : "rgba(34,197,94,0.12)",
        color: isThrift ? "#7c3aed" : "#22c55e",
      }}
    >
      {label}
    </span>
  );
}
