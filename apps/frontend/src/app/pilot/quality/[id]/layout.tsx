export function generateStaticParams() {
  return ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => ({ id }));
}

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
