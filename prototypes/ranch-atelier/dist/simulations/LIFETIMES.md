# Ranch lifetimes

The daily clock remains one simulated hour per real second at 1×. A separate continuous year fraction shares that clock and the configured year length (8 real minutes by default). Seasons cycle over that year; manual season selection is a visual/environmental override. Advanced configuration permits 0.1–30 minutes per year for watching generations. Changing the pace does not retroactively age residents.

Residents have persistent identity, age, gender, household, spouse, parents, children, generation and lifespan. Marriages introduce unrelated adult human newcomers, without gender restrictions. Pairing presumes mutual consent. Family additions use a deliberately stylized two-parent inheritance rule: skin/hair are selected from parent appearances and height is blended with variation. This abstracts birth, assisted reproduction and family formation; it is not a reproductive biology or genetics model. Gender, skills and moral/personality traits are not inherited by this rule.

Children do not perform farm work. School and town occupations use a home-door portal: walk to the entrance, hide, and reappear for the next eligible ranch-work period. Sleep, family time and retirement also happen indoors. Schools/town destinations are not yet constructed or simulated. Retirement begins at 67; natural death occurs at an assigned age 78–96. Family history remains in the saved state. Child growth changes visible body scale.

Daytime staffing targets one available adult per six animals, capped at eight visiting farmhands. Visiting farmhands enter through the same portal and use the existing feed/water reservation and delivery system. They leave via home at shift end and are excluded from household population. This is a staffing heuristic, not wages or a labor market. Baseline stores still replenish.

Family size is spatially bounded at max(12, eight residents per home), and each couple can add at most two children. The journal keeps the latest 60 events and ancestry retains departed residents. No disease, pregnancy mechanics, reproductive anatomy, town economy, or autonomous housing construction is claimed.

Verification: node --test ranch-diorama-lab/tests/generations.test.mjs ranch-diorama-lab/tests/seasons.test.mjs
