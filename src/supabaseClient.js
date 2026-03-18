import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tqcjstbnfnaatlkcovfs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY2pzdGJuZm5hYXRsa2NvdmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDE3MzIsImV4cCI6MjA4OTQxNzczMn0.Jyv2qcw2WPtYvg4HeeI87gB23MnJ8-ER0CD_1-wdXWE'

export const supabase = createClient(supabaseUrl, supabaseKey)
