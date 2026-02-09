import { useCallback } from 'react'
import { toast, authManager } from '@mochi/common'
import { useAuthStore } from '@/stores/auth-store'

export function useLogout() {
  const setLoading = useAuthStore((state) => state.setLoading)
  const isLoading = useAuthStore((state) => state.isLoading)

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await authManager.logout()
      toast.success('Logged out')
    } catch (_error) {
      toast.error('Logged out (with errors)')
    }
  }, [setLoading])

  return {
    logout,
    isLoggingOut: isLoading,
  }
}