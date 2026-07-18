export async function generateStaticParams() {
  try {
    const res = await fetch('https://interplay-maps.onrender.com/api/v1/assets?limit=200');
    const json = await res.json();
    const items = json.data || json || [];
    const ids = (Array.isArray(items) ? items : []).map((a: any) => a.id).filter(Boolean);
    return ids.map((id: string) => ({ id }));
  } catch {
    return [];
  }
}

export default function AssetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
