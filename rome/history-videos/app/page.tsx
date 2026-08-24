import { normalizeManifest } from "@/lib/catalog";
import type { Manifest } from "@/lib/types";
import { ViewerShell } from "@/components/ViewerShell";
import localManifest from "@/public/data/manifest.json";

async function getInitialManifest(): Promise<Manifest> {
  const remote = process.env.NEXT_PUBLIC_CATALOG_URL;
  if (remote) {
    try {
      const res = await fetch(remote, { next: { revalidate: 30 } });
      if (res.ok) return normalizeManifest(await res.json());
    } catch {
      /* fall through */
    }
  }
  return normalizeManifest(localManifest as Manifest);
}

export default async function Home() {
  const manifest = await getInitialManifest();
  return <ViewerShell initialManifest={manifest} />;
}
