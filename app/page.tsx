import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { PromoBar } from "@/components/PromoBar";

export default function HomePage() {
  return (
    <>
      <PromoBar />
      <HeroSection />
      <CategorySection section="men" heading="Shop for Men" />
      <CategorySection section="women" heading="Shop for Women" />
      <FeaturedProducts />
    </>
  );
}
