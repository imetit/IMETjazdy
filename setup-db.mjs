import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://yotjzvykdpxkwfegjrkr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdGp6dnlrZHB4a3dmZWdqcmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU2ODk3NSwiZXhwIjoyMDkxMTQ0OTc1fQ.QK7ark4vtmFUbgvGzVVKDkMUNLU4o0CNMNnXkeWG_VE'
)

// Split schema into individual statements and run them
const schema = readFileSync('supabase/schema.sql', 'utf-8')

// We can't run raw SQL via JS client, so let's create tables via the API
// Instead, let's use the management API

const managementKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdGp6dnlrZHB4a3dmZWdqcmtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU2ODk3NSwiZXhwIjoyMDkxMTQ0OTc1fQ.QK7ark4vtmFUbgvGzVVKDkMUNLU4o0CNMNnXkeWG_VE'

// Use the Supabase SQL API (v1)
const response = await fetch('https://yotjzvykdpxkwfegjrkr.supabase.co/sql/v1/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${managementKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: schema }),
})

if (!response.ok) {
  const text = await response.text()
  console.error('Error:', response.status, text)

  // Try alternative endpoint
  const resp2 = await fetch('https://yotjzvykdpxkwfegjrkr.supabase.co/pg/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${managementKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: schema }),
  })

  if (!resp2.ok) {
    console.error('Alt error:', resp2.status, await resp2.text())
    console.log('\n=== MANUAL STEP REQUIRED ===')
    console.log('Go to: https://supabase.com/dashboard/project/yotjzvykdpxkwfegjrkr/sql/new')
    console.log('Paste the contents of supabase/schema.sql and click Run')
  } else {
    console.log('Schema applied via alt endpoint!')
    console.log(await resp2.json())
  }
} else {
  console.log('Schema applied successfully!')
  console.log(await response.json())
}
