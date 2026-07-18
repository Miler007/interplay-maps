export async function generateStaticParams() {
  try {
    const res = await fetch('https://interplay-maps.onrender.com/api/v1/assets?type=CAJA&limit=200');
    const json = await res.json();
    const items = json.data || json || [];
    return (Array.isArray(items) ? items : []).map((a: any) => ({ id: a.id })).filter((p: any) => p.id);
  } catch { return []; }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
