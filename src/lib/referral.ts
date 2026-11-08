const STORAGE_KEY = 'stayfy_ref_code'

export function captureReferralCode() {
  const params = new URLSearchParams(window.location.search)
  const ref = params.get('ref')
  if (ref && ref.trim()) {
    sessionStorage.setItem(STORAGE_KEY, ref.trim().toLowerCase())
    const url = new URL(window.location.href)
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.toString())
  }
}

export function consumeReferralCode(): string | null {
  const code = sessionStorage.getItem(STORAGE_KEY)
  if (code) sessionStorage.removeItem(STORAGE_KEY)
  return code
}

export function peekReferralCode(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? ''
}

export function setReferralCode(code: string) {
  const trimmed = code.trim().toLowerCase()
  if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed)
  else sessionStorage.removeItem(STORAGE_KEY)
}

export function referralCodeForUser(userId: string): string {
  return userId.slice(0, 8)
}
