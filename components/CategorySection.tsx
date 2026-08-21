import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES } from "@/lib/products";

export function CategorySection() {
  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      aria-labelledby="categories-heading"
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--gold-primary)" }}
          >
            ✦ Browse
          </p>
          <h2
            id="categories-heading"
            className="text-3xl sm:text-4xl font-black"
            style={{ color: "var(--text-primary)" }}
          >
            Shop by Category
          </h2>
        </div>
      </div>

      {/* Gold divider */}
      <hr className="gold-divider mb-10" />

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            id={cat.id}
            label={cat.label}
            description={cat.description}
          />
        ))}
      </div>
    </section>
  );
}
