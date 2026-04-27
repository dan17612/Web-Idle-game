import { useToast } from "primevue/usetoast"
import { t } from "../i18n"

export function useAppToast() {
  const toast = useToast()

  function err(message, summary) {
    toast.add({
      severity: "error",
      summary: summary || t("common.error") || "Fehler",
      detail: messageOf(message),
      life: 4000,
    })
  }

  function ok(message, summary) {
    toast.add({
      severity: "success",
      summary: summary || "",
      detail: messageOf(message),
      life: 2500,
    })
  }

  function info(message, summary) {
    toast.add({
      severity: "info",
      summary: summary || "",
      detail: messageOf(message),
      life: 3000,
    })
  }

  function warn(message, summary) {
    toast.add({
      severity: "warn",
      summary: summary || "",
      detail: messageOf(message),
      life: 3500,
    })
  }

  return { err, ok, info, warn, toast }
}

function messageOf(m) {
  if (!m) return ""
  if (typeof m === "string") return m
  if (m.message) return String(m.message)
  return String(m)
}
