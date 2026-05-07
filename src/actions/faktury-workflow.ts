'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from './audit'
import type { FakturyWorkflowConfig } from '@/lib/faktury-types'

export async function updateFakturyWorkflow(firmaId: string, config: FakturyWorkflowConfig) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (config.stupne === 2 && config.schvalovatel_l1 === config.schvalovatel_l2) {
    return { error: 'L1 a L2 nemôžu byť rovnaká role pri 2-stupňovom workflow' }
  }
  if (config.limit_auto_eur < 0) return { error: 'Limit nemôže byť záporný' }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('firmy').update({ faktury_workflow: config }).eq('id', firmaId)
  if (error) return { error: error.message }

  await logAudit('faktury_workflow_update', 'firmy', firmaId, { config })
  revalidatePath(`/admin/firmy/${firmaId}/faktury-pravidla`)
  return { data: { ok: true } }
}
