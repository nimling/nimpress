# Chunk cycles

The workshop build code splits every story and component entry into its own chunk. When a module bundled into shared code statically imports a component that also gets its own chunk, and that component imports anything from the shared side, Rollup emits chunks that import each other. The source module graph has no cycle, dev serves modules unbundled and works, and the deployed static site throws `Uncaught ReferenceError: Cannot access 'x' before initialization` while evaluating whichever cyclic chunk loads first. One crash rejects the whole import chain, so every story loading either chunk renders nothing.

## The guard

Every nimpress build runs the `nimpress:chunk-cycle-guard` plugin over the emitted bundle, for the site and for each harness system. A cycle fails the build and prints each cycle as a chunk path with the source module behind every chunk. `nimpress lint` builds, so the guard runs there and in CI with no configuration.

## The rule for library code

1. Registries, menus, and any module shared across many components load components through dynamic imports, in vue via `defineAsyncComponent(() => import('...'))`, never through static imports.

2. A component may statically import other components it renders. The cycle needs both directions: shared code importing the component and the component importing shared code. Breaking the registry side is always the fix.

3. Dynamic imports defer evaluation past module init, so no cycle forms and the component chunk loads on demand.

## When the guard fires

1. Read the printed cycle. Each line names the emitted chunks and the source module each chunk was built from.

2. Find the shared module in the cycle that statically imports a component, switch that import to a dynamic one, and rebuild.

3. Never widen chunks or force chunk grouping to silence the guard; that hides the coupling instead of removing it.
