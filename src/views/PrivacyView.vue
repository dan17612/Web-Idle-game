<script setup>
import { computed } from 'vue'
import { locale } from '../i18n'

const copy = {
  de: {
    title: 'Datenschutzerklaerung',
    updated: 'Stand: 22. April 2026',
    intro: 'Diese Datenschutzerklaerung informiert dich darueber, welche personenbezogenen Daten bei der Nutzung von Zoo Empire verarbeitet werden, zu welchen Zwecken dies erfolgt und welche Rechte dir zustehen.',
    sections: [
      {
        title: '1. Verantwortlich',
        paragraphs: ['Verantwortlich fuer die Datenverarbeitung ist der Betreiber dieser App. Bei Fragen zum Datenschutz kannst du uns ueber die im Projekt angegebenen Kontaktwege erreichen.']
      },
      {
        title: '2. Welche Daten wir verarbeiten',
        bullets: [
          'Account-Daten: E-Mail-Adresse, Auth-Provider (z. B. Google), technische Auth-ID',
          'Profil-Daten: Username, Avatar, Einstellungen',
          'Spiel-Daten: Coins, Tiere, Upgrades, Trades, Freundschaften, Transaktionen',
          'Technische Daten: Zeitstempel, Sicherheits- und Protokolldaten zur Fehleranalyse und Missbrauchspraevention'
        ]
      },
      {
        title: '3. Zwecke der Verarbeitung',
        bullets: [
          'Bereitstellung von Login, Konto und Spielstand-Speicherung',
          'Durchfuehrung von In-Game-Funktionen (z. B. Handel, Freundesfunktionen, Leaderboard)',
          'Sicherstellung der Stabilitaet, IT-Sicherheit und Missbrauchserkennung',
          'Erfuellung gesetzlicher Pflichten'
        ]
      },
      {
        title: '4. Rechtsgrundlagen',
        bullets: [
          'Vertragserfuellung (Art. 6 Abs. 1 lit. b DSGVO) fuer die Nutzung der App',
          'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) fuer Sicherheit, Betrugsschutz und technische Verbesserung',
          'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO), soweit erforderlich'
        ]
      },
      {
        title: '5. Empfaenger und Dienste',
        paragraphs: ['Zur technischen Bereitstellung nutzen wir Supabase (Auth und Datenbank). Die Daten werden dort in unserem Auftrag verarbeitet.']
      },
      {
        title: '6. Speicherdauer',
        paragraphs: [
          'Wir speichern Daten nur so lange, wie es fuer den Betrieb der App erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.',
          'Du kannst dein Konto jederzeit in den Einstellungen loeschen. Dabei werden dein Auth-Konto und die zugeordneten Spieldaten entfernt.'
        ]
      },
      {
        title: '7. Deine Rechte',
        bullets: [
          'Auskunft ueber gespeicherte Daten',
          'Berichtigung unrichtiger Daten',
          'Loeschung und Einschraenkung der Verarbeitung',
          'Datenuebertragbarkeit',
          'Widerspruch gegen bestimmte Verarbeitungen'
        ],
        paragraphs: ['In der App kannst du bereits selbst Daten anfordern (Export) und dein Konto loeschen.']
      },
      {
        title: '8. Minderjaehrige',
        paragraphs: ['Das Angebot richtet sich nicht gezielt an Kinder unter 16 Jahren.']
      },
      {
        title: '9. Aenderungen dieser Erklaerung',
        paragraphs: ['Wir koennen diese Datenschutzerklaerung anpassen, wenn sich Funktionen, rechtliche Anforderungen oder technische Prozesse aendern.']
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Updated: April 22, 2026',
    intro: 'This privacy policy explains which personal data is processed when using Zoo Empire, for what purposes, and which rights you have.',
    sections: [
      {
        title: '1. Controller',
        paragraphs: ['The controller responsible for data processing is the operator of this app. If you have privacy questions, contact us through the project contact channels.']
      },
      {
        title: '2. Which Data We Process',
        bullets: [
          'Account data: email address, auth provider (e.g. Google), technical auth ID',
          'Profile data: username, avatar, settings',
          'Game data: coins, animals, upgrades, trades, friendships, transactions',
          'Technical data: timestamps, security and log data for troubleshooting and abuse prevention'
        ]
      },
      {
        title: '3. Processing Purposes',
        bullets: [
          'Providing login, account, and game-state storage',
          'Running in-game features (e.g. trading, friends, leaderboard)',
          'Ensuring stability, IT security, and abuse detection',
          'Complying with legal obligations'
        ]
      },
      {
        title: '4. Legal Bases',
        bullets: [
          'Contract performance (Art. 6(1)(b) GDPR) for app usage',
          'Legitimate interest (Art. 6(1)(f) GDPR) for security, fraud prevention, and technical improvement',
          'Legal obligation (Art. 6(1)(c) GDPR), where required'
        ]
      },
      {
        title: '5. Recipients and Services',
        paragraphs: ['For technical operation, we use Supabase (auth and database). Data is processed there on our behalf.']
      },
      {
        title: '6. Retention Period',
        paragraphs: [
          'We store data only as long as needed to operate the app or as required by law.',
          'You can delete your account anytime in Settings. This removes your auth account and linked game data.'
        ]
      },
      {
        title: '7. Your Rights',
        bullets: [
          'Access to stored data',
          'Correction of inaccurate data',
          'Deletion and restriction of processing',
          'Data portability',
          'Objection to specific processing'
        ],
        paragraphs: ['Inside the app, you can already request your data (export) and delete your account.']
      },
      {
        title: '8. Minors',
        paragraphs: ['This offer is not specifically targeted at children under 16 years of age.']
      },
      {
        title: '9. Changes to This Policy',
        paragraphs: ['We may update this privacy policy when features, legal requirements, or technical processes change.']
      }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Актуально на 22 апреля 2026',
    intro: 'Эта политика объясняет, какие персональные данные обрабатываются при использовании Zoo Empire, для каких целей и какие права у вас есть.',
    sections: [
      {
        title: '1. Ответственный оператор',
        paragraphs: ['Ответственным за обработку данных является оператор этого приложения. По вопросам конфиденциальности используйте контакты, указанные в проекте.']
      },
      {
        title: '2. Какие данные мы обрабатываем',
        bullets: [
          'Данные аккаунта: email, провайдер авторизации (например, Google), технический ID авторизации',
          'Данные профиля: имя пользователя, аватар, настройки',
          'Игровые данные: монеты, животные, улучшения, обмены, друзья, транзакции',
          'Технические данные: метки времени, данные безопасности и журналов для анализа ошибок и предотвращения злоупотреблений'
        ]
      },
      {
        title: '3. Цели обработки',
        bullets: [
          'Предоставление входа, аккаунта и хранения прогресса',
          'Работа игровых функций (например, обмен, друзья, таблица лидеров)',
          'Обеспечение стабильности, ИТ-безопасности и выявление злоупотреблений',
          'Соблюдение юридических обязательств'
        ]
      },
      {
        title: '4. Правовые основания',
        bullets: [
          'Исполнение договора (ст. 6(1)(b) GDPR) для использования приложения',
          'Законный интерес (ст. 6(1)(f) GDPR) для безопасности, защиты от мошенничества и технических улучшений',
          'Юридическая обязанность (ст. 6(1)(c) GDPR), где это требуется'
        ]
      },
      {
        title: '5. Получатели и сервисы',
        paragraphs: ['Для технической работы мы используем Supabase (авторизация и база данных). Данные обрабатываются там по нашему поручению.']
      },
      {
        title: '6. Срок хранения',
        paragraphs: [
          'Мы храним данные только столько, сколько нужно для работы приложения или по требованиям закона.',
          'Вы можете удалить аккаунт в любое время в настройках. При этом удаляются аккаунт авторизации и связанные игровые данные.'
        ]
      },
      {
        title: '7. Ваши права',
        bullets: [
          'Доступ к сохраненным данным',
          'Исправление неточных данных',
          'Удаление и ограничение обработки',
          'Переносимость данных',
          'Возражение против отдельных видов обработки'
        ],
        paragraphs: ['В приложении уже доступны экспорт данных и удаление аккаунта.']
      },
      {
        title: '8. Несовершеннолетние',
        paragraphs: ['Сервис не ориентирован специально на детей младше 16 лет.']
      },
      {
        title: '9. Изменения политики',
        paragraphs: ['Мы можем обновлять политику при изменениях функций, правовых требований или технических процессов.']
      }
    ]
  }
}

const text = computed(() => copy[locale.value] || copy.en)
</script>

<template>
  <div class="stack">
    <h1 class="title">{{ text.title }}</h1>

    <section class="card stack">
      <p>{{ text.intro }}</p>
      <p class="hint">{{ text.updated }}</p>
    </section>

    <section v-for="section in text.sections" :key="section.title" class="card stack">
      <h2 class="section-title">{{ section.title }}</h2>
      <ul v-if="section.bullets?.length" class="privacy-list">
        <li v-for="item in section.bullets" :key="item">{{ item }}</li>
      </ul>
      <p v-for="paragraph in section.paragraphs || []" :key="paragraph">{{ paragraph }}</p>
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
