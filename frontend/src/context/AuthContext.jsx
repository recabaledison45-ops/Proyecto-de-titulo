import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '@/api/auth'
import { setAuthLostHandler, tokens } from '@/api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokens.access || tokens.refresh))

  useEffect(() => {
    setAuthLostHandler(() => setUser(null))
    if (!tokens.access && !tokens.refresh) return
    authApi.me().then(setUser).catch(() => tokens.clear()).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const t = await authApi.login(credentials)
    tokens.set(t.access, t.refresh)
    const profile = await authApi.me()
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload)
    tokens.set(res.access, res.refresh)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => { tokens.clear(); setUser(null) }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
