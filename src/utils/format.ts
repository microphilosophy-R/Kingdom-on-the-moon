export const fmt = (value: number) => Math.round(value).toLocaleString('zh-CN')

export const fmtAmount = (value: number) =>
  Number.isInteger(value) ? fmt(value) : value.toFixed(1)

export const fmtCompactAmount = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs > 1_000_000_000) return `${sign}${Math.round(abs / 1_000_000_000)}B`
  if (abs > 100_000) return `${sign}${Math.round(abs / 100_000)}M`
  if (abs > 1_000) return `${sign}${Math.round(abs / 1_000)}K`
  return fmtAmount(value)
}

export const fmtSignedCompactAmount = (value: number) =>
  `${value >= 0 ? '+' : ''}${fmtCompactAmount(value)}`

export const formatDay = (day: number) => `御日 ${String(day).padStart(3, '0')}`
