import { ref } from 'vue'

const STORAGE_KEY = 'zoo.locale'
export const SUPPORTED_LOCALES = ['de', 'en', 'ru']
export const LOCALE_OPTIONS = ['system', ...SUPPORTED_LOCALES]

const LOCALE_TAGS = {
  de: 'de-DE',
  en: 'en-US',
  ru: 'ru-RU'
}

const messages = {
  de: {
    languages: {
      system: 'System',
      de: 'Deutsch',
      en: 'Englisch',
      ru: 'Russisch'
    },
    common: {
      loading: 'Lädt...',
      loadingShort: '...',
      back: 'Zurück'
    },
    coin: {
      invalid: 'Ungültig'
    },
    app: {
      refreshData: 'Daten aktualisieren',
      settings: 'Einstellungen',
      giftReceivedTitle: 'Geschenk erhalten!',
      giftReceivedSub: 'Ein Admin hat dir etwas geschickt.',
      giftThanks: 'Danke!',
      welcomeBack: 'Willkommen zurück!',
      youEarnedOffline: 'Du hast offline verdient:',
      offlineAt: 'mit',
      offlineCappedAt: 'gedeckelt bei {hours}h',
      collect: 'Einsammeln',
      nav: {
        shop: 'Shop',
        trade: 'Trade',
        home: 'Farm',
        friends: 'Freunde',
        rank: 'Rang',
        tickets: 'Tickets'
      },
      admin: 'Admin'
    },
    tutorial: {
      tap: 'Tippe das Tier!',
      equipBest: 'Rüste deinen Hasen aus!',
      shop: 'Geh in den Shop!',
      chest: 'Kauf eine Truhe!'
    },
    auth: {
      subtitle: 'Sammle Tiere, verdiene Münzen, tausche mit Freunden.',
      title: 'Anmelden oder registrieren',
      signInWithGoogle: 'Mit Google anmelden',
      or: 'oder',
      email: 'E-Mail',
      password: 'Passwort',
      continueWithEmail: 'Weiter mit E-Mail',
      magicLink: 'Einmal mit Link anmelden',
      legalPrefix: 'Mit der Nutzung dieses Dienstes erklärst du dich mit unserer',
      legalSuffix: 'einverstanden.',
      privacy: 'Datenschutzerklärung',
      infoSignedIn: 'Angemeldet.',
      infoAccountCreated: 'Neues Konto erstellt. Falls nötig, bitte E-Mail bestätigen.',
      infoMagicSent: 'Einmal-Link gesendet. Bitte Postfach prüfen.',
      errors: {
        enterEmail: 'Bitte E-Mail eingeben.',
        enterPasswordMin: 'Bitte Passwort mit mindestens 6 Zeichen eingeben.',
        enterEmailFirst: 'Bitte erst eine E-Mail eingeben.',
        emailExists: 'Diese E-Mail existiert bereits. Bitte Passwort prüfen oder Einmal-Link nutzen.'
      }
    },
    settings: {
      title: 'Einstellungen',
      languageTitle: 'Sprache',
      languageHint: 'Wähle die Sprache für die App.',
      languageSaved: 'Sprache wurde aktualisiert.',
      account: 'Konto',
      avatar: 'Avatar',
      username: 'Username',
      email: 'E-Mail',
      pending: 'Ausstehend',
      privacy: 'Datenschutzerklärung',
      chooseAvatar: 'Avatar wählen',
      chooseAvatarHint: 'Wähle ein Emoji oder gib ein eigenes ein.',
      set: 'Setzen',
      usernameChangeTitle: 'Username ändern',
      usernameChangeHint: '3-20 Zeichen, Buchstaben/Ziffern/_ . -',
      usernameChangeAction: 'Username ändern',
      emailChangeTitle: 'E-Mail ändern',
      emailChangeHint: 'Du erhältst einen Bestätigungs-Link per E-Mail. Beide Adressen (alt & neu) müssen bestätigt werden.',
      emailChangeAction: 'Bestätigungs-Link senden',
      passwordTitle: 'Passwort',
      passwordHint: 'Setze oder ändere dein Passwort. Magic-Link-Login bleibt möglich.',
      newPassword: 'Neues Passwort',
      repeatPassword: 'Passwort wiederholen',
      savePassword: 'Passwort speichern',
      linkedAccounts: 'Verknüpfte Konten',
      google: 'Google',
      linked: 'Verknüpft',
      notLinked: 'Nicht verknüpft',
      linkGoogleHint: 'Verknüpfe dein Google-Konto, damit du dich auch mit Google anmelden kannst.',
      linkGoogle: 'Mit Google verknüpfen',
      alreadyLinked: 'Bereits verknüpft',
      unlinkGoogle: 'Verknüpfung aufheben',
      unlinkHint: 'Du kannst die Verknüpfung jederzeit aufheben und dich weiter per Magic Link anmelden.',
      exportTitle: 'Daten anfordern',
      exportHint: 'Lade deine gespeicherten Kontodaten als JSON-Datei herunter.',
      exportAction: 'Meine Daten herunterladen',
      deleteTitle: 'Account löschen',
      deleteHint: 'Diese Aktion ist endgültig. Gib zur Bestätigung LÖSCHEN ein.',
      deleteAction: 'Account endgültig löschen',
      logout: 'Abmelden',
      supportTitle: 'Support kontaktieren',
      supportHint: 'Schick uns eine Nachricht. Wir antworten so bald wie möglich.',
      supportSubject: 'Betreff',
      supportSubjectPlaceholder: 'z. B. Problem mit Fusions-Maschine',
      supportMessage: 'Nachricht',
      supportMessagePlaceholder: 'Beschreibe dein Anliegen möglichst genau …',
      supportNotifyCopy: 'Bestätigungs-E-Mail mit Ticketnummer an mich senden',
      supportSubmit: 'Ticket absenden',
      supportSent: 'Ticket {number} gesendet. Wir melden uns!',
      supportSentWithMail: 'Ticket {number} gesendet. Bestätigung wurde an deine E-Mail geschickt.',
      supportEnterSubject: 'Bitte einen Betreff eingeben.',
      supportEnterMessage: 'Bitte eine Nachricht eingeben.'
    },
    storeErrors: {
      accountBanned: 'Dein Account ist gebannt.',
      googleNotLinked: 'Google ist nicht verknüpft.',
      usernameMin: 'Username mind. 3 Zeichen',
      usernameTaken: 'Username ist bereits vergeben (Groß-/Kleinschreibung wird ignoriert).',
      tapLimit: 'Tap-Limit erreicht',
      notAuthenticated: 'Nicht angemeldet',
      giftFunctionUnavailable: 'Geschenk-Funktion ist auf dem Server nicht verfügbar. Bitte später erneut versuchen.',
      notEnoughCoins: 'Nicht genug Münzen',
      offlineLimitMax: 'Maximales Offline-Limit erreicht',
      boostAlreadyActive: 'Boost ist bereits aktiv',
      unknownSpecies: 'Unbekannte Spezies'
    },
    settingsFlash: {
      enterEmail: 'E-Mail eingeben',
      sameEmail: 'Gleiche Adresse wie aktuell',
      emailConfirmSent: 'Bestätigungs-Link gesendet. Beide Adressen müssen bestätigt werden.',
      enterUsername: 'Username eingeben',
      usernameChanged: 'Username geändert.',
      avatarSet: 'Avatar gesetzt.',
      enterEmoji: 'Emoji eingeben',
      passwordMin: 'Mind. 6 Zeichen',
      passwordMismatch: 'Passwörter stimmen nicht überein',
      passwordSaved: 'Passwort gespeichert.',
      googleAlreadyLinked: 'Google ist bereits verknüpft.',
      redirectToGoogle: 'Weiterleitung zu Google gestartet ...',
      googleUnlinked: 'Google-Verknüpfung entfernt.',
      dataExportDownloaded: 'Datenexport heruntergeladen.',
      typeDeleteToConfirm: 'Bitte zur Bestätigung LÖSCHEN eingeben.',
      accountDeleted: 'Account gelöscht.'
    },
    friends: {
      title: 'Freunde',
      addLabel: 'Freund hinzufügen (Username)',
      examplePlaceholder: 'z. B. maxi42',
      send: 'Senden',
      tabFriends: 'Freunde',
      tabIncoming: 'Eingang',
      tabOutgoing: 'Ausgang',
      loadFailed: 'Laden fehlgeschlagen',
      requestAccepted: 'Freundschaft bestätigt!',
      requestSent: 'Anfrage gesendet.',
      removeConfirm: 'Freundschaft wirklich entfernen?',
      amountMin: 'Betrag muss >= 1 sein',
      sentCoins: '{amount} 🪙 an {username} gesendet',
      noFriends: 'Noch keine Freunde. Schick eine Anfrage!',
      noIncoming: 'Keine offenen Anfragen.',
      noOutgoing: 'Keine ausstehenden Anfragen.',
      profileOf: 'Profil von {username}',
      sendCoinsTitle: 'Münzen senden',
      offerTradeTitle: 'Trade anbieten',
      removeTitle: 'Entfernen',
      wantsToBeFriend: 'möchte dein Freund werden',
      waitingForReply: 'wartet auf Antwort',
      sendTo: 'Senden an {username}',
      yourBalance: 'Dein Guthaben: 🪙 {amount}',
      amountPlaceholder: 'Betrag (z. B. 10K)'
    },
    leaderboard: {
      title: 'Bestenliste',
      subtitle: 'Die reichsten Zoo-Besitzer weltweit.',
      subtitleRate: 'Wer verdient am meisten pro Sekunde.',
      byCoins: 'Münzen',
      byRate: 'Pro Sekunde',
      you: 'Du',
      retry: 'Erneut versuchen',
      empty: 'Noch leer.',
      loadFailed: 'Laden fehlgeschlagen'
    },
    send: {
      title: 'Münzen senden',
      subtitle: 'Schicke anderen Spielern Münzen über ihren Usernamen.',
      usernamePlaceholder: 'Empfänger-Username',
      amountPlaceholder: 'Betrag (z. B. 10M)',
      send: 'Senden',
      sentMessage: '{amount} 🪙 an {username} gesendet.',
      recentTransactions: 'Letzte Transaktionen',
      noTransactions: 'Noch keine Transaktionen.',
      sent: 'Gesendet',
      received: 'Empfangen'
    },
    index: {
      title: 'Spezies-Index',
      playerNotFound: 'Spieler nicht gefunden',
      speciesProgress: '{owned} / {total} Spezies · {entries} Einträge',
      permanentHint: 'Einträge bleiben dauerhaft - auch nach Verkauf/Trade.',
      notOwnedYet: 'noch nicht besessen',
      filters: {
        all: 'Alle',
        rainbow: 'Rainbow',
        epic: 'Episch',
        diamond: 'Diamant',
        gold: 'Gold',
        normal: 'Normal'
      }
    },
    profile: {
      title: 'Profil',
      playerNotFound: 'Spieler nicht gefunden',
      coinsAndAnimals: '🪙 {coins} · {animals} Tiere',
      send: 'Senden',
      trade: 'Trade',
      collectionByTier: 'Sammlung nach Tier',
      speciesIndex: 'Spezies-Index ({owned}/{total})',
      missing: 'fehlt',
      badges: {
        complete: 'Komplett',
        allGold: 'Alle Gold',
        allDiamond: 'Alle Diamant',
        allEpic: 'Alle Episch',
        allRainbow: 'Alle Rainbow'
      },
      tiers: {
        normal: 'Normal',
        gold: 'Gold',
        diamond: 'Diamant',
        epic: 'Episch',
        rainbow: 'Rainbow'
      }
    },
    inventory: {
      title: 'Inventar',
      equipSlots: 'Ausrüst-Slots',
      max: 'Max',
      empty: 'Noch keine Tiere. Geh in den Shop und kauf dein erstes Tier!',
      summary: '{groups} Stapel · {animals} Tiere',
      noFreeSlots: 'Keine freien Slots - erst einen kaufen oder Tier abziehen.',
      active: 'Aktiv',
      markFavorite: 'Als Liebling markieren',
      upgrading: 'Wird aufgewertet',
      equipOne: 'Eines ausrüsten',
      unequipOne: 'Eines abziehen',
      equipAll: 'Alle anlegen',
      unequipAll: 'Alle abziehen',
      equip: 'Ausrüsten',
      unequip: 'Abziehen'
    },
    shop: {
      title: 'Shop',
      animalsTab: 'Tiere',
      foodTab: 'Futter',
      nextRotation: 'Nächste Rotation in',
      inStock: 'Im Bestand',
      stockCount: '{count} Tiere',
      weightMustBePositive: 'Gewicht muss > 0 sein',
      boughtAnimal: '{animal} gekauft!',
      chestTitle: 'Truhe',
      chestSubtitle: 'Zufälliges Tier (gewichtet nach Seltenheit) · 🪙 {price} / Stk.',
      thisRotation: 'Diese Rotation',
      limitReached: 'Limit erreicht',
      onlyFree: 'Nur {count} frei',
      openFor: 'Öffnen · 🪙 {price}',
      rotationHint: 'Angebot rotiert alle 5 Minuten im festen Takt. Jedes Tier pro Bestand einmal kaufbar.',
      continue: 'Weiter',
      restock: 'Restock',
      perSec: 'Sek',
      buy: 'Kaufen',
      alreadyBought: 'Schon gekauft',
      soldOut: 'Ausverkauft',
      foodFedSuccess: '{food} gefüttert! ×{mult} Boost aktiv.',
      feedTitle: 'Füttern',
      feedSubtitle: 'Wähle ein Futter für deinen Liebling und aktiviere einen Boost.',
      noFavoriteSelected: 'Kein Liebling ausgewählt',
      boostActive: 'Boost aktiv',
      boostHint: 'Höherer Boost überschreibt niedrigeren; gleicher Boost verlängert die Dauer.',
      boost: 'Boost',
      minutes: 'Min',
      feedAction: 'Füttern',
      adminPanelTitle: 'Admin-Panel',
      adminPanelSub: 'Tiere aktivieren, restocken, Rotation auslösen',
      adminRerollNow: 'Sofort neu würfeln',
      adminRestockCount: 'Restock ×{count}',
      adminRotationCount: 'Rotation ×{count}',
      adminEmpty: 'leer',
      adminActive: 'aktiv',
      adminInactive: 'aus',
      adminRestockAmount: 'Menge zum Restocken',
      adminStop: 'Stop',
      promoTitle: 'Promo-Code einlösen',
      promoSub: 'Code eingeben und Belohnung kassieren.',
      promoPlaceholder: 'CODE',
      promoRedeem: 'Einlösen',
      promoRedeeming: 'Wird eingelöst...',
      promoSuccess: 'Belohnung erhalten!',
      promoRewardCoins: '{coins} Münzen',
      promoRewardTickets: '{tickets} Tickets',
      promoRewardSpecies: '{qty}× {emoji} ({tier})',
      promoRewardBoost: '×{mult} Boost für {minutes} Min',
      promoRewardTaps: '+{taps} Bonus-Taps'
    }
  },
  en: {
    languages: {
      system: 'System',
      de: 'German',
      en: 'English',
      ru: 'Russian'
    },
    common: {
      loading: 'Loading...',
      loadingShort: '...',
      back: 'Back'
    },
    coin: {
      invalid: 'Invalid'
    },
    app: {
      refreshData: 'Refresh data',
      settings: 'Settings',
      welcomeBack: 'Welcome back!',
      youEarnedOffline: 'you earned offline:',
      offlineAt: 'at',
      offlineCappedAt: 'capped {hours}h',
      collect: 'collect',
      giftReceivedTitle: 'Gift received!',
      giftReceivedSub: 'An admin sent you something.',
      giftThanks: 'Thanks!',
      nav: {
        shop: 'Shop',
        trade: 'Trade',
        home: 'Farm',
        friends: 'Friends',
        rank: 'Rank',
        tickets: 'Tickets'
      },
      admin: 'Admin'
    },
    tutorial: {
      tap: 'Tap the animal!',
      equipBest: 'Equip your bunny!',
      shop: 'Go to the shop!',
      chest: 'Buy a chest!'
    },
    auth: {
      subtitle: 'Collect animals, earn coins, trade with friends.',
      title: 'Sign in or register',
      signInWithGoogle: 'Sign in with Google',
      or: 'or',
      email: 'Email',
      password: 'Password',
      continueWithEmail: 'Continue with email',
      magicLink: 'Sign in once with a link',
      legalPrefix: 'By using this service, you agree to our',
      legalSuffix: '.',
      privacy: 'Privacy policy',
      infoSignedIn: 'Signed in.',
      infoAccountCreated: 'New account created. If needed, please confirm your email.',
      infoMagicSent: 'One-time link sent. Please check your inbox.',
      errors: {
        enterEmail: 'Please enter an email.',
        enterPasswordMin: 'Please enter a password with at least 6 characters.',
        enterEmailFirst: 'Please enter an email first.',
        emailExists: 'This email already exists. Please verify your password or use a one-time link.'
      }
    },
    settings: {
      title: 'Settings',
      languageTitle: 'Language',
      languageHint: 'Choose the app language.',
      languageSaved: 'Language updated.',
      account: 'Account',
      avatar: 'Avatar',
      username: 'Username',
      email: 'Email',
      pending: 'Pending',
      privacy: 'Privacy policy',
      chooseAvatar: 'Choose avatar',
      chooseAvatarHint: 'Pick an emoji or enter your own.',
      set: 'Set',
      usernameChangeTitle: 'Change username',
      usernameChangeHint: '3-20 characters, letters/digits/_ . -',
      usernameChangeAction: 'Change username',
      emailChangeTitle: 'Change email',
      emailChangeHint: 'You will receive a confirmation link by email. Both addresses (old & new) must be confirmed.',
      emailChangeAction: 'Send confirmation link',
      passwordTitle: 'Password',
      passwordHint: 'Set or change your password. Magic-link login remains available.',
      newPassword: 'New password',
      repeatPassword: 'Repeat password',
      savePassword: 'Save password',
      linkedAccounts: 'Linked accounts',
      google: 'Google',
      linked: 'Linked',
      notLinked: 'Not linked',
      linkGoogleHint: 'Link your Google account so you can sign in with Google as well.',
      linkGoogle: 'Link Google account',
      alreadyLinked: 'Already linked',
      unlinkGoogle: 'Unlink account',
      unlinkHint: 'You can unlink at any time and still sign in via Magic Link.',
      exportTitle: 'Request data',
      exportHint: 'Download your stored account data as a JSON file.',
      exportAction: 'Download my data',
      deleteTitle: 'Delete account',
      deleteHint: 'This action is final. Type LOESCHEN to confirm.',
      deleteAction: 'Permanently delete account',
      logout: 'Sign out',
      supportTitle: 'Contact support',
      supportHint: 'Send us a message. We will reply as soon as possible.',
      supportSubject: 'Subject',
      supportSubjectPlaceholder: 'e.g. Problem with the fusion machine',
      supportMessage: 'Message',
      supportMessagePlaceholder: 'Describe your issue as clearly as possible …',
      supportNotifyCopy: 'Send me a confirmation email with the ticket number',
      supportSubmit: 'Send ticket',
      supportSent: 'Ticket {number} sent. We will get back to you!',
      supportSentWithMail: 'Ticket {number} sent. Confirmation has been emailed to you.',
      supportEnterSubject: 'Please enter a subject.',
      supportEnterMessage: 'Please enter a message.'
    },
    storeErrors: {
      accountBanned: 'Your account is banned.',
      googleNotLinked: 'Google is not linked.',
      usernameMin: 'Username must be at least 3 characters',
      usernameTaken: 'Username is already taken (case-insensitive).',
      tapLimit: 'Tap limit reached',
      notAuthenticated: 'Not authenticated',
      giftFunctionUnavailable: 'Gift function is not available on the server right now. Please try again later.',
      notEnoughCoins: 'Not enough coins',
      offlineLimitMax: 'Maximum offline limit reached',
      boostAlreadyActive: 'Boost is already active',
      unknownSpecies: 'Unknown species'
    },
    settingsFlash: {
      enterEmail: 'Enter email',
      sameEmail: 'Same address as current',
      emailConfirmSent: 'Confirmation link sent. Both addresses must be confirmed.',
      enterUsername: 'Enter username',
      usernameChanged: 'Username changed.',
      avatarSet: 'Avatar set.',
      enterEmoji: 'Enter an emoji',
      passwordMin: 'At least 6 characters',
      passwordMismatch: 'Passwords do not match',
      passwordSaved: 'Password saved.',
      googleAlreadyLinked: 'Google is already linked.',
      redirectToGoogle: 'Redirect to Google started ...',
      googleUnlinked: 'Google link removed.',
      dataExportDownloaded: 'Data export downloaded.',
      typeDeleteToConfirm: 'Please type LOESCHEN to confirm.',
      accountDeleted: 'Account deleted.'
    },
    friends: {
      title: 'Friends',
      addLabel: 'Add friend (username)',
      examplePlaceholder: 'e.g. maxi42',
      send: 'Send',
      tabFriends: 'Friends',
      tabIncoming: 'Incoming',
      tabOutgoing: 'Outgoing',
      loadFailed: 'Loading failed',
      requestAccepted: 'Friendship confirmed!',
      requestSent: 'Request sent.',
      removeConfirm: 'Remove this friendship?',
      amountMin: 'Amount must be >= 1',
      sentCoins: '{amount} 🪙 sent to {username}',
      noFriends: 'No friends yet. Send a request!',
      noIncoming: 'No open requests.',
      noOutgoing: 'No pending requests.',
      profileOf: 'Profile of {username}',
      sendCoinsTitle: 'Send coins',
      offerTradeTitle: 'Offer trade',
      removeTitle: 'Remove',
      wantsToBeFriend: 'wants to be your friend',
      waitingForReply: 'waiting for reply',
      sendTo: 'Send to {username}',
      yourBalance: 'Your balance: 🪙 {amount}',
      amountPlaceholder: 'Amount (e.g. 10K)'
    },
    leaderboard: {
      title: 'Leaderboard',
      subtitle: 'The richest zoo owners worldwide.',
      subtitleRate: 'Who earns the most per second.',
      byCoins: 'Coins',
      byRate: 'Per second',
      you: 'You',
      retry: 'Try again',
      empty: 'Still empty.',
      loadFailed: 'Loading failed'
    },
    send: {
      title: 'Send coins',
      subtitle: 'Send coins to other players using their username.',
      usernamePlaceholder: 'Recipient username',
      amountPlaceholder: 'Amount (e.g. 10M)',
      send: 'Send',
      sentMessage: '{amount} 🪙 sent to {username}.',
      recentTransactions: 'Recent transactions',
      noTransactions: 'No transactions yet.',
      sent: 'Sent',
      received: 'Received'
    },
    index: {
      title: 'Species Index',
      playerNotFound: 'Player not found',
      speciesProgress: '{owned} / {total} species · {entries} entries',
      permanentHint: 'Entries are permanent - even after selling/trading.',
      notOwnedYet: 'not owned yet',
      filters: {
        all: 'All',
        rainbow: 'Rainbow',
        epic: 'Epic',
        diamond: 'Diamond',
        gold: 'Gold',
        normal: 'Normal'
      }
    },
    profile: {
      title: 'Profile',
      playerNotFound: 'Player not found',
      coinsAndAnimals: '🪙 {coins} · {animals} animals',
      send: 'Send',
      trade: 'Trade',
      collectionByTier: 'Collection by tier',
      speciesIndex: 'Species Index ({owned}/{total})',
      missing: 'missing',
      badges: {
        complete: 'Complete',
        allGold: 'All Gold',
        allDiamond: 'All Diamond',
        allEpic: 'All Epic',
        allRainbow: 'All Rainbow'
      },
      tiers: {
        normal: 'Normal',
        gold: 'Gold',
        diamond: 'Diamond',
        epic: 'Epic',
        rainbow: 'Rainbow'
      }
    },
    inventory: {
      title: 'Inventory',
      equipSlots: 'Equip slots',
      max: 'Max',
      empty: 'No animals yet. Go to the shop and buy your first one!',
      summary: '{groups} stacks · {animals} animals',
      noFreeSlots: 'No free slots - buy one first or unequip an animal.',
      active: 'Active',
      markFavorite: 'Mark as favorite',
      upgrading: 'Upgrading',
      equipOne: 'Equip one',
      unequipOne: 'Unequip one',
      equipAll: 'Equip all',
      unequipAll: 'Unequip all',
      equip: 'Equip',
      unequip: 'Unequip'
    },
    shop: {
      title: 'Shop',
      animalsTab: 'Animals',
      foodTab: 'Food',
      nextRotation: 'Next rotation in',
      inStock: 'In stock',
      stockCount: '{count} animals',
      weightMustBePositive: 'Weight must be > 0',
      boughtAnimal: '{animal} purchased!',
      chestTitle: 'Chest',
      chestSubtitle: 'Random animal (weighted by rarity) · 🪙 {price} each',
      thisRotation: 'This rotation',
      limitReached: 'Limit reached',
      onlyFree: 'Only {count} free',
      openFor: 'Open · 🪙 {price}',
      rotationHint: 'Offer rotates every 5 minutes on a fixed cycle. Each stock item can be bought once.',
      continue: 'Continue',
      restock: 'Restock',
      perSec: 'sec',
      buy: 'Buy',
      alreadyBought: 'Already bought',
      soldOut: 'Sold out',
      foodFedSuccess: '{food} fed! ×{mult} boost active.',
      feedTitle: 'Feed',
      feedSubtitle: 'Choose food for your favorite and activate a boost.',
      noFavoriteSelected: 'No favorite selected',
      boostActive: 'Boost active',
      boostHint: 'Higher boost overrides lower one; same boost extends duration.',
      boost: 'boost',
      minutes: 'min',
      feedAction: 'Feed',
      adminPanelTitle: 'Admin Panel',
      adminPanelSub: 'Enable animals, restock, trigger rotation',
      adminRerollNow: 'Reroll now',
      adminRestockCount: 'Restock ×{count}',
      adminRotationCount: 'Rotation ×{count}',
      adminEmpty: 'empty',
      adminActive: 'active',
      adminInactive: 'off',
      adminRestockAmount: 'Restock amount',
      adminStop: 'Stop',
      promoTitle: 'Redeem promo code',
      promoSub: 'Enter a code and claim your reward.',
      promoPlaceholder: 'CODE',
      promoRedeem: 'Redeem',
      promoRedeeming: 'Redeeming...',
      promoSuccess: 'Reward claimed!',
      promoRewardCoins: '{coins} coins',
      promoRewardTickets: '{tickets} tickets',
      promoRewardSpecies: '{qty}× {emoji} ({tier})',
      promoRewardBoost: '×{mult} boost for {minutes} min',
      promoRewardTaps: '+{taps} bonus taps'
    }
  },
  ru: {
    languages: {
      system: 'System',
      de: 'Немецкий',
      en: 'Английский',
      ru: 'Русский'
    },
    common: {
      loading: 'Загрузка...',
      loadingShort: '...',
      back: 'Назад'
    },
    coin: {
      invalid: 'Неверный формат'
    },
    app: {
      refreshData: 'Обновить данные',
      settings: 'Настройки',
      welcomeBack: 'C возвращением!',
      youEarnedOffline: 'офлайн заработано:',
      offlineAt: 'по',
      offlineCappedAt: 'лимит {hours}ч',
      collect: 'забрать',
      giftReceivedTitle: 'Подарок получен!',
      giftReceivedSub: 'Администратор отправил вам подарок.',
      giftThanks: 'Спасибо!',
      nav: {
        shop: 'Магазин',
        trade: 'Обмен',
        home: 'Ферма',
        friends: 'Друзья',
        rank: 'Рейтинг',
        tickets: 'Тикеты'
      },
      admin: 'Admin'
    },
    tutorial: {
      tap: 'Нажми на животное!',
      equipBest: 'Экипируй своего зайца!',
      shop: 'Иди в магазин!',
      chest: 'Купи сундук!'
    },
    auth: {
      subtitle: 'Собирай животных, зарабатывай монеты, обменивайся с друзьями.',
      title: 'Войти или зарегистрироваться',
      signInWithGoogle: 'Войти через Google',
      or: 'или',
      email: 'Email',
      password: 'Пароль',
      continueWithEmail: 'Продолжить с Email',
      magicLink: 'Войти по одноразовой ссылке',
      legalPrefix: 'Используя сервис, вы соглашаетесь с нашей',
      legalSuffix: '.',
      privacy: 'политикой конфиденциальности',
      infoSignedIn: 'Вход выполнен.',
      infoAccountCreated: 'Новый аккаунт создан. При необходимости подтвердите email.',
      infoMagicSent: 'Одноразовая ссылка отправлена. Проверьте почту.',
      errors: {
        enterEmail: 'Введите email.',
        enterPasswordMin: 'Введите пароль не менее 6 символов.',
        enterEmailFirst: 'Сначала введите email.',
        emailExists: 'Этот email уже существует. Проверьте пароль или используйте одноразовую ссылку.'
      }
    },
    settings: {
      title: 'Настройки',
      languageTitle: 'Язык',
      languageHint: 'Выберите язык приложения.',
      languageSaved: 'Язык обновлен.',
      account: 'Аккаунт',
      avatar: 'Аватар',
      username: 'Имя пользователя',
      email: 'Email',
      pending: 'Ожидает подтверждения',
      privacy: 'Политика конфиденциальности',
      chooseAvatar: 'Выбор аватара',
      chooseAvatarHint: 'Выберите эмодзи или введите свой.',
      set: 'Сохранить',
      usernameChangeTitle: 'Сменить имя пользователя',
      usernameChangeHint: '3-20 символов, буквы/цифры/_ . -',
      usernameChangeAction: 'Сменить имя',
      emailChangeTitle: 'Сменить email',
      emailChangeHint: 'Вы получите ссылку подтверждения по email. Нужно подтвердить оба адреса (старый и новый).',
      emailChangeAction: 'Отправить ссылку подтверждения',
      passwordTitle: 'Пароль',
      passwordHint: 'Установите или измените пароль. Вход по magic-link останется доступен.',
      newPassword: 'Новый пароль',
      repeatPassword: 'Повторите пароль',
      savePassword: 'Сохранить пароль',
      linkedAccounts: 'Связанные аккаунты',
      google: 'Google',
      linked: 'Связан',
      notLinked: 'Не связан',
      linkGoogleHint: 'Свяжите аккаунт Google, чтобы входить через Google.',
      linkGoogle: 'Связать Google',
      alreadyLinked: 'Уже связан',
      unlinkGoogle: 'Отвязать',
      unlinkHint: 'Вы можете отвязать в любой момент и продолжить вход через Magic Link.',
      exportTitle: 'Запросить данные',
      exportHint: 'Скачайте сохраненные данные аккаунта в формате JSON.',
      exportAction: 'Скачать мои данные',
      deleteTitle: 'Удалить аккаунт',
      deleteHint: 'Это действие необратимо. Для подтверждения введите LOESCHEN.',
      deleteAction: 'Удалить аккаунт навсегда',
      logout: 'Выйти',
      supportTitle: 'Связаться с поддержкой',
      supportHint: 'Отправьте нам сообщение. Мы ответим как можно скорее.',
      supportSubject: 'Тема',
      supportSubjectPlaceholder: 'например, проблема с машиной слияния',
      supportMessage: 'Сообщение',
      supportMessagePlaceholder: 'Опишите проблему как можно подробнее …',
      supportNotifyCopy: 'Прислать мне подтверждение по email с номером тикета',
      supportSubmit: 'Отправить тикет',
      supportSent: 'Тикет {number} отправлен. Мы свяжемся с вами!',
      supportSentWithMail: 'Тикет {number} отправлен. Подтверждение отправлено вам на email.',
      supportEnterSubject: 'Введите тему.',
      supportEnterMessage: 'Введите сообщение.'
    },
    storeErrors: {
      accountBanned: 'Ваш аккаунт заблокирован.',
      googleNotLinked: 'Google не связан.',
      usernameMin: 'Имя пользователя должно быть не менее 3 символов',
      usernameTaken: 'Имя пользователя уже занято (без учета регистра).',
      tapLimit: 'Лимит нажатий достигнут',
      notAuthenticated: 'Не выполнен вход',
      giftFunctionUnavailable: 'Функция подарка сейчас недоступна на сервере. Попробуйте позже.',
      notEnoughCoins: 'Недостаточно монет',
      offlineLimitMax: 'Достигнут максимальный офлайн-лимит',
      boostAlreadyActive: 'Буст уже активен',
      unknownSpecies: 'Неизвестный вид'
    },
    settingsFlash: {
      enterEmail: 'Введите email',
      sameEmail: 'Это текущий адрес',
      emailConfirmSent: 'Ссылка подтверждения отправлена. Нужно подтвердить оба адреса.',
      enterUsername: 'Введите имя пользователя',
      usernameChanged: 'Имя пользователя изменено.',
      avatarSet: 'Аватар установлен.',
      enterEmoji: 'Введите эмодзи',
      passwordMin: 'Минимум 6 символов',
      passwordMismatch: 'Пароли не совпадают',
      passwordSaved: 'Пароль сохранен.',
      googleAlreadyLinked: 'Google уже связан.',
      redirectToGoogle: 'Переход к Google запущен ...',
      googleUnlinked: 'Связь с Google удалена.',
      dataExportDownloaded: 'Экспорт данных скачан.',
      typeDeleteToConfirm: 'Введите LOESCHEN для подтверждения.',
      accountDeleted: 'Аккаунт удален.'
    },
    friends: {
      title: 'Друзья',
      addLabel: 'Добавить друга (username)',
      examplePlaceholder: 'например: maxi42',
      send: 'Отправить',
      tabFriends: 'Друзья',
      tabIncoming: 'Входящие',
      tabOutgoing: 'Исходящие',
      loadFailed: 'Ошибка загрузки',
      requestAccepted: 'Дружба подтверждена!',
      requestSent: 'Запрос отправлен.',
      removeConfirm: 'Удалить этого друга?',
      amountMin: 'Сумма должна быть >= 1',
      sentCoins: '{amount} 🪙 отправлено пользователю {username}',
      noFriends: 'Пока нет друзей. Отправьте запрос!',
      noIncoming: 'Нет входящих запросов.',
      noOutgoing: 'Нет исходящих запросов.',
      profileOf: 'Профиль {username}',
      sendCoinsTitle: 'Отправить монеты',
      offerTradeTitle: 'Предложить обмен',
      removeTitle: 'Удалить',
      wantsToBeFriend: 'хочет добавить вас в друзья',
      waitingForReply: 'ждет ответа',
      sendTo: 'Отправить: {username}',
      yourBalance: 'Ваш баланс: 🪙 {amount}',
      amountPlaceholder: 'Сумма (например 10K)'
    },
    leaderboard: {
      title: 'Таблица лидеров',
      subtitle: 'Самые богатые владельцы зоопарков в мире.',
      subtitleRate: 'Кто зарабатывает больше всех в секунду.',
      byCoins: 'Монеты',
      byRate: 'В секунду',
      you: 'Ты',
      retry: 'Попробовать снова',
      empty: 'Пока пусто.',
      loadFailed: 'Ошибка загрузки'
    },
    send: {
      title: 'Отправка монет',
      subtitle: 'Отправляйте монеты другим игрокам по их username.',
      usernamePlaceholder: 'Username получателя',
      amountPlaceholder: 'Сумма (например 10M)',
      send: 'Отправить',
      sentMessage: '{amount} 🪙 отправлено пользователю {username}.',
      recentTransactions: 'Последние транзакции',
      noTransactions: 'Пока нет транзакций.',
      sent: 'Отправлено',
      received: 'Получено'
    },
    index: {
      title: 'Индекс видов',
      playerNotFound: 'Игрок не найден',
      speciesProgress: '{owned} / {total} видов · записей: {entries}',
      permanentHint: 'Записи остаются навсегда - даже после продажи/обмена.',
      notOwnedYet: 'еще не получено',
      filters: {
        all: 'Все',
        rainbow: 'Радужный',
        epic: 'Эпический',
        diamond: 'Алмазный',
        gold: 'Золотой',
        normal: 'Обычный'
      }
    },
    profile: {
      title: 'Профиль',
      playerNotFound: 'Игрок не найден',
      coinsAndAnimals: '🪙 {coins} · животных: {animals}',
      send: 'Отправить',
      trade: 'Обмен',
      collectionByTier: 'Коллекция по тиру',
      speciesIndex: 'Индекс видов ({owned}/{total})',
      missing: 'нет',
      badges: {
        complete: 'Полная коллекция',
        allGold: 'Все золотые',
        allDiamond: 'Все алмазные',
        allEpic: 'Все эпические',
        allRainbow: 'Все радужные'
      },
      tiers: {
        normal: 'Обычный',
        gold: 'Золотой',
        diamond: 'Алмазный',
        epic: 'Эпический',
        rainbow: 'Радужный'
      }
    },
    inventory: {
      title: 'Инвентарь',
      equipSlots: 'Слоты экипировки',
      max: 'Макс',
      empty: 'Животных пока нет. Зайдите в магазин и купите первое!',
      summary: 'стаков: {groups} · животных: {animals}',
      noFreeSlots: 'Нет свободных слотов - сначала купите слот или снимите животное.',
      active: 'Активные',
      markFavorite: 'Отметить любимцем',
      upgrading: 'Улучшается',
      equipOne: 'Надеть одно',
      unequipOne: 'Снять одно',
      equipAll: 'Надеть все',
      unequipAll: 'Снять все',
      equip: 'Надеть',
      unequip: 'Снять'
    },
    shop: {
      title: 'Магазин',
      animalsTab: 'Животные',
      foodTab: 'Еда',
      nextRotation: 'Следующая ротация через',
      inStock: 'В наличии',
      stockCount: 'Животных: {count}',
      weightMustBePositive: 'Вес должен быть > 0',
      boughtAnimal: '{animal} куплен!',
      chestTitle: 'Сундук',
      chestSubtitle: 'Случайное животное (взвешено по редкости) · 🪙 {price} / шт.',
      thisRotation: 'Эта ротация',
      limitReached: 'Лимит достигнут',
      onlyFree: 'Свободно только {count}',
      openFor: 'Открыть · 🪙 {price}',
      rotationHint: 'Предложение обновляется каждые 5 минут. Каждое животное в списке можно купить один раз.',
      continue: 'Далее',
      restock: 'Ресток',
      perSec: 'сек',
      buy: 'Купить',
      alreadyBought: 'Уже куплено',
      soldOut: 'Распродано',
      foodFedSuccess: '{food} накормлено! ×{mult} буст активен.',
      feedTitle: 'Кормление',
      feedSubtitle: 'Выберите еду для любимца и активируйте буст.',
      noFavoriteSelected: 'Любимец не выбран',
      boostActive: 'Буст активен',
      boostHint: 'Более высокий буст заменяет более низкий; одинаковый продлевает время действия.',
      boost: 'буст',
      minutes: 'мин',
      feedAction: 'Кормить',
      adminPanelTitle: 'Панель админа',
      adminPanelSub: 'Включать животных, делать ресток, запускать ротацию',
      adminRerollNow: 'Сразу обновить',
      adminRestockCount: 'Ресток ×{count}',
      adminRotationCount: 'Ротация ×{count}',
      adminEmpty: 'пусто',
      adminActive: 'вкл',
      adminInactive: 'выкл',
      adminRestockAmount: 'Количество для рестока',
      adminStop: 'Стоп',
      promoTitle: 'Активировать промокод',
      promoSub: 'Введите код и заберите награду.',
      promoPlaceholder: 'КОД',
      promoRedeem: 'Активировать',
      promoRedeeming: 'Активация...',
      promoSuccess: 'Награда получена!',
      promoRewardCoins: '{coins} монет',
      promoRewardTickets: '{tickets} билетов',
      promoRewardSpecies: '{qty}× {emoji} ({tier})',
      promoRewardBoost: '×{mult} буст на {minutes} мин',
      promoRewardTaps: '+{taps} бонус-тапов'
    }
  }
}

export const locale = ref('en')
export const localePreference = ref('system')

function normalizeLocale(value, fallback = 'en') {
  const clean = String(value || '').toLowerCase().trim()
  if (SUPPORTED_LOCALES.includes(clean)) return clean
  if (clean.startsWith('de')) return 'de'
  if (clean.startsWith('ru')) return 'ru'
  if (clean.startsWith('en')) return 'en'
  return fallback
}

function resolveSystemLocale() {
  if (typeof navigator === 'undefined') return 'en'
  return normalizeLocale(navigator.language, 'en')
}

function resolveKey(lang, key) {
  let node = messages[lang]
  for (const part of key.split('.')) {
    node = node?.[part]
    if (node == null) return undefined
  }
  return node
}

function interpolate(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''))
}

function applyDocumentLanguage(lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = LOCALE_TAGS[lang] || 'en-US'
}

export function initLocale() {
  let pref = 'system'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'system') pref = 'system'
    else if (saved) pref = normalizeLocale(saved, 'en')
  } catch {
    pref = 'system'
  }
  localePreference.value = pref
  const effective = pref === 'system' ? resolveSystemLocale() : normalizeLocale(pref, 'en')
  locale.value = effective
  applyDocumentLanguage(effective)
}

export function setLocale(nextLocale) {
  const raw = String(nextLocale || '').toLowerCase().trim()
  const pref = raw === 'system' ? 'system' : normalizeLocale(raw, 'en')
  localePreference.value = pref
  const effective = pref === 'system' ? resolveSystemLocale() : pref
  locale.value = effective
  applyDocumentLanguage(effective)
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {}
}

export function currentLocaleTag() {
  return LOCALE_TAGS[locale.value] || 'en-US'
}

export function t(key, vars = {}) {
  const current = locale.value
  const hit = resolveKey(current, key)
  if (hit != null) return interpolate(hit, vars)
  const fallback = resolveKey('en', key)
  if (fallback != null) return interpolate(fallback, vars)
  return key
}
