import i18n from '../i18n'

export function getInitials(source: string): string {
  const namePart = source.includes('@') ? source.split('@')[0] : source
  const parts = namePart.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return namePart.substring(0, 2).toUpperCase()
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function categoryLabel(category: string): string {
  return i18n.t(`categories.${category}`, { defaultValue: category })
}
