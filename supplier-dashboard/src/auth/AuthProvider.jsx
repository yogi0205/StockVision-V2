import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AuthContext, TOKEN_KEY } from './authContext'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [verifiedToken, setVerifiedToken] = useState(null)
  const loading = Boolean(token && verifiedToken !== token)

  useEffect(() => {
    if (!token) return undefined
    let active = true
    api.me(token)
      .then(({ user: currentUser }) => {
        if (currentUser.role !== 'SUPPLIER') throw new Error('This portal is for supplier accounts.')
        if (active) {
          setUser(currentUser)
          setVerifiedToken(token)
        }
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY)
        if (active) {
          setToken(null)
          setUser(null)
          setVerifiedToken(null)
        }
      })
    return () => { active = false }
  }, [token])

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials)
    if (result.user.role !== 'SUPPLIER') throw new Error('This portal is for supplier accounts.')
    const { user: currentUser } = await api.me(result.token)
    if (currentUser.role !== 'SUPPLIER') throw new Error('This portal is for supplier accounts.')

    sessionStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
    setUser(currentUser)
    setVerifiedToken(result.token)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setVerifiedToken(null)
  }, [])

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
