# Regional farm and seasons

The regional-assets catalog records seven existing library models and their source paths. Birch, pine and maple supplement the original rounded canopy rather than replacing it. Apple trees occur near homes; ferns and clover reuse cleared landscape placements. Flowered stone edging uses cleared home-prop locations. The library species are stylized proxies for a New England mood, not a native-species survey.

The default living year lasts eight simulated minutes. The main simulation pause pauses the year. Advanced configuration can preview a fixed season or adjust the year to 2–30 minutes. Calendar phase and controls persist with the ranch. Seasonal transitions blend during the final 35% of each quarter.

Implemented: spring/summer/autumn foliage, leaf-off winter, evergreen retention, snow on ground and roof surfaces, pasture intake reduction and winter grazing shutdown, increased winter hunger growth and increased summer thirst growth. The existing stock, delivery and consumption runtime handles resulting care demand. Baseline resource replenishment is retained.

The factors are illustrative balancing values, not agricultural or weather predictions. Orchard harvest, garden yields, human thermal needs, freeze/thaw, precipitation, native species selection and pollinator ecology are not simulated. Static library vegetation is not represented as autonomous wildlife.

Verification: `node --test tests/seasons.test.mjs` covers continuous seasonal boundaries, calendar wrap, no advancement when paused, winter intake shutdown and summer water demand. Browser checks cover all seasonal previews and the existing live care runtime.
