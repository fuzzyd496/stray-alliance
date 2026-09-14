// Hand-edited extras that aren't in the Excel workbooks.
//
// Tickets Used / Tickets Remaining are read from the Results sheet of each
// workbook (columns C / D next to Date and Place — or add a header row naming
// the columns, e.g. "Tickets Used" / "Tickets Remaining", and they can go
// anywhere). The tickets value below is only a fallback.
//
// What lives here: per-day opponent names and cleared/held results, which
// have no natural home in the spreadsheets. Everything is optional —
// anything missing just shows as "—" on the site.
window.MANUAL = {

  // Fallback current-ticket count per clan (0-3) if not recorded in Excel.
  tickets: { apaw: null, soc: null },

  // Per-week extras, keyed by clan then by week date (the sheet name).
  //
  //   opponents: names of the Day 1/2/3 opponent clans
  //   days: for each day — cleared: we cleared their boss, held: they failed to clear ours
  //         (true / false / null for upcoming or unknown)
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
