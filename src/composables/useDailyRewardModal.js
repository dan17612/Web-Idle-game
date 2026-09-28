import { ref } from "vue"

// Offen-Zustand des Tagesbonus-Fensters bewusst außerhalb von GameView:
// Liest GameView ihn im Template, rendert jedes Öffnen/Schließen die komplette
// (sehr große) Startseite neu — das hat beim Abholen/Schließen spürbar
// geruckelt (INP ~240 ms). So rendert nur das Modal selbst.
export const dailyRewardOpen = ref(false)

export function openDailyReward() {
  dailyRewardOpen.value = true
}

export function closeDailyReward() {
  dailyRewardOpen.value = false
}
