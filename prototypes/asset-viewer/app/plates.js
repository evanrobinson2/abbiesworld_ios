// The backgrounds exist to make a bad carve obvious. Magenta shows a halo that
// white hides; the dark and treehouse plates show whether a sprite still reads
// against the surfaces it will actually sit on in the app. Shared so the studio
// judges a fresh generation exactly as the browser judges a committed one.
export const PLATES = [
  {
    id: 'checker',
    label: 'Checkerboard',
    css: 'repeating-conic-gradient(#e8eaef 0% 25%, #ffffff 0% 50%) 50% / 18px 18px',
  },
  { id: 'magenta', label: 'Halo test', css: '#ff00c8' },
  { id: 'white', label: 'White', css: '#ffffff' },
  { id: 'dark', label: 'Dark', css: '#1b1f2a' },
  { id: 'treehouse', label: 'Treehouse', css: 'linear-gradient(180deg,#cfe8c8,#f2e2c4)' },
];

export const DEFAULT_PLATE = PLATES[0];

export function plateById(id) {
  return PLATES.find((plate) => plate.id === id) ?? DEFAULT_PLATE;
}
