import catalogue from '../data/assets.json';
import Browser from './Browser';

export default function Page() {
  const { kinds, families, assets, generatedAt } = catalogue;
  const made = assets.filter((asset) => asset.source === 'generated').length;

  return (
    <main>
      <h1>Abbie&rsquo;s World — asset browser</h1>
      <p className="lede">
        Every image in the repo: {assets.length} assets across {kinds.length} kinds. {made} were
        generated for the Decorator Machine and carved to transparency; the rest were already here and
        are classified from their path. Filter by kind, family, category, tag, or source; switch the
        background to judge a carve; and click ingredients to build a recipe and see the prompt the
        machine would send.
      </p>

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
                {generated > 0 && generated < group.length ? `, ${group.length - generated} in repo` : ''}
              </span>
              <span className="b">{kind.blurb}</span>
            </li>
          );
        })}
      </ul>

      <Browser kinds={kinds} families={families} assets={assets} generatedAt={generatedAt} />
    </main>
  );
}
