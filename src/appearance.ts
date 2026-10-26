export type Appearance = 'nino' | 'teslo'
export const appearanceKey = 'nino-appearance-v1'
export function storedAppearance(): Appearance {
  try { return localStorage.getItem(appearanceKey) === 'teslo' ? 'teslo' : 'nino' }
  catch { return 'nino' }
}
