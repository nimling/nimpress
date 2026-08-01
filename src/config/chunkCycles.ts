import type { Plugin } from 'vite'
import type { OutputBundle, OutputChunk } from 'rollup'

interface ChunkCycle {
  chunks: string[]
  modules: string[]
}

export function findChunkCycles(bundle: OutputBundle): ChunkCycle[] {
  const chunks = new Map<string, OutputChunk>()
  for (const output of Object.values(bundle)) {
    if (output.type === 'chunk') chunks.set(output.fileName, output)
  }
  const state = new Map<string, 1 | 2>()
  const stack: string[] = []
  const cycles: ChunkCycle[] = []
  const moduleOf = (fileName: string): string => {
    const chunk = chunks.get(fileName)
    if (!chunk) return fileName
    return chunk.facadeModuleId ?? Object.keys(chunk.modules)[0] ?? fileName
  }
  const visit = (fileName: string): void => {
    state.set(fileName, 1)
    stack.push(fileName)
    for (const imported of chunks.get(fileName)?.imports ?? []) {
      if (!chunks.has(imported)) continue
      const seen = state.get(imported)
      if (seen === 1) {
        const path = stack.slice(stack.indexOf(imported)).concat(imported)
        cycles.push({ chunks: path, modules: path.map(moduleOf) })
      } else if (!seen) {
        visit(imported)
      }
    }
    stack.pop()
    state.set(fileName, 2)
  }
  for (const fileName of chunks.keys()) {
    if (!state.get(fileName)) visit(fileName)
  }
  return cycles
}

export function chunkCycleGuard(): Plugin {
  return {
    name: 'nimpress:chunk-cycle-guard',
    apply: 'build',
    generateBundle(_, bundle) {
      const cycles = findChunkCycles(bundle)
      if (!cycles.length) return
      const report = cycles
        .map((cycle) => {
          const edges = cycle.chunks.join(' -> ')
          const sources = cycle.modules.map((m) => `    ${m}`).join('\n')
          return `  ${edges}\n${sources}`
        })
        .join('\n')
      this.error(
        `[nimpress] circular chunk imports in the emitted bundle:\n${report}\n` +
          'A module shared across chunks statically imports a component that got its own chunk, and that component imports the shared side back. ' +
          'Evaluating either chunk first throws a ReferenceError on the deployed static site. ' +
          'Load components from registries and shared modules through dynamic imports, in vue via defineAsyncComponent.'
      )
    }
  }
}
