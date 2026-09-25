import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { PromoBar } from "@/components/PromoBar";

export default function HomePage() {
  return (
    <>
      <PromoBar />
      <HeroSection />
      <CategorySection />
      <FeaturedProducts />
    </>
  );
}
