import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { authApi, userProfileApi } from '../lib/dataFetching'
import { queryClient, queryKeys } from '../lib/queryClient'
import { clearPermissionCache } from '../utils/permissions'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const CACHE_VALIDITY_MS = 5 * 60 * 1000
const SESSION_CACHE_KEY = 'auth_session_cache'
const PROFILE_CACHE_KEY = 'cachedUserProfile'
const CACHE_TIMESTAMP_KEY = 'cache_timestamp'

interface CachedSession {
  userId: string
  timestamp: number
}

interface AuthContextType {
  user: any | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (newPassword: string, clearNeedsPasswordReset?: boolean) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch (err) {
      console.warn('⚠️ Failed to parse cached user profile', err)
      return null
    }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return !cached
    } catch {
      return true
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [usingCachedData, setUsingCachedData] = useState(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const setUserAndCache = (profile: any | null) => {
    setUser(profile)
    if (profile) {
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
        setUsingCachedData(false)
      } catch (err) {
        console.warn('⚠️ Failed to cache user profile in localStorage', err)
      }
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      localStorage.removeItem(SESSION_CACHE_KEY)
      setUsingCachedData(false)
    }
  }

  const isCacheValid = (): boolean => {
    try {
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
      if (!timestamp) return false
      const age = Date.now() - parseInt(timestamp, 10)
      return age < CACHE_VALIDITY_MS
    } catch {
      return false
    }
  }

  const getCachedProfile = (): any | null => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch (err) {
      console.warn('⚠️ Failed to get cached profile', err)
      return null
    }
  }

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('⚠️ User inactive for 15 minutes, logging out...')
        signOut()
      }, INACTIVITY_TIMEOUT_MS)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      resetInactivityTimer()
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
      activityEvents.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true })
      })
      return () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current)
          inactivityTimerRef.current = null
        }
        activityEvents.forEach(event => {
          window.removeEventListener(event, resetInactivityTimer)
        })
      }
    }
  }, [user, resetInactivityTimer])

  const fetchUserProfile = async (userId: string, useCacheOnError = true) => {
    console.log("🔍 Fetching user profile for:", userId)
    try {
      const userProfile = await userProfileApi.fetchUserProfile(userId)
      console.log("✅ User profile obtained:", userProfile)
      return userProfile
    } catch (err) {
      console.error("❌ Failed to fetch user profile:", err)

      if (useCacheOnError) {
        const cachedProfile = getCachedProfile()
        if (cachedProfile && cachedProfile.id === userId) {
          console.log("📦 Using cached profile due to database error")
          setUsingCachedData(true)
          return cachedProfile
        }
      }

      throw err
    }
  }

  useEffect(() => {
    const init = async () => {
      console.log("🚀 Auth init starting...")

      const cachedProfile = getCachedProfile()
      const cacheIsValid = isCacheValid()

      if (cachedProfile && cacheIsValid) {
        console.log("📦 Using valid cached profile, starting in background refresh mode")
        setUser(cachedProfile)
        setLoading(false)
      } else if (cachedProfile) {
        console.log("📦 Using stale cached profile while validating session")
        setUser(cachedProfile)
      } else {
        console.log("🔄 No cached profile, showing loading state")
        setLoading(true)
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("❌ Session error:", sessionError.message)

          if (cachedProfile) {
            console.warn("⚠️ Session error but cached profile exists, keeping user signed in with cached data")
            setUsingCachedData(true)
            setLoading(false)
            return
          }

          await supabase.auth.signOut()
          setUserAndCache(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log("✅ Valid session found, refreshing profile")

          try {
            const profile = await queryClient.fetchQuery({
              queryKey: queryKeys.userProfile(session.user.id),
              queryFn: () => fetchUserProfile(session.user.id, true),
              staleTime: 5 * 60 * 1000,
              gcTime: 15 * 60 * 1000,
            })

            if (profile?.is_active) {
              setUserAndCache(profile)
              console.log("✅ User profile refreshed successfully")
            } else {
              console.warn("⚠️ User inactive, signing out")
              await supabase.auth.signOut()
              setUserAndCache(null)
            }
          } catch (profileError) {
            console.error("❌ Profile fetch failed:", profileError)

            if (cachedProfile && cachedProfile.id === session.user.id) {
              console.log("📦 Database error, continuing with cached profile")
              setUser(cachedProfile)
              setUsingCachedData(true)
            } else {
              console.error("❌ No valid cache, signing out")
              await supabase.auth.signOut()
              setUserAndCache(null)
            }
          }
        } else {
          console.log("ℹ️ No session found, clearing cache")
          setUserAndCache(null)
        }
      } catch (err) {
        console.error("❌ Critical error during init:", err)

        if (cachedProfile) {
          console.log("📦 Critical error but cached profile exists, using cached data")
          setUser(cachedProfile)
          setUsingCachedData(true)
        } else {
          setUserAndCache(null)
        }
      } finally {
        setLoading(false)
        console.log("✅ Auth init finished")
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log("🔄 Auth state change:", event)

        if (event === 'SIGNED_OUT') {
          if (user?.id) {
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
          }
          setUserAndCache(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          try {
            const profile = await queryClient.fetchQuery({
              queryKey: queryKeys.userProfile(session.user.id),
              queryFn: () => fetchUserProfile(session.user.id, true),
              staleTime: 5 * 60 * 1000,
              gcTime: 15 * 60 * 1000,
            })

            if (profile?.is_active) {
              setUserAndCache(profile)
              console.log("✅ User updated after state change")
            } else {
              console.warn("⚠️ User inactive on state change, signing out")
              await supabase.auth.signOut()
              setUserAndCache(null)
            }
          } catch (err) {
            console.error("❌ Failed to refresh profile on state change:", err)

            const cachedProfile = getCachedProfile()
            if (cachedProfile && cachedProfile.id === session.user.id) {
              console.log("📦 Using cached profile after state change error")
              setUser(cachedProfile)
              setUsingCachedData(true)
            }
          }
        }

        if (loading) setLoading(false)
      })()
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log("🔑 Signing in with email:", email)
    setLoading(true)
    setError(null)
    setUsingCachedData(false)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        console.log("✅ User signed in:", data.user.id)

        try {
          const profile = await queryClient.fetchQuery({
            queryKey: queryKeys.userProfile(data.user.id),
            queryFn: () => fetchUserProfile(data.user.id, false),
            staleTime: 5 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
          })

          if (!profile?.is_active) {
            console.warn("⚠️ User inactive, forcing sign out")
            await supabase.auth.signOut()
            throw new Error("Account is inactive")
          }

          setUserAndCache(profile)
        } catch (profileError: any) {
          console.error("❌ Failed to fetch profile after sign in:", profileError)
          await supabase.auth.signOut()
          throw new Error("Failed to load user profile. Please try again.")
        }
      }
    } catch (err: any) {
      console.error("❌ Sign in error:", err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log("🚪 Signing out user:", user?.id)
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (user?.id) {
      queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
    }
    setUserAndCache(null)
    setError(null)
    try {
      await supabase.auth.signOut()
      console.log("✅ Supabase sign out completed")
    } catch (err) {
      console.warn("⚠️ Sign out failed silently:", err)
    }
  }

  const changePassword = async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
    console.log("🔒 Changing password")
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      await refreshUser()
      return result
    } catch (err: any) {
      console.error("❌ Change password failed:", err)
      setError(err.message || "Failed to change password")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    console.log("🔄 Refreshing user profile")
    if (!user) {
      console.log("ℹ️ No user to refresh")
      return
    }

    try {
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error("❌ Failed to get session user:", error.message)
        console.log("📦 Keeping existing cached profile")
        setUsingCachedData(true)
        return
      }

      if (sessionUser) {
        try {
          queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(sessionUser.id) })
          const profile = await queryClient.fetchQuery({
            queryKey: queryKeys.userProfile(sessionUser.id),
            queryFn: () => fetchUserProfile(sessionUser.id, true),
            staleTime: 5 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
          })

          if (!profile?.is_active) {
            console.warn("⚠️ User inactive on refresh, signing out")
            setUserAndCache(null)
            await supabase.auth.signOut()
            return
          }

          setUserAndCache(profile)
          clearPermissionCache()
          resetInactivityTimer()
          console.log("✅ User profile refreshed")
        } catch (profileError) {
          console.error("❌ Profile fetch failed during refresh:", profileError)
          console.log("📦 Keeping existing cached profile")
          setUsingCachedData(true)
          setError("Using offline data. Some features may be limited.")
        }
      } else {
        console.warn("⚠️ No session user on refresh, clearing state")
        setUserAndCache(null)
      }
    } catch (err) {
      console.error("❌ Refresh user failed:", err)
      console.log("📦 Keeping existing cached profile")
      setUsingCachedData(true)
      setError("Failed to refresh. Using cached data.")
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    console.log("📧 Sending password reset email to:", email)
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      console.log("✅ Password reset email sent")
    } catch (err: any) {
      console.error("❌ Failed to send password reset:", err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signOut,
      refreshUser,
      changePassword,
      sendPasswordResetEmail,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
