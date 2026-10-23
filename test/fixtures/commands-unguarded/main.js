import { postCommand } from '@nimtech/nimpress/commands'

document.body.addEventListener('click', () => postCommand('git', { args: ['status'] }))
