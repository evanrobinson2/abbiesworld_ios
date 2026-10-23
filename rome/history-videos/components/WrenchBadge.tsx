const SLOTS = [
  { dock: "Owner", what: "Evan Robinson", status: "bound", kind: "bound" as const },
  { dock: "A", what: "iPod Touch", status: "empty", kind: "empty" as const },
  { dock: "B", what: "iPod Nano", status: "empty", kind: "empty" as const },
  { dock: "C", what: "iPod Classic", status: "empty", kind: "empty" as const },
];

export function WrenchBadge({
  src,
  size = "board",
}: {
  src: string;
  size?: "board" | "room";
}) {
  return (
    <figure className={size === "room" ? "badge-wear badge-wear-room" : "badge-wear"}>
      <div className="badge-lapel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Wrench badge — ASIC in a bezel, pin for a lapel"
          className="badge-pin"
          width={512}
          height={512}
        />
        <span className="badge-clutch">pin · clutch</span>
      </div>
      <figcaption className="badge-card">
        <p className="badge-kicker">Wearable</p>
        <h2 className="badge-title">Wrench</h2>
        <p className="badge-lede">
          ASIC in the bezel. Open LLM + this harness + Bluetooth + Wi‑Fi. On
          Evan. Mute until he presents a player.
        </p>
        <ul className="badge-slots">
          {SLOTS.map((s) => (
            <li key={s.dock}>
              <span className="badge-dock">{s.dock}</span>
              <span className="badge-what">{s.what}</span>
              <em className={s.kind === "bound" ? "badge-bound" : "badge-empty"}>
                {s.status}
              </em>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export function pickBadgeUrl(
  workers: Array<{ id: string; plateUrl: string | null }>,
): string | null {
  const ux = workers.find((w) => w.id === "luna-ux" && w.plateUrl);
  if (ux?.plateUrl) return ux.plateUrl;
  return workers.find((w) => w.plateUrl)?.plateUrl ?? null;
}
