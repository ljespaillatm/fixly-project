/**
 * Montos en pesos dominicanos (DOP), enteros. 30% depósito al aceptar, 70% saldo al cerrar.
 */
export function computePaymentAmounts(hourlyRate, durationMinutes) {
  const hourly = Number(hourlyRate) || 0
  const minutes = Number(durationMinutes) || 0
  const hours = minutes / 60
  const totalDop = Math.max(0, Math.round(hourly * hours))
  const depositDop = totalDop > 0 ? Math.max(1, Math.ceil(totalDop * 0.3)) : 0
  const balanceDop = Math.max(0, totalDop - depositDop)
  return { totalDop, depositDop, balanceDop }
}
