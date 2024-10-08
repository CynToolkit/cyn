import { createActionRunner } from '@pipelab/plugin-core'
import { forge, createProps } from './forge'

export const makeRunner = createActionRunner<ReturnType<typeof createProps>>(async (options) => {
  await forge('make', options)
})
