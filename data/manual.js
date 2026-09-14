// Hand-edited extras that aren't in the Excel workbooks.
// Everything here is optional — anything missing just shows as "—" on the site.
window.MANUAL = {

  // Current ticket inventory per clan (0–3), or null if you'd rather not show it.
  tickets: { apaw: null, soc: null },

  // Per-week extras, keyed by clan then by week date (the sheet name).
  // Add an entry when you want it — recent weeks only is fine.
  //
  //   opponents: names of the Day 1/2/3 opponent clans
  //   days: for each day — cleared: we cleared their boss, held: they failed to clear ours
  //         (true / false / null for upcoming or unknown)
  //   emblems, medals: final totals for the week
  //
  // Example:
  //   "2026-09-08": {
  //     opponents: ["Shadow Legion", "NightRaid", "Iron Havoc"],
  //     days: [{cleared: true, held: true}, {cleared: true, held: false}, {cleared: null, held: null}],
  //     emblems: 3,
  //     medals: 78221
  //   }
  weeks: {
    apaw: {},
    soc: {}
  }
};
