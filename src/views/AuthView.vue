<script setup>
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { t } from "../i18n";

const auth = useAuthStore();
const router = useRouter();

const step = ref("choice"); // choice | email
const form = reactive({ email: "", password: "" });
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

function cleanMessage(msg) {
  return (msg || "").toLowerCase();
}

async function signInOrSignUpWithPassword() {
  error.value = "";
  info.value = "";

  const email = form.email.trim();
  const password = form.password;

  if (!email) {
    error.value = t("auth.errors.enterEmail");
    return;
  }
  if (!password || password.length < 6) {
    error.value = t("auth.errors.enterPasswordMin");
    return;
  }

  busy.value = true;
  try {
    await auth.signInWithPassword(email, password);
    info.value = t("auth.infoSignedIn");
    return;
  } catch (e) {
    const msg = cleanMessage(e?.message || String(e));

    const canTrySignUp =
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials") ||
      msg.includes("user not found");

    if (!canTrySignUp) {
      throw e;
    }
  }

  try {
    await auth.signUpWithPassword(email, password);
    info.value = t("auth.infoAccountCreated");
  } catch (e) {
    const msg = cleanMessage(e?.message || String(e));
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered")
    ) {
      error.value =
        t("auth.errors.emailExists");
      return;
    }
    throw e;
  } finally {
    busy.value = false;
  }
}

async function signInWithMagicLink() {
  error.value = "";
  info.value = "";

  const email = form.email.trim();
  if (!email) {
    error.value = t("auth.errors.enterEmailFirst");
    return;
  }

  busy.value = true;
  try {
    await auth.sendMagicLink(email);
    info.value = t("auth.infoMagicSent");
  } catch (e) {
    error.value = e?.message || String(e);
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
    error.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-shell">
      <header class="brand-block">
        <div class="hero-mark">🐾</div>
        <div class="hero">Zoo Empire</div>
        <p class="hero-subtitle">
          {{ t("auth.subtitle") }}
        </p>
      </header>

      <div class="card stack auth-card">
        <h1 class="auth-title">{{ t("auth.title") }}</h1>
        <Button
          type="button"
          class="oauth-google"
          :disabled="busy"
          @click="signInGoogle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 32 32"
            aria-hidden="true"
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
            <path
              d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z"
              fill="#ea4435"
            />
            <path
              d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z"
              fill="#4285f4"
            />
          </svg>
          <span>{{ t("auth.signInWithGoogle") }}</span>
        </Button>

        <div class="sep">
          <span></span>
          <p>{{ t("auth.or") }}</p>
          <span></span>
        </div>

        <Button
          v-if="step === 'choice'"
          type="button"
          class="btn secondary full"
          :disabled="busy"
          @click="step = 'email'"
        >
          {{ t("auth.email") }}
        </Button>

        <template v-if="step === 'email'">
          <InputText
            v-model="form.email"
            type="email"
            :placeholder="t('auth.email')"
            autocomplete="email"
            :disabled="busy" />
          <InputText
            v-model="form.password"
            type="password"
            :placeholder="t('auth.password')"
            autocomplete="current-password"
            :disabled="busy" />

          <Button
            class="btn full"
            :disabled="busy"
            @click="signInOrSignUpWithPassword"
          >
            {{ busy ? t("common.loadingShort") : t("auth.continueWithEmail") }}
          </Button>

          <Button
            type="button"
            class="text-link"
            :disabled="busy"
            @click="signInWithMagicLink"
          >
            {{ t("auth.magicLink") }}
          </Button>

          <Button
            type="button"
            class="text-link muted"
            :disabled="busy"
            @click="step = 'choice'"
          >
            {{ t("common.back") }}
          </Button>
        </template>

        <p class="legal">
          {{ t("auth.legalPrefix") }}
          <router-link :to="{ name: 'privacy' }"
            >{{ t("auth.privacy") }}</router-link
          >
          {{ t("auth.legalSuffix") }}
        </p>

        <p v-if="info" class="info">{{ info }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: calc(100vh - 24px);
  display: grid;
  place-items: center;
  padding: 20px 8px;
}
.auth-shell {
  width: min(460px, 100%);
  display: grid;
  gap: 14px;
}
.brand-block {
  text-align: center;
  padding: 8px 8px 0;
}
.hero {
  font-size: 30px;
  font-weight: 800;
  margin-top: 6px;
}
.hero-mark {
  font-size: 54px;
  line-height: 1;
}
.hero-subtitle {
  margin: 8px auto 0;
  color: var(--muted);
  font-size: 14px;
  max-width: 34ch;
}
.auth-title {
  text-align: center;
  font-size: 20px;
  margin: 2px 0 4px;
}
.auth-card {
  margin: 0;
  gap: 10px;
}
.sep {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  color: var(--muted);
}
.sep span {
  height: 1px;
  background: var(--border);
}
.sep p {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.oauth-google {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #dadce0;
  border-radius: 10px;
  background: #fff;
  color: #3c4043;
  font-weight: 600;
  font-size: 15px;
  min-height: 44px;
  cursor: pointer;
}
.oauth-google:hover:not(:disabled) {
  background: #f8f9fa;
}
.oauth-google:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.text-link {
  background: transparent;
  border: none;
  color: var(--accent);
  text-decoration: underline;
  padding: 2px 0;
  font-size: 13px;
  width: fit-content;
  justify-self: center;
}
.text-link.muted {
  color: var(--muted);
}
.legal {
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.45;
  margin: 8px 4px 2px;
  text-align: center;
}
.info {
  color: #3a8;
  font-size: 13px;
  text-align: center;
}
.error {
  text-align: center;
}
</style>
