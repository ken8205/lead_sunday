// 직원 역할 (환자 동선 보드와 같은 staff 표를 쓴다)
export type Role = 'doctor' | 'manager' | 'nurse' | 'coordinator'
export const ROLE_LABEL: Record<Role, string> = { doctor: '원장', manager: '실장', nurse: '간호사', coordinator: '코디' }
