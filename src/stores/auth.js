import { defineStore } from 'pinia'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    profile: null,
    loading: true
  }),
  getters: {
    user: (s) => s.session?.user || null,
    isAuth: (s) => !!s.session
  },
  actions: {
    async init() {
      const { data } = await supabase.auth.getSession()
      this.session = data.session
      if (this.session) await this.loadProfile()
      this.loading = false
      supabase.auth.onAuthStateChange(async (_e, sess) => {
        this.session = sess
        if (sess) await this.loadProfile()
        else this.profile = null
      })
    },
    async loadProfile() {
      if (!this.session) return
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.session.user.id)
        .maybeSingle()
      if (error) console.error(error)
      this.profile = data
    },
    async signUp(email, password, username) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
      if (error) throw error
      return data
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signOut() {
      await supabase.auth.signOut()
      this.profile = null
    }
  }
})
