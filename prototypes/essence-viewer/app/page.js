import essences from '../data/essences.json';
import Gallery from './Gallery';

export default function Page() {
  const carved = essences.filter((entry) => entry.hasArt).length;

  return (
    <main>
      <h1>Essence Kit — art QA</h1>
      <p className="lede">
        Ingredient art for the Decorator Machine. {carved} of {essences.length} essences named an{' '}
        <code>imageName</code> in <code>DecoratorModels.swift</code> and had no image behind it;
        these were generated and then carved to transparency. Switch the background to judge the
        alpha channel — the magenta plate makes a leftover halo obvious where white hides it.
      </p>

      <Gallery essences={essences} />

      <footer>
        Full-resolution art lives in <code>AssetSources/EssenceKit/raw</code> (as generated) and{' '}
        <code>AssetSources/EssenceKit/carved</code> (512px RGBA), with a per-file report in{' '}
        <code>carve-report.json</code>. This page serves 384px WebP previews of both. Re-carve with{' '}
        <code>tools/carve-assets/carve.py</code>, then rebuild this manifest and its previews with{' '}
        <code>tools/carve-assets/build_viewer_assets.py</code>. The essence list is read from{' '}
        <code>DecoratorModels.swift</code>, so the gallery cannot drift from the game catalogue.
      </footer>
    </main>
  );
}
