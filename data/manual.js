// Hand-edited extras that aren't in the Excel workbooks.
//
// NOTE: Emblems, Medals, and Tickets are now read from the Results sheet of
// each workbook (columns C / D / E next to Date and Place — or add a header
// row naming the columns and they can go anywhere). Values here are only a
// fallback for weeks not recorded in Excel.
//
// What still lives here: per-day opponent names and cleared/held results,
// which have no natural home in the spreadsheets. Everything is optional —
// anything missing just shows as "—" on the site.
window.MANUAL = {

  // Fallback ticket count per clan (0-3) if not recorded in Excel.
  tickets: { apaw: null, soc: null },

  // Per-week extras, keyed by clan then by week date (the sheet name).
  //
  //   opponents: names of the Day 1/2/3 opponent clans
  //   days: for each day — cleared: we cleared their boss, held: they failed to clear ours
  //         (true / false / null for upcoming or unknown)
  //   emblems, medals: fallback if not in the Excel Results sheet
  //
  // Example:
  //   "2026-09-08": {
  //     opponents: ["Shadow Legion", "NightRaid", "Iron Havoc"],
  //     days: [{cleared: true, held: true}, {cleared: true, held: false}, {cleared: null, held: null}]
  //   }
  weeks: {
    apaw: {},
    soc: {}
  }
};
