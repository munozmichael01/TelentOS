/**
 * Formatters canónicos de la app (auditoría M4 / spec payroll §1.1).
 * Regla: la moneda es propiedad de cada registro — nunca hardcodear "$" ni "€"
 * en componentes. Prohibido añadir nuevos usos de fmtUSD locales.
 */

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Formatea un importe en su moneda: formatMoney(3100, "EUR") → "€3,100".
 * Locale fijo (en-US) a propósito: evita mismatches de hidratación SSR/cliente
 * y mantiene el estilo visual actual de la app ($1,000).
 */
export function formatMoney(amount: number, currency: string = "USD", decimals = 0): string {
  const key = `${currency}:${decimals}`;
  let fmt = moneyFormatters.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      // Código de moneda inválido en datos: degradar legible, no romper la UI
      return `${currency} ${amount.toLocaleString("en-US")}`;
    }
    moneyFormatters.set(key, fmt);
  }
  return fmt.format(amount);
}
