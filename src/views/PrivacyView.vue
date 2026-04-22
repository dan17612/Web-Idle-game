<template>
  <div class="stack">
    <h1 class="title">Datenschutzerklaerung</h1>

    <section class="card stack">
      <p>
        Diese Datenschutzerklaerung informiert dich darueber, welche personenbezogenen Daten bei der Nutzung von Zoo Empire verarbeitet werden, zu welchen Zwecken dies erfolgt und welche Rechte dir zustehen.
      </p>
      <p class="hint">Stand: 22. April 2026</p>
    </section>

    <section class="card stack">
      <h2 class="section-title">1. Verantwortlich</h2>
      <p>
        Verantwortlich fuer die Datenverarbeitung ist der Betreiber dieser App. Bei Fragen zum Datenschutz kannst du uns ueber die im Projekt angegebenen Kontaktwege erreichen.
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">2. Welche Daten wir verarbeiten</h2>
      <ul class="privacy-list">
        <li>Account-Daten: E-Mail-Adresse, Auth-Provider (z. B. Google), technische Auth-ID</li>
        <li>Profil-Daten: Username, Avatar, Einstellungen</li>
        <li>Spiel-Daten: Coins, Tiere, Upgrades, Trades, Freundschaften, Transaktionen</li>
        <li>Technische Daten: Zeitstempel, Sicherheits- und Protokolldaten zur Fehleranalyse und Missbrauchspraevention</li>
      </ul>
    </section>

    <section class="card stack">
      <h2 class="section-title">3. Zwecke der Verarbeitung</h2>
      <ul class="privacy-list">
        <li>Bereitstellung von Login, Konto und Spielstand-Speicherung</li>
        <li>Durchfuehrung von In-Game-Funktionen (z. B. Handel, Freundesfunktionen, Leaderboard)</li>
        <li>Sicherstellung der Stabilitaet, IT-Sicherheit und Missbrauchserkennung</li>
        <li>Erfuellung gesetzlicher Pflichten</li>
      </ul>
    </section>

    <section class="card stack">
      <h2 class="section-title">4. Rechtsgrundlagen</h2>
      <ul class="privacy-list">
        <li>Vertragserfuellung (Art. 6 Abs. 1 lit. b DSGVO) fuer die Nutzung der App</li>
        <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) fuer Sicherheit, Betrugsschutz und technische Verbesserung</li>
        <li>Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO), soweit erforderlich</li>
      </ul>
    </section>

    <section class="card stack">
      <h2 class="section-title">5. Empfaenger und Dienste</h2>
      <p>
        Zur technischen Bereitstellung nutzen wir Supabase (Auth und Datenbank). Die Daten werden dort in unserem Auftrag verarbeitet.
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">6. Speicherdauer</h2>
      <p>
        Wir speichern Daten nur so lange, wie es fuer den Betrieb der App erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
      </p>
      <p>
        Du kannst dein Konto jederzeit in den Einstellungen loeschen. Dabei werden dein Auth-Konto und die zugeordneten Spieldaten entfernt.
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">7. Deine Rechte</h2>
      <ul class="privacy-list">
        <li>Auskunft ueber gespeicherte Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Loeschung und Einschraenkung der Verarbeitung</li>
        <li>Datenuebertragbarkeit</li>
        <li>Widerspruch gegen bestimmte Verarbeitungen</li>
      </ul>
      <p>
        In der App kannst du bereits selbst Daten anfordern (Export) und dein Konto loeschen.
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">8. Minderjaehrige</h2>
      <p>
        Das Angebot richtet sich nicht gezielt an Kinder unter 16 Jahren.
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">9. Aenderungen dieser Erklaerung</h2>
      <p>
        Wir koennen diese Datenschutzerklaerung anpassen, wenn sich Funktionen, rechtliche Anforderungen oder technische Prozesse aendern.
      </p>
    </section>
  </div>
</template>

<style scoped>
.privacy-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.section-title {
  margin: 0;
  font-size: 16px;
}
</style>
