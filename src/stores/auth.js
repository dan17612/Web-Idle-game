import { defineStore } from 'pinia'
import { supabase, AUTH_REDIRECT_URL } from '../supabase'
import { t } from '../i18n'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    profile: null,
    identities: [],
    loading: true
  }),
  getters: {
    user: (s) => s.session?.user || null,
    isAuth: (s) => !!s.session,
    hasGoogleLinked: (s) => (s.identities || []).some((i) => i.provider === 'google'),
    canUnlinkGoogle: (s) => (s.identities || []).some((i) => i.provider === 'google')
  },
  actions: {
    async init() {
      const { data } = await supabase.auth.getSession()
      this.session = data.session
      if (this.session) {
        try { await this.loadProfile() } catch (e) { console.error(e) }
        await this.loadIdentities()
      }
      this.loading = false
      supabase.auth.onAuthStateChange(async (_e, sess) => {
        this.session = sess
        if (sess) {
          try { await this.loadProfile() } catch (e) { console.error(e) }
          await this.loadIdentities()
        } else {
          this.profile = null
          this.identities = []
        }
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
      if (this.profile?.is_banned) {
        await supabase.auth.signOut()
        this.profile = null
        this.identities = []
        this.session = null
        throw new Error(t('storeErrors.accountBanned'))
      }
    },
    async loadIdentities() {
      if (!this.session) return
      const { data, error } = await supabase.auth.getUserIdentities()
      if (error) {
        console.error(error)
        return
      }
      this.identities = data?.identities || []
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
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          queryParams: { prompt: 'select_account' }
        }
      })
      if (error) throw error
    },
    async linkGoogleIdentity() {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          queryParams: { prompt: 'select_account' }
        }
      })
      if (error) throw error
    },
    async unlinkGoogleIdentity() {
      await this.loadIdentities()
      const googleIdentity = (this.identities || []).find((i) => i.provider === 'google')
      if (!googleIdentity) throw new Error(t('storeErrors.googleNotLinked'))
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (error) throw error
      await this.loadIdentities()
    },
    async requestMyData() {
      const { data, error } = await supabase.rpc('request_my_data')
      if (error) throw error
      return data
    },
    async deleteMyAccount() {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await supabase.auth.signOut()
      this.profile = null
      this.identities = []
      this.session = null
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
      if (name.length < 3) throw new Error(t('storeErrors.usernameMin'))
      const escaped = name.replace(/[\\_%]/g, '\\$&')
      const { data: existing } = await supabase.from('profiles')
        .select('id, username').ilike('username', escaped).maybeSingle()
      if (existing && existing.id !== this.user?.id) {
        throw new Error(t('storeErrors.usernameTaken'))
      }
      const { data, error } = await supabase.rpc('change_username', { p_new: name })
      if (error) throw error
      if (this.profile) this.profile.username = data?.username || name
      return data
    },
    async submitSupportTicket(subject, message, notifyCopy) {
      const { data, error } = await supabase.rpc('submit_support_ticket', {
        p_subject: subject,
        p_message: message,
        p_notify_copy: !!notifyCopy
      })
      if (error) throw error
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
      this.identities = []
    }
  }
})
