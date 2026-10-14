import { createClient } from '@supabase/supabase-js'

// 주소와 공개용(publishable) 키가 설정되어 있을 때만 서버 모드(로그인 + 공유 저장)로 동작한다.
// 설정이 없으면 이 브라우저에만 저장하는 시제품 모드로 동작한다. 비밀(secret/service_role) 키는 절대 넣지 않는다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null
export const isCloud = supabase !== null
