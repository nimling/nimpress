<script>
  import { commandsEnabled, postCommand } from '@nimtech/nimpress/commands'

  let output = $state('')

  async function run() {
    output = (await postCommand('git', { args: ['status'] })).stdout
  }
</script>

{#if commandsEnabled}
  <button onclick={run}>Run git status</button>
  <pre>{output}</pre>
{/if}
