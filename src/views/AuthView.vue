<script setup>
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { supabase } from "../supabase";

const auth = useAuthStore();
const router = useRouter();
const mode = ref("login"); // 'login' | 'signup'
const method = ref("magic"); // 'magic' | 'password'
const form = reactive({ email: "", username: "", password: "" });
const error = ref("");
const info = ref("");
const busy = ref(false);

watch(
  () => auth.isAuth,
  (isAuth) => {
    if (isAuth) router.replace({ name: "game" });
  },
  { immediate: true },
);

async function submit() {
  error.value = "";
  info.value = "";
  busy.value = true;
  try {
    const email = form.email.trim();
    if (mode.value === "signup") {
      const uname = form.username.trim();
      if (uname.length < 3) throw new Error("Username mind. 3 Zeichen");
      const escaped = uname.replace(/[\\_%]/g, "\\$&");
      const { data: existing } = await supabase
        .from("profiles")
        .select("username")
        .ilike("username", escaped)
        .maybeSingle();
      if (existing)
        throw new Error(
          "Username ist bereits vergeben (Groß-/Kleinschreibung wird ignoriert).",
        );
      if (method.value === "password") {
        if (!form.password || form.password.length < 6)
          throw new Error("Passwort mind. 6 Zeichen");
        await auth.signUpWithPassword(email, form.password, uname);
        info.value =
          "Konto angelegt. Bestätige ggf. die E-Mail und melde dich dann an.";
      } else {
        await auth.sendMagicLink(email, uname);
        info.value = "Link gesendet. Öffne ihn auf diesem Gerät.";
      }
    } else {
      if (method.value === "password") {
        if (!form.password) throw new Error("Passwort eingeben");
        await auth.signInWithPassword(email, form.password);
        info.value = "Angemeldet.";
      } else {
        await auth.sendMagicLink(email);
        info.value = "Link gesendet. Prüfe dein Postfach.";
      }
    }
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    busy.value = false;
  }
}

async function signInGoogle() {
  error.value = "";
  info.value = "";
  busy.value = true;
  try {
    await auth.signInWithGoogle();
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="hero">🐾</div>
    <h1 class="title" style="text-align: center">Zoo Empire</h1>
    <p class="subtitle" style="text-align: center">
      Sammle Tiere, verdiene Münzen, tausche mit Freunden.
    </p>

    <div class="tabs">
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">
        Login
      </button>
      <button :class="{ active: mode === 'signup' }" @click="mode = 'signup'">
        Registrieren
      </button>
    </div>

    <div class="method-tabs">
      <button
        class="method-btn"
        :class="{ active: method === 'magic' }"
        @click="method = 'magic'"
      >
        ✉️ Magic Link
      </button>
      <button
        class="method-btn"
        :class="{ active: method === 'password' }"
        @click="method = 'password'"
      >
        🔒 Passwort
      </button>
    </div>

    <form class="card stack" @submit.prevent="submit">
      <input
        v-if="mode === 'signup'"
        v-model="form.username"
        placeholder="Username"
        autocomplete="username"
      />
      <input
        v-model="form.email"
        type="email"
        placeholder="E-Mail"
        autocomplete="email"
        required
      />
      <input
        v-if="method === 'password'"
        v-model="form.password"
        type="password"
        :placeholder="
          mode === 'signup' ? 'Passwort (min. 6 Zeichen)' : 'Passwort'
        "
        :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
      />
      <button class="btn full" :disabled="busy">
        {{
          busy
            ? "..."
            : method === "magic"
              ? mode === "login"
                ? "Magic Link senden"
                : "Konto anlegen & Link senden"
              : mode === "login"
                ? "Anmelden"
                : "Konto anlegen"
        }}
      </button>
      <p class="hint">
        {{
          method === "magic"
            ? "Kein Passwort nötig — du bekommst einen Login-Link per E-Mail."
            : "Optional: Passwort-Anmeldung. Magic Link bleibt verfügbar."
        }}
      </p>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <div class="oauth-wrap">
      <div class="oauth-sep">oder</div>
      <button
        type="button"
        class="oauth-google"
        :disabled="busy"
        @click="signInGoogle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32px"
          height="32px"
          viewBox="0 0 32 32"
          data-name="Layer 1"
          id="Layer_1"
        >
          <path
            d="M23.75,16A7.7446,7.7446,0,0,1,8.7177,18.6259L4.2849,22.1721A13.244,13.244,0,0,0,29.25,16"
            fill="#00ac47"
          />
          <path
            d="M23.75,16a7.7387,7.7387,0,0,1-3.2516,6.2987l4.3824,3.5059A13.2042,13.2042,0,0,0,29.25,16"
            fill="#4285f4"
          />
          <path
            d="M8.25,16a7.698,7.698,0,0,1,.4677-2.6259L4.2849,9.8279a13.177,13.177,0,0,0,0,12.3442l4.4328-3.5462A7.698,7.698,0,0,1,8.25,16Z"
            fill="#ffba00"
          />
          <polygon
            fill="#2ab2db"
            points="8.718 13.374 8.718 13.374 8.718 13.374 8.718 13.374"
          />
          <path
            d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z"
            fill="#ea4435"
          />
          <polygon
            fill="#2ab2db"
            points="8.718 18.626 8.718 18.626 8.718 18.626 8.718 18.626"
          />
          <path
            d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z"
            fill="#4285f4"
          />
        </svg>
        <span>Mit <b>Google</b> fortfahren</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  padding: 30px 4px;
}
.hero {
  text-align: center;
  font-size: 72px;
  margin-top: 20px;
}
.hint {
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
  margin: 0;
}
.info {
  color: #3a8;
  font-size: 14px;
}
.method-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 10px 0;
}
.method-btn {
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}
.method-btn.active {
  border-color: var(--accent);
  background: #1d2a5e;
}
.oauth-wrap {
  margin-top: 10px;
}
.oauth-sep {
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 8px;
}
.oauth-google {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  background: #fff;
  color: #3c4043;
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  height: 42px;
  cursor: pointer;
}
.oauth-google:hover:not(:disabled) {
  background: #f8f9fa;
}
.oauth-google:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.google-mark {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>
