import { properties } from "../../../../lib/data";
import PropertyDetail from "../../../../components/property-detail";
export function generateStaticParams() {
  return properties.map((p) => ({ id: p.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = properties.find((x) => x.id === id);
  return {
    title: `${p?.title} à ${p?.city} — Aurelia`,
    description: p?.description,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PropertyDetail property={properties.find((p) => p.id === id)!} />;
}
