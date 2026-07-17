export function generateStaticParams() {
  return ['caja-1', 'caja-2', 'caja-3', 'caja-4', 'caja-5', 'muf-1', 'muf-2', 'olt-1'].map((id) => ({ id }));
}

export default function AssetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
