/** עיצוב מטבע עברי (שקל) — לשימוש בשרת (לוגים) ובתגובות JSON אופציונליות */
export function formatIls(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
