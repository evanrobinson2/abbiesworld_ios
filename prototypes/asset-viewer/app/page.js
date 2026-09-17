import catalogue from '../data/assets.json';
import Browser from './Browser';

export default function Page() {
  const { families, assets, generatedAt } = catalogue;

  return (
    <main>
      <h1>Decorator Machine — ingredient art</h1>
      <p className="lede">
        {assets.length} ingredients across {families.length} families. Each family answers one plain
        question, so a recipe reads back as a sentence a six-year-old can follow:{' '}
        <em>a chair made of gingerbread, with cozy nap energy, that purrs when you sit on it.</em> Filter
        by family, category, or tag; switch the background to judge a carve; and click ingredients to
        build a mix and see the prompt the machine would send.
      </p>

      <ul className="families">
        {families.map((family) => (
          <li key={family.id}>
            <strong>{family.label}</strong>
            <span className="q">{family.question}</span>
            <span className="b">{family.blurb}</span>
          </li>
        ))}
      </ul>

      <Browser families={families} assets={assets} generatedAt={generatedAt} />
    </main>
  );
}
