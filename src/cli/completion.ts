import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { hasFlag, positional } from './shared'
import { installSkill } from './skill'

interface CompletionFlag {
  name: string
  value: boolean
  describe: string
}

interface CompletionCommand {
  name: string
  describe: string
  flags: CompletionFlag[]
  subs: CompletionCommand[]
}

const systemFlag: CompletionFlag = {
  name: '--system',
  value: true,
  describe: 'the configured component system to act on'
}

const frameworkFlag: CompletionFlag = {
  name: '--framework',
  value: true,
  describe: 'vue or svelte, overriding the framework of the system'
}

const tree: CompletionCommand[] = [
  {
    name: 'init',
    describe: 'Write the config, the content folder, and the agent guide',
    flags: [{ name: '--json', value: false, describe: 'write nimpress.config.json instead of nimpress.config.ts' }],
    subs: []
  },
  {
    name: 'dev',
    describe: 'Serve the site and every component harness',
    flags: [],
    subs: []
  },
  {
    name: 'build',
    describe: 'Build the static site and the harness bundles',
    flags: [],
    subs: []
  },
  {
    name: 'lint',
    describe: 'Check structure, frontmatter, imports, and modules, then build to verify',
    flags: [{ name: '--no-build', value: false, describe: 'stop after the checks and skip the verification build' }],
    subs: []
  },
  {
    name: 'seo',
    describe: 'Report the search and robot metadata of every page, and write the generated fields',
    flags: [{ name: '--write', value: false, describe: 'put the generated keywords and description into the frontmatter where the page has none' }, { name: '--out', value: true, describe: 'where the map is written instead of seo.map.json' }],
    subs: []
  },
  {
    name: 'modules',
    describe: 'Drive the component workshop',
    flags: [],
    subs: [
      { name: 'init', describe: 'Create the modules folder and the config block', flags: [], subs: [] },
      { name: 'dev', describe: 'Serve the harnesses and stay running', flags: [systemFlag], subs: [] },
      { name: 'build', describe: 'Build the harness bundles', flags: [systemFlag], subs: [] },
      { name: 'lint', describe: 'Check the systems, the schemas, and the stories', flags: [systemFlag], subs: [] },
      { name: 'story', describe: 'Write auto stories for one component or for every component', flags: [systemFlag, frameworkFlag], subs: [] },
      {
        name: 'import',
        describe: 'Import components and storybook stories into component pages',
        flags: [
          systemFlag,
          { name: '--name', value: true, describe: 'the component name when a single file is imported' },
          { name: '--source', value: true, describe: 'the component source root, overriding the system source' },
          { name: '--stories', value: true, describe: 'an extra folder of storybook csf files' },
          { name: '--match', value: true, describe: 'a regular expression the component name must match' },
          { name: '--from-stories', value: false, describe: 'take the component list from the csf files instead of the source' },
          { name: '--select', value: false, describe: 'pick the components to import interactively' }
        ],
        subs: []
      },
      {
        name: 'create',
        describe: 'Create a component page, or upsert one schema',
        flags: [
          systemFlag,
          frameworkFlag,
          { name: '--component', value: true, describe: 'the component reference whose schema is upserted' },
          { name: '--schema', value: false, describe: 'required with --component, upserts the schema' }
        ],
        subs: []
      },
      {
        name: 'update',
        describe: 'Upsert the component schemas from the component types',
        flags: [systemFlag, { name: '--component', value: true, describe: 'limit the upsert to one component reference' }],
        subs: []
      }
    ]
  },
  {
    name: 'export',
    describe: 'Collect the pages marked with the export frontmatter field',
    flags: [
      { name: '--target', value: true, describe: 'the export target name matched against the frontmatter value' },
      { name: '--out', value: true, describe: 'the folder the pages are collected into' }
    ],
    subs: []
  },
  {
    name: 'guard',
    describe: 'Wire the gated pages to the auth provider artifacts',
    flags: [],
    subs: [
      {
        name: 'map',
        describe: 'Map the guarded files into guard.map.json',
        flags: [
          { name: '--dist', value: true, describe: 'the build folder to read' },
          { name: '--out', value: true, describe: 'where the mapping json is written' }
        ],
        subs: []
      },
      {
        name: 'apply',
        describe: 'Apply the uploaded mapping and strip the guarded folder',
        flags: [
          { name: '--dist', value: true, describe: 'the build folder to read' },
          { name: '--map', value: true, describe: 'the uploaded mapping json' }
        ],
        subs: []
      }
    ]
  },
  {
    name: 'skill',
    describe: 'The claude skill that teaches an agent to drive this cli',
    flags: [],
    subs: [
      { name: 'get', describe: 'Print the skill document', flags: [], subs: [] },
      {
        name: 'put',
        describe: 'Install the skill under ~/.claude/skills, or into the current project with --project',
        flags: [{ name: '--project', value: false, describe: 'install into .claude of the current directory instead of the home directory' }],
        subs: []
      }
    ]
  },
  {
    name: 'completion',
    describe: 'Print the shell completion script, or wire it up with --auto',
    flags: [
      { name: '--auto', value: false, describe: 'detect the shell and install completion into the rc file' },
      { name: '--skill', value: false, describe: 'install the claude skill globally in the same step' }
    ],
    subs: [
      { name: 'bash', describe: 'the bash completion script', flags: [], subs: [] },
      { name: 'zsh', describe: 'the zsh completion script', flags: [], subs: [] },
      { name: 'fish', describe: 'the fish completion script', flags: [], subs: [] },
      { name: 'powershell', describe: 'the powershell completion script', flags: [], subs: [] }
    ]
  }
]

const shells = ['bash', 'zsh', 'fish', 'powershell']

function groupFlags(command: CompletionCommand): CompletionFlag[] {
  const out: CompletionFlag[] = []
  for (const candidate of [...command.flags, ...command.subs.flatMap((sub) => sub.flags)]) {
    if (!out.some((existing) => existing.name === candidate.name)) out.push(candidate)
  }
  return out
}

function token(entry: CompletionFlag, withValue: boolean): string {
  return withValue && entry.value ? `${entry.name}=` : entry.name
}

function bashScript(): string {
  const lines = ['_nimpress() {', '  local cur="${COMP_WORDS[COMP_CWORD]}"']
  lines.push(`  local words="${tree.map((command) => command.name).join(' ')}"`)
  lines.push('  if [ "$COMP_CWORD" -gt 1 ]; then')
  lines.push('    case "${COMP_WORDS[1]}" in')
  for (const command of tree) {
    const words = [...command.subs.map((sub) => sub.name), ...groupFlags(command).map((entry) => token(entry, false))]
    lines.push(`      ${command.name}) words="${words.join(' ')}" ;;`)
  }
  lines.push('      *) words="" ;;')
  lines.push('    esac')
  lines.push('  fi')
  lines.push('  COMPREPLY=( $(compgen -W "$words" -- "$cur") )')
  lines.push('}')
  lines.push('complete -o default -F _nimpress nimpress')
  return lines.join('\n') + '\n'
}

function zshEntries(indent: string, label: string, entries: string[]): string[] {
  const out = [`${indent}entries=(`]
  for (const entry of entries) out.push(`${indent}  ${entry}`)
  out.push(`${indent})`)
  out.push(`${indent}_describe '${label}' entries`)
  out.push(`${indent}return`)
  return out
}

function zshScript(): string {
  const lines = ['#compdef nimpress', '', '_nimpress() {', '  local -a entries', '  if (( CURRENT == 2 )); then']
  lines.push(
    ...zshEntries(
      '    ',
      'nimpress command',
      tree.map((command) => `'${command.name}:${command.describe}'`)
    )
  )
  lines.push('  fi')
  lines.push('  case "$words[2]" in')
  for (const command of tree) {
    lines.push(`    ${command.name})`)
    if (command.subs.length) {
      lines.push('      if (( CURRENT == 3 )); then')
      lines.push(
        ...zshEntries(
          '        ',
          `${command.name} argument`,
          command.subs.map((sub) => `'${sub.name}:${sub.describe}'`)
        )
      )
      lines.push('      fi')
    }
    const flags = groupFlags(command)
    if (flags.length) {
      lines.push(
        ...zshEntries(
          '      ',
          'nimpress flag',
          flags.map((entry) => `'${token(entry, true)}:${entry.describe}'`)
        )
      )
    } else {
      lines.push('      return')
    }
    lines.push('      ;;')
  }
  lines.push('  esac')
  lines.push('}')
  lines.push('')
  lines.push('if [ "$funcstack[1]" = "_nimpress" ]; then')
  lines.push('  _nimpress "$@"')
  lines.push('else')
  lines.push('  compdef _nimpress nimpress')
  lines.push('fi')
  return lines.join('\n') + '\n'
}

function fishScript(): string {
  const lines = ['complete -c nimpress -f']
  for (const command of tree) {
    lines.push(
      `complete -c nimpress -n '__fish_use_subcommand' -a '${command.name}' -d '${command.describe}'`
    )
  }
  for (const command of tree) {
    const condition = `__fish_seen_subcommand_from ${command.name}`
    for (const sub of command.subs) {
      lines.push(`complete -c nimpress -n '${condition}' -a '${sub.name}' -d '${sub.describe}'`)
    }
    for (const entry of groupFlags(command)) {
      lines.push(
        `complete -c nimpress -n '${condition}' -a '${token(entry, true)}' -d '${entry.describe}'`
      )
    }
  }
  return lines.join('\n') + '\n'
}

function powershellScript(): string {
  const lines = [
    'Register-ArgumentCompleter -Native -CommandName nimpress -ScriptBlock {',
    '    param($wordToComplete, $commandAst, $cursorPosition)',
    '    $words = @($commandAst.CommandElements | ForEach-Object { $_.ToString() })',
    '    $candidates = @()',
    '    if ($words.Count -le 2) {',
    `        $candidates = @(${tree.map((command) => `'${command.name}'`).join(', ')})`,
    '    } else {',
    '        switch ($words[1]) {'
  ]
  for (const command of tree) {
    const words = [...command.subs.map((sub) => sub.name), ...groupFlags(command).map((entry) => token(entry, true))]
    lines.push(`            '${command.name}' { $candidates = @(${words.map((word) => `'${word}'`).join(', ')}) }`)
  }
  lines.push('        }')
  lines.push('    }')
  lines.push('    $candidates | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {')
  lines.push("        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)")
  lines.push('    }')
  lines.push('}')
  return lines.join('\n') + '\n'
}

export function completionScript(shell: string): string {
  if (shell === 'bash') return bashScript()
  if (shell === 'zsh') return zshScript()
  if (shell === 'fish') return fishScript()
  if (shell === 'powershell') return powershellScript()
  throw new Error(`[nimpress] completion: unsupported shell ${shell}, use ${shells.join(', ')}`)
}

export function detectShell(): string {
  const name = basename(process.env.SHELL ?? '')
  for (const shell of ['zsh', 'bash', 'fish']) {
    if (name.includes(shell)) return shell
  }
  return ''
}

export function managedBlock(content: string, body: string): string {
  const start = '# >>> nimpress completion >>>'
  const end = '# <<< nimpress completion <<<'
  const block = `${start}\n${body}\n${end}`
  const opening = content.indexOf(start)
  const closing = content.indexOf(end)
  if (opening >= 0 && closing > opening) {
    return content.slice(0, opening) + block + content.slice(closing + end.length)
  }
  if (opening >= 0) {
    return content.replace(/\n+$/, '') + '\n' + block + '\n'
  }
  const prefix = content === '' || content.endsWith('\n') ? content : content + '\n'
  return prefix + block + '\n'
}

function writeManagedBlock(path: string, body: string): void {
  let content = ''
  try {
    content = readFileSync(path, 'utf-8')
  } catch {
    content = ''
  }
  writeFileSync(path, managedBlock(content, body))
}

function installCompletion(shell: string): void {
  const target = shell || detectShell()
  if (!target) {
    throw new Error('[nimpress] completion: could not detect the shell from $SHELL, name it: nimpress completion <shell> --auto')
  }
  const script = completionScript(target)
  const home = homedir()

  if (target === 'fish') {
    const dir = join(home, '.config', 'fish', 'completions')
    mkdirSync(dir, { recursive: true })
    const path = join(dir, 'nimpress.fish')
    writeFileSync(path, script)
    console.log(`wrote ${path}`)
    console.log('fish loads it on the next shell')
    return
  }

  if (target !== 'bash' && target !== 'zsh') {
    throw new Error(`[nimpress] completion: auto install covers bash, zsh, and fish, for ${target} run: nimpress completion ${target}`)
  }

  const dir = join(home, '.config', 'nimpress', 'completions')
  mkdirSync(dir, { recursive: true })
  const scriptPath = join(dir, target === 'zsh' ? '_nimpress' : 'nimpress.bash')
  writeFileSync(scriptPath, script)
  console.log(`wrote ${scriptPath}`)

  const rc = join(home, target === 'zsh' ? '.zshrc' : '.bashrc')
  const body =
    target === 'zsh'
      ? `fpath=("${dir}" $fpath)\nautoload -Uz compinit && compinit -u`
      : `[ -f "${scriptPath}" ] && source "${scriptPath}"`
  writeManagedBlock(rc, body)
  console.log(`wired ${rc}`)
  console.log(`start a new shell or run: source ${rc}`)
}

export function runCompletion(cwd: string, args: string[]): void {
  const shell = positional(args, 0) ?? ''
  const auto = hasFlag(args, 'auto')
  const skill = hasFlag(args, 'skill')
  if (!auto) {
    if (skill) throw new Error('[nimpress] completion: --skill installs alongside --auto')
    if (!shell) throw new Error(`[nimpress] completion: name a shell (${shells.join(', ')}) or pass --auto`)
    process.stdout.write(completionScript(shell))
    return
  }
  installCompletion(shell)
  if (skill) installSkill(cwd, true)
}
