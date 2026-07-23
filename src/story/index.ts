export interface StoryDefinition {
  name: string
  description?: string
  component?: unknown
  harness?: unknown
  props?: Record<string, unknown>
  slots?: Record<string, string>
  render?: () => unknown
  sidebar?: { name?: string; icon?: string; style?: string }
}

export function vueStory(definition: StoryDefinition): StoryDefinition {
  return definition
}

export function svelteStory(definition: StoryDefinition): StoryDefinition {
  return definition
}
