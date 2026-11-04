// Betrag aus dem Eingabefeld: höchstens 2 Nachkommastellen, Komma oder Punkt,
// keine Tausendertrennzeichen; > 0 und < 1 Mrd. (wie die Prüfung im Backend)
const AMOUNT = /^\d+([.,]\d{1,2})?$/

export function parseAmount(input: string): number | null {
  const s = input.trim()
  if (!AMOUNT.test(s)) return null
  const amount = Number(s.replace(',', '.'))
  return amount > 0 && amount < 1e9 ? amount : null
}
