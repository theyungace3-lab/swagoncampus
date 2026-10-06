import type { Metadata } from "next";
import { VendorClient } from "./VendorClient";

export const metadata: Metadata = {
  title: "Vendor Panel | SwagOnCampus",
  robots: { index: false, follow: false },
};

export default function VendorPage() {
  return <VendorClient />;
}
