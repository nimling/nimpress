const swCharacters = ['Luke Skywalker', 'Leia Organa', 'Han Solo', 'Obi-Wan Kenobi', 'Ahsoka Tano', 'Lando Calrissian', 'Din Djarin', 'Padmé Amidala']
const swFirst = ['Luke', 'Leia', 'Han', 'Ahsoka', 'Din', 'Padmé', 'Lando', 'Obi-Wan']
const swFamily = ['Skywalker', 'Organa', 'Solo', 'Kenobi', 'Tano', 'Calrissian', 'Amidala', 'Djarin']
const swPlaces = ['Tatooine', 'Coruscant', 'Endor', 'Hoth', 'Naboo', 'Dagobah', 'Mos Eisley', 'Bespin']
const swThings = ['Millennium Falcon', 'X-Wing', 'Razor Crest', 'Lightsaber', 'Holocron', 'Beskar Ingot', 'Astromech Droid', 'Sarlacc Pit']
const swSentences = [
  'Bantha fodder drifts across the dune sea beyond Mos Eisley.',
  'A hyperdrive hums softly as the freighter clears the asteroid field.',
  'Womp rats scatter when the landspeeder skims Beggar’s Canyon.',
  'The council convened on Coruscant to debate the blockade of Naboo.',
  'Moisture vaporators line the ridge above the homestead on Tatooine.',
  'A protocol droid recites etiquette while the astromech beeps in protest.',
  'Snow swirls over the shield generator on the plains of Hoth.',
  'The cantina band strikes up as smugglers haggle over spice.'
]
const swWords = ['bantha', 'kyber', 'hyperdrive', 'womp-rat', 'sabacc', 'holocron', 'beskar', 'porg']
const swEmails = ['leia.organa@rebellion.org', 'luke.skywalker@jedi.temple', 'han.solo@falcon.crew', 'ahsoka.tano@fulcrum.net']
const swColors = ['#ffe81f', '#2e67f8', '#e5484d', '#30a46c', '#8a63d2']

function hintHash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}
function pick<T>(list: T[], seed = 0): T {
  return list[(hintHash(String(seed)) + seed) % list.length] as T
}

export interface MockFnValue {
  __nimpressFn: string
}

export const mockFullName = (seed = 0): string => pick(swCharacters, seed)
export const mockFirstName = (seed = 0): string => pick(swFirst, seed)
export const mockFamilyName = (seed = 0): string => pick(swFamily, seed)
export const mockUsername = (seed = 0): string => `${pick(swFirst, seed).toLowerCase()}_${pick(swWords, seed + 1)}`
export const mockEmail = (seed = 0): string => pick(swEmails, seed)
export const mockPassword = (seed = 0): string => `${pick(swWords, seed)}-${pick(swThings, seed + 1).replace(/\s+/g, '')}`
export const mockWord = (seed = 0): string => pick(swWords, seed)
export const mockTitle = (seed = 0): string => pick(swThings, seed)
export const mockSentence = (seed = 0): string => pick(swSentences, seed)
export const mockParagraph = (seed = 0): string => `${pick(swSentences, seed)} ${pick(swSentences, seed + 1)} ${pick(swSentences, seed + 2)}`
export const mockPlace = (seed = 0): string => pick(swPlaces, seed)
export const mockUrl = (seed = 0): string => `https://holonet.example/${pick(swWords, seed)}`
export const mockImageUrl = (seed = 0): string => `https://holonet.example/${pick(swWords, seed)}.png`
export const mockColor = (seed = 0): string => pick(swColors, seed)
export const mockIcon = (): string => 'pi pi-star'
export const mockDate = (): string => '1977-05-25'
export const mockTime = (): string => '09:41'
export const mockPhone = (): string => '+47 555 01138'
export const mockId = (seed = 0): string => `${pick(swWords, seed)}-1138`
export const mockSlug = (seed = 0): string => pick(swWords, seed)

export const mockBoolean = (): boolean => true
export const mockInt = (): number => 42
export const mockIndex = (): number => 0
export const mockFloat = (): number => 1.618
export const mockCount = (): number => 7
export const mockPercent = (): number => 66
export const mockWidth = (): number => 320
export const mockHeight = (): number => 240
export const mockPrice = (): number => 199
export const mockYear = (): number => 1977
export const mockAge = (): number => 29
export const mockOption = (options: string[] = [], seed = 0): string | undefined =>
  options.length ? options[(hintHash(String(seed)) + seed) % options.length] : undefined

export const mockFunction = (name = 'handler'): MockFnValue => ({
  __nimpressFn: `(...args) => {\n  console.log(${JSON.stringify(name)}, ...args)\n}`
})
export const mockEvent = (name = 'event'): MockFnValue => mockFunction(name)
