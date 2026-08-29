import { clearAccountSession } from '~/server/utils/accountSession'

// POST /api/account/logout
export default defineEventHandler(async (event) => {
  const tenantId = event.context.tenantId as number
  clearAccountSession(event, tenantId)
  return { success: true }
})
