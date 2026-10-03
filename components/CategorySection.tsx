import { CategoryCard } from "@/components/CategoryCard";
import { Reveal } from "@/components/Reveal";
import { CATEGORY_SECTIONS } from "@/lib/products";
import { Section } from "@/lib/types";

interface CategorySectionProps {
  section: Section;
  heading: string;
}

export function CategorySection({ section, heading }: CategorySectionProps) {
  const categories = CATEGORY_SECTIONS[section];
  const headingId = `${section}-categories-heading`;

  return (
    <section
      id={`shop-${section}`}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      aria-labelledby={headingId}
    >
      {/* Section Header */}
      <Reveal>
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "var(--gold-primary)" }}
            >
              Browse
            </p>
            <h2
              id={headingId}
              className="text-3xl sm:text-4xl font-black"
              style={{ color: "var(--text-primary)" }}
            >
              {heading}
            </h2>
          </div>
        </div>
      </Reveal>

      {/* Gold divider */}
      <hr className="gold-divider mb-10" />

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat, index) => (
          <Reveal key={cat.id} delay={index * 80} className="h-full">
            <CategoryCard
              id={cat.id}
              label={cat.label}
              description={cat.description}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
