export const ADMIN_EMAIL = (
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || 'admin@example.com'
).toLowerCase()

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && email!.toLowerCase() === ADMIN_EMAIL
}
