import { defineStore } from 'pinia'
import { supabase, AUTH_REDIRECT_URL } from '../supabase'

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
    async sendMagicLink(email, username) {
      const options = { emailRedirectTo: AUTH_REDIRECT_URL }
      if (username) {
        options.shouldCreateUser = true
        options.data = { username }
      }
      const { error } = await supabase.auth.signInWithOtp({ email, options })
      if (error) throw error
    },
    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUpWithPassword(email, password, username) {
      const options = { emailRedirectTo: AUTH_REDIRECT_URL, data: username ? { username } : undefined }
      const { error } = await supabase.auth.signUp({ email, password, options })
      if (error) throw error
    },
    async setPassword(password) {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
    async setAvatar(emoji) {
      const { data, error } = await supabase.rpc('set_avatar', { p_emoji: emoji })
      if (error) throw error
      if (this.profile) this.profile.avatar_emoji = data?.avatar_emoji ?? null
      return data
    },
    async updateEmail(newEmail) {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: AUTH_REDIRECT_URL }
      )
      if (error) throw error
    },
    async changeUsername(newName) {
      const name = String(newName || '').trim()
      if (name.length < 3) throw new Error('Username mind. 3 Zeichen')
      const escaped = name.replace(/[\\_%]/g, '\\$&')
      const { data: existing } = await supabase.from('profiles')
        .select('id, username').ilike('username', escaped).maybeSingle()
      if (existing && existing.id !== this.user?.id) {
        throw new Error('Username ist bereits vergeben (Groß-/Kleinschreibung wird ignoriert).')
      }
      const { data, error } = await supabase.rpc('change_username', { p_new: name })
      if (error) throw error
      if (this.profile) this.profile.username = data?.username || name
      return data
    },
    async sendBroadcast(message) {
      const { data, error } = await supabase.rpc('admin_broadcast', { p_message: message })
      if (error) throw error
      return data
    },
    async signOut() {
      await supabase.auth.signOut()
      this.profile = null
    }
  }
})
