// The 20 styles of Abbie's World (docs/design/look/LOOK.md, "One theme system"). Every page, study and in-game panel
// reads the same tokens (theme/boot.js writes them), and the world follows the chosen style through earth, air and
// timber (simulations/world-appearance.mjs). feel: flat = the app look, toy = the toy-table look (tile edges, sky).
// gf: the Google Fonts families each style needs, with only the weights that family has.
const T = (id, name, blurb, kind, feel, display, body, gf, c, radius) => ({id, name, blurb, kind, feel, display, body, gf, radius, ...c});
const C = (bg, surface, raised, ink, soft, line, accent, onAccent, accent2, earth, air, timber) => ({bg, surface, raised, ink, soft, line, accent, onAccent, accent2, earth, air, timber});
export const THEMES = [
  T('abbie', 'Abbie', 'Warm paper, Roboto, the AW brown. The house look.', 'light', 'flat', 'Roboto', 'Roboto', ['Roboto:wght@400;500;700;900'],
    C('#f3eee3', '#fbf8f2', '#ffffff', '#2b2218', '#6b5d4c', '#e2d8c6', '#7a5236', '#ffffff', '#2f8b87', '#bcc491', '#9ebfc1', '#c67b4e'), '16px'),
  T('toy', 'Toy Table', 'Thick tiles with a wooden edge under a summer sky.', 'light', 'toy', 'Fredoka', 'Nunito', ['Fredoka:wght@500;600;700', 'Nunito:wght@400;600;700;800'],
    C('#fde4b8', '#fdf6e6', '#fffaf0', '#3a2618', '#6f5643', '#e3c9a0', '#d9682b', '#ffffff', '#4f8a34', '#93c062', '#8cc8dc', '#a8743f'), '22px'),
  T('sunroom', 'Sunroom', 'Butter yellow, tomato red and a friendly serif.', 'light', 'flat', 'Fraunces', 'Manrope', ['Fraunces:wght@500;600;700', 'Manrope:wght@400;500;600;700;800'],
    C('#f4edcf', '#fffcf0', '#fffdf6', '#4c4330', '#797058', '#ded5b2', '#b64932', '#ffffff', '#3f7f74', '#bcc491', '#9ebfc1', '#c67b4e'), '16px'),
  T('nordic', 'Nordic Air', 'Cool whites, lake blue and clean geometry.', 'light', 'flat', 'Manrope', 'Manrope', ['Manrope:wght@400;500;600;700;800'],
    C('#e8eff2', '#fafcfd', '#ffffff', '#213c4b', '#5e737d', '#cbd9df', '#23617e', '#ffffff', '#c46a3a', '#a7bfaf', '#8ebed1', '#6e8e9d'), '12px'),
  T('field', 'Field Notes', 'A well-used field journal with vermilion ink.', 'light', 'flat', 'Fraunces', 'DM Sans', ['Fraunces:wght@500;600;700', 'DM+Sans:wght@400;500;700'],
    C('#efeee7', '#fcfbf6', '#ffffff', '#30362e', '#636c60', '#d6d9cc', '#a23e2b', '#ffffff', '#4d6b4f', '#b9c39e', '#98b9bc', '#ac654d'), '6px'),
  T('newsprint', 'Newsprint', 'Ink on paper with a strong newspaper voice.', 'light', 'flat', 'Playfair Display', 'Libre Franklin', ['Playfair+Display:wght@600;700;800', 'Libre+Franklin:wght@400;500;600;700'],
    C('#f4f1e8', '#fbf9f3', '#ffffff', '#1d1d1b', '#5b5b57', '#d3cfc4', '#b3261e', '#ffffff', '#1d1d1b', '#b3b5a8', '#a5b4b6', '#8c9185'), '0px'),
  T('efficient', 'Efficient', 'White, black and nothing extra. A tool.', 'light', 'flat', 'Inter', 'Inter', ['Inter:wght@400;500;600;700'],
    C('#f6f6f6', '#ffffff', '#ffffff', '#111111', '#666666', '#e3e3e3', '#111111', '#ffffff', '#1e8e3e', '#a9b48f', '#aac4d4', '#8d8478'), '8px'),
  T('legion', 'Legion', 'Parchment and Roman red, with a carved serif.', 'light', 'flat', 'Cormorant Garamond', 'Source Sans 3', ['Cormorant+Garamond:wght@500;600;700', 'Source+Sans+3:wght@400;600;700'],
    C('#efe6d6', '#fbf6ec', '#fffdf8', '#2b1a14', '#6b5446', '#dccbb0', '#9e2a22', '#ffffff', '#b98a2e', '#8b8a5a', '#e9c9a0', '#7a4a2a'), '4px'),
  T('sea', 'Under the Sea', 'Lagoon teal and coral, round and bubbly.', 'light', 'toy', 'Baloo 2', 'Nunito', ['Baloo+2:wght@500;600;700;800', 'Nunito:wght@400;600;700;800'],
    C('#dff6f3', '#f3fcfb', '#ffffff', '#0f3a40', '#3f6d72', '#b8e1dc', '#127a8a', '#ffffff', '#ff7a59', '#e6c483', '#86e3d8', '#5fb0b0'), '22px'),
  T('candy', 'Candy Party', 'Bubblegum, mint and lemon. Silly on purpose.', 'light', 'toy', 'Baloo 2', 'Nunito', ['Baloo+2:wght@500;600;700;800', 'Nunito:wght@400;600;700;800'],
    C('#ffe6f2', '#fff7fb', '#ffffff', '#4a1a3a', '#8a4a6e', '#f7c3dc', '#e8378a', '#ffffff', '#22b07d', '#5ed0a2', '#ff9fd0', '#ffb36b'), '26px'),
  T('sakura', 'Sakura', 'Cherry blossom pink and soft rounded letters.', 'light', 'flat', 'Zen Maru Gothic', 'Nunito', ['Zen+Maru+Gothic:wght@500;700', 'Nunito:wght@400;600;700;800'],
    C('#fbeef0', '#fff8f9', '#ffffff', '#4a2b34', '#85606a', '#efd2d8', '#c8476b', '#ffffff', '#5e8a5a', '#a9c08f', '#f2c4cf', '#9c6b5a'), '18px'),
  T('terracotta', 'Terracotta', 'Baked clay, sage and a sturdy little serif.', 'light', 'flat', 'Young Serif', 'Work Sans', ['Young+Serif', 'Work+Sans:wght@400;500;600;700'],
    C('#f1dfcf', '#fbf1e7', '#fffaf4', '#4b2a1f', '#80614f', '#e0c6b0', '#b8532f', '#ffffff', '#3e7a6a', '#c2a46b', '#e8b98f', '#9b5a3a'), '10px'),
  T('forest', 'Forest Cabin', 'Pine dark, lantern gold, a woodsy slab serif.', 'dark', 'flat', 'Bitter', 'Source Sans 3', ['Bitter:wght@500;700', 'Source+Sans+3:wght@400;600;700'],
    C('#17221b', '#213027', '#2a3c31', '#eef3e6', '#a9b8a8', '#34483b', '#d9b24c', '#1b1a10', '#e07a4f', '#4f7a45', '#6a8f9a', '#7a5636'), '12px'),
  T('midnight', 'Midnight Studio', 'Graphite and amber light for late nights.', 'dark', 'flat', 'Archivo', 'Barlow', ['Archivo:wght@500;700;800', 'Barlow:wght@400;500;600;700'],
    C('#161d22', '#20282d', '#29333a', '#f0ede3', '#a8b4b9', '#36424a', '#e8b775', '#1c1a14', '#6fb5c4', '#657d70', '#4c7988', '#a8795a'), '10px'),
  T('moon', 'Moonbase', 'Lunar night, radio blue and mission lights.', 'dark', 'flat', 'Exo 2', 'Inter', ['Exo+2:wght@500;600;700', 'Inter:wght@400;500;600;700'],
    C('#0d1426', '#17213a', '#1f2b4a', '#e8eefc', '#9aa8c7', '#2a3a5e', '#6fc3ff', '#08121f', '#f2be54', '#8a96a6', '#2b4a7a', '#6a7a90'), '14px'),
  T('dusk', 'Space Mail Dusk', 'Moon dusk with a warm sun, playful and round.', 'dark', 'toy', 'Fredoka', 'Nunito', ['Fredoka:wght@500;600;700', 'Nunito:wght@400;600;700;800'],
    C('#171b31', '#232946', '#2b3254', '#f3ead8', '#aab0cb', '#353c63', '#f2be54', '#1b1608', '#00d1ad', '#9aa0b8', '#3a3f6b', '#c08a5a'), '20px'),
  T('plum', 'Plum Night', 'Velvet plum and gold, the review inbox look.', 'dark', 'flat', 'Fraunces', 'Nunito', ['Fraunces:wght@500;600;700;800', 'Nunito:wght@400;600;700;800'],
    C('#1b1430', '#2a1d4a', '#352557', '#fff8ec', '#d9cdea', '#45336a', '#ffcf5a', '#2a1a0a', '#ff8fa3', '#7a6a9a', '#6a4a8a', '#a0708a'), '18px'),
  T('spooky', 'Spooky Night', 'Pumpkin orange on midnight purple. Boo.', 'dark', 'toy', 'Creepster', 'Nunito', ['Creepster', 'Nunito:wght@400;600;700;800'],
    C('#1c1226', '#2a1b38', '#352347', '#fff1dc', '#cdb6c9', '#45304f', '#f08a3c', '#241006', '#8fdc5a', '#4a3048', '#6a3a6a', '#8a5a2a'), '14px'),
  T('blueprint', 'Blueprint', 'White drafting marks on engineering blue.', 'dark', 'flat', 'IBM Plex Mono', 'IBM Plex Sans', ['IBM+Plex+Mono:wght@400;500;600', 'IBM+Plex+Sans:wght@400;500;600;700'],
    C('#0f2a49', '#153660', '#1b4170', '#e9f4ff', '#b2c2d2', '#2c5585', '#a9d7ff', '#0b1d33', '#ffd27a', '#68958f', '#589ac5', '#88b1cf'), '2px'),
  T('arcade', 'Arcade', 'Neon on black, chunky letters, insert coin.', 'dark', 'flat', 'Bungee', 'Rubik', ['Bungee', 'Rubik:wght@400;500;700'],
    C('#0d0d16', '#181828', '#22223a', '#f5f5ff', '#a9a9c9', '#2e2e4a', '#39f28c', '#04140a', '#ff4fd8', '#2fbf71', '#5a3fd0', '#ff8a3d'), '6px'),
];
export const DEFAULT_THEME = 'abbie';
export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0];
// The array shape the older pages read (app-style-presets.mjs): name, blurb, heading font, body font, canvas, paper,
// ink, muted, border, accent, on-accent, earth, air, timber, radius, category.
export const asPreset = t => [t.name, t.blurb, t.display, t.body, t.bg, t.surface, t.ink, t.soft, t.line, t.accent, t.onAccent, t.earth, t.air, t.timber, t.radius, t.kind === 'dark' ? 'Dark' : t.feel === 'toy' ? 'Toy' : 'Light'];
