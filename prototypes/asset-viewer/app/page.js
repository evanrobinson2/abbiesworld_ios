import Link from 'next/link';
import catalogue from '../data/assets.json';
import styleCatalogue from '../data/styles.json';
import App from './App';

export default function Page() {
  const { kinds, families, assets, generatedAt } = catalogue;
  const made = assets.filter((asset) => asset.source === 'generated').length;

  return (
    <main>
      <h1>Abbie&rsquo;s World — asset browser</h1>
      <p style={{ fontSize: 14, marginTop: -10, marginBottom: 15 }}>
        <Link href="/humanoid-rig" style={{ color: '#666' }}>→ Humanoid Rig POC</Link>
      </p>
      <p className="lede">
        Every image in the repo: {assets.length} assets across {kinds.length} kinds, {made} of them
        generated for the Decorator Machine.{' '}
        <span className="wideOnly">
          Those {made} are carved to transparency; the rest were already here and are classified from
          their path. Filter by kind, family, category, tag, or source; switch the background to judge a
          carve; and click ingredients to build a recipe and see the prompt the machine would send. The
          studio makes new art from a topic and a style of your own.
        </span>
      </p>

      {/* Rendered here on the server but handed to the browse tab, so the studio
          is not eight cards of scrolling away from the top of the page. */}
      <App
        kinds={kinds}
        families={families}
        assets={assets}
        styles={styleCatalogue.styles}
        generatedAt={generatedAt}
        summary={
          <ul className="families">
            {kinds.map((kind) => {
              const group = assets.filter((asset) => asset.kind === kind.id);
              const generated = group.filter((asset) => asset.source === 'generated').length;
              return (
                <li key={kind.id}>
                  <strong>
                    {kind.label} <span className="n">{group.length}</span>
                  </strong>
                  <span className="q">
                    {generated > 0 ? `${generated} generated` : 'all already in repo'}
                    {generated > 0 && generated < group.length
                      ? `, ${group.length - generated} in repo`
                      : ''}
                  </span>
                  <span className="b">{kind.blurb}</span>
                </li>
              );
            })}
          </ul>
        }
      />
    </main>
  );
}
