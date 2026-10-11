// Texte des Regelwerks als Daten (de/en/ru mit gleicher Abschnittsstruktur).
// Deutsch ist maßgeblich. Platzhalter {operator} (Name, ggf. Anschrift) und
// {operatorEmail} füllt LegalDocument.vue aus OPERATOR (src/legal.js).
// Wesentliche Änderungen ⇒ LEGAL_VERSION in src/legal.js und SQL erhöhen.
// Spec: docs/superpowers/specs/2026-10-11-regelwerk-zustimmung-design.md

export const TERMS = {
  de: {
    title: 'Nutzungsbedingungen und Spielregeln',
    updated: 'Stand: 11. Oktober 2026',
    intro: 'Diese Bedingungen gelten für Zoo Empire im Browser und in der Android-App. Du stimmst ihnen in der App zu, bevor du spielst.',
    sections: [
      {
        title: '1. Anbieter',
        paragraphs: [
          'Zoo Empire wird betrieben von {operator}. Du erreichst uns unter {operatorEmail} oder über den Support-Chat in der App.',
          'Zoo Empire ist kostenlos. Es gibt keine Käufe mit echtem Geld.'
        ]
      },
      {
        title: '2. Dein Konto',
        bullets: [
          'Du darfst mehrere Konten haben, aber immer nur mit einem gleichzeitig spielen.',
          'Halte deine Zugangsdaten geheim. Was über dein Konto passiert, geht auf dich.',
          'Dein Benutzername darf niemanden beleidigen und nicht vorgeben, jemand anderes zu sein.',
          'Wenn du jünger als 16 bist, brauchst du das Einverständnis deiner Eltern.'
        ]
      },
      {
        title: '3. Fair Play',
        bullets: [
          'Makros, Bots und Skripte sind verboten. Das gilt für jede Software, die selbstständig für dich spielt.',
          'Einfache Autoklicker, die dich beim Tippen nur unterstützen, werden geduldet, solange du selbst am Gerät bist und spielst. Das ist eine Duldung und kein Anspruch, wir können sie jederzeit einschränken.',
          'Verändere weder die App noch ihre Verbindung zum Server, und greif nicht an der App vorbei auf unsere Schnittstellen zu.',
          'Fehler im Spiel meldest du im Support-Chat. Einen Fehler bewusst auszunutzen ist ein Verstoß.',
          'Geh respektvoll mit anderen Spielern und dem Support-Team um. Beleidigungen, Drohungen und Spam sind nicht erlaubt.'
        ]
      },
      {
        title: '4. Handel zwischen Spielern',
        paragraphs: [
          'Tausche, Geschenke und Börsen-Geschäfte im Spiel sind freiwillig. Wir sind nicht verpflichtet, sie rückgängig zu machen.',
          'Absprachen und Geschäfte außerhalb des Spiels, auch gegen echtes Geld, sind Sache der Beteiligten. Wir sind daran nicht beteiligt, prüfen sie nicht und ersetzen keine Verluste, etwa bei Betrug.'
        ]
      },
      {
        title: '5. Spielinhalte',
        paragraphs: [
          'Tiere, Coins, Tickets und alle anderen Spielinhalte sind virtuell. Sie gehören nicht dir, du darfst sie im Rahmen des Spiels nutzen. Sie haben keinen Geldwert und können nicht ausgezahlt werden.',
          'Wird etwas durch einen technischen Fehler falsch gutgeschrieben, dürfen wir es korrigieren.'
        ]
      },
      {
        title: '6. Prüfungen und Maßnahmen',
        paragraphs: [
          'Wir prüfen Spielverläufe auf Regelverstöße, teilweise automatisch. Dabei kann die App dich bitten, einen Code einzutippen, bevor du weiterspielst.',
          'Bei einem Verstoß oder einem begründeten Verdacht können wir nach unserem Ermessen:'
        ],
        bullets: [
          'dich verwarnen,',
          'Spielinhalte, Fortschritt oder Ranglisten-Plätze entfernen oder zurücksetzen, auch wenn sie schon umgewandelt oder weitergegeben wurden,',
          'einzelne Funktionen wie Handel oder Ranglisten für dein Konto sperren,',
          'dein Konto befristet oder dauerhaft sperren oder löschen.'
        ],
        after: [
          'Wir sagen dir in der Regel, welche Maßnahme wir ergreifen. Im Support-Chat kannst du dazu Stellung nehmen. Einen Ersatz für entfernte Spielinhalte gibt es nicht.'
        ]
      },
      {
        title: '7. Änderungen am Spiel und Verfügbarkeit',
        paragraphs: [
          'Wir dürfen das Spiel jederzeit weiterentwickeln, ändern, einschränken oder einstellen. Dazu gehören auch Werte, Preise, Ereignisse und Funktionen.',
          'Wir bemühen uns um einen stabilen Betrieb, können aber nicht garantieren, dass das Spiel jederzeit erreichbar ist.'
        ]
      },
      {
        title: '8. Haftung',
        paragraphs: [
          'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper oder Gesundheit. Im Übrigen haften wir nur, soweit das Gesetz es zwingend vorschreibt.'
        ]
      },
      {
        title: '9. Konto löschen, Ende des Spiels',
        paragraphs: [
          'Du kannst dein Konto jederzeit in den Einstellungen löschen. Wir können Konten aus wichtigem Grund löschen und den Betrieb von Zoo Empire beenden. Das Ende des Spiels kündigen wir rechtzeitig in der App an.'
        ]
      },
      {
        title: '10. Änderungen dieser Bedingungen',
        paragraphs: [
          'Wir dürfen diese Bedingungen ändern, zum Beispiel wenn neue Funktionen dazukommen oder sich die Rechtslage ändert. Die neue Fassung zeigen wir dir in der App, und du spielst weiter, sobald du ihr zugestimmt hast. Wenn du nicht zustimmen willst, kannst du dein Konto löschen.'
        ]
      },
      {
        title: '11. Schlussbestimmungen',
        paragraphs: [
          'Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt. Ist eine Bestimmung unwirksam, bleiben die übrigen wirksam. Maßgeblich ist die deutsche Fassung, Übersetzungen dienen dem Verständnis.'
        ]
      }
    ]
  },
  en: {
    title: 'Terms of Use and Game Rules',
    updated: 'Updated: October 11, 2026',
    intro: 'These terms apply to Zoo Empire in the browser and in the Android app. You accept them in the app before you play.',
    sections: [
      {
        title: '1. Provider',
        paragraphs: [
          'Zoo Empire is operated by {operator}. You can reach us at {operatorEmail} or through the support chat in the app.',
          'Zoo Empire is free. There are no purchases with real money.'
        ]
      },
      {
        title: '2. Your account',
        bullets: [
          'You may have several accounts, but only play with one of them at a time.',
          'Keep your login details secret. You are responsible for everything that happens through your account.',
          'Your username must not insult anyone or pretend to be someone else.',
          'If you are younger than 16, you need the consent of your parents.'
        ]
      },
      {
        title: '3. Fair play',
        bullets: [
          'Macros, bots and scripts are forbidden. This applies to any software that plays for you on its own.',
          'Simple auto clickers that only assist your tapping are tolerated as long as you are at your device and playing yourself. This is a tolerance, not a right, and we can restrict it at any time.',
          'Do not modify the app or its connection to the server, and do not access our interfaces outside the app.',
          'Report bugs in the support chat. Deliberately exploiting a bug is a violation.',
          'Treat other players and the support team with respect. Insults, threats and spam are not allowed.'
        ]
      },
      {
        title: '4. Trading between players',
        paragraphs: [
          'Trades, gifts and market deals in the game are voluntary. We are not obliged to reverse them.',
          'Agreements and deals outside the game, including for real money, are a matter for the people involved. We are not involved, do not check them and do not replace losses, for example in case of fraud.'
        ]
      },
      {
        title: '5. Game content',
        paragraphs: [
          'Animals, coins, tickets and all other game content are virtual. They do not belong to you; you may use them within the game. They have no monetary value and cannot be paid out.',
          'If something is credited incorrectly because of a technical error, we may correct it.'
        ]
      },
      {
        title: '6. Checks and measures',
        paragraphs: [
          'We check gameplay for rule violations, partly automatically. The app may ask you to type in a code before you continue playing.',
          'In case of a violation or a well-founded suspicion, we can at our discretion:'
        ],
        bullets: [
          'warn you,',
          'remove or reset game content, progress or leaderboard positions, even if they have already been converted or passed on,',
          'block individual features such as trading or leaderboards for your account,',
          'suspend your account temporarily or permanently or delete it.'
        ],
        after: [
          'We usually tell you which measure we take. You can respond in the support chat. Removed game content is not replaced.'
        ]
      },
      {
        title: '7. Changes to the game and availability',
        paragraphs: [
          'We may develop, change, restrict or discontinue the game at any time. This includes values, prices, events and features.',
          'We aim for stable operation but cannot guarantee that the game is always available.'
        ]
      },
      {
        title: '8. Liability',
        paragraphs: [
          'We are liable without limitation for intent and gross negligence and for injury to life, body or health. Otherwise we are only liable where the law strictly requires it.'
        ]
      },
      {
        title: '9. Deleting your account, end of the game',
        paragraphs: [
          'You can delete your account at any time in the settings. We may delete accounts for good cause and end the operation of Zoo Empire. We will announce the end of the game in the app in good time.'
        ]
      },
      {
        title: '10. Changes to these terms',
        paragraphs: [
          'We may change these terms, for example when new features are added or the legal situation changes. We show you the new version in the app, and you continue playing once you have accepted it. If you do not want to accept it, you can delete your account.'
        ]
      },
      {
        title: '11. Final provisions',
        paragraphs: [
          'German law applies. Mandatory consumer protection rules of your country of residence remain unaffected. If a provision is invalid, the remaining provisions stay valid. The German version is authoritative; translations are for understanding only.'
        ]
      }
    ]
  },
  ru: {
    title: 'Условия использования и правила игры',
    updated: 'Редакция от 11 октября 2026 г.',
    intro: 'Эти условия действуют для Zoo Empire в браузере и в приложении для Android. Вы принимаете их в приложении перед началом игры.',
    sections: [
      {
        title: '1. Оператор',
        paragraphs: [
          'Оператор Zoo Empire: {operator}. Связаться с нами можно по адресу {operatorEmail} или через чат поддержки в приложении.',
          'Zoo Empire бесплатна. Покупок за реальные деньги в игре нет.'
        ]
      },
      {
        title: '2. Ваш аккаунт',
        bullets: [
          'Вы можете иметь несколько аккаунтов, но играть одновременно только с одного из них.',
          'Храните данные для входа в тайне. Вы отвечаете за всё, что происходит через ваш аккаунт.',
          'Имя пользователя не должно никого оскорблять и не должно выдавать вас за другого человека.',
          'Если вам меньше 16 лет, вам нужно согласие родителей.'
        ]
      },
      {
        title: '3. Честная игра',
        bullets: [
          'Макросы, боты и скрипты запрещены. Это касается любых программ, которые играют за вас самостоятельно.',
          'Простые автокликеры, которые лишь помогают вам нажимать, допускаются, пока вы сами находитесь у устройства и играете. Это допущение, а не право, и мы можем ограничить его в любой момент.',
          'Не изменяйте приложение и его соединение с сервером и не обращайтесь к нашим интерфейсам в обход приложения.',
          'Сообщайте об ошибках в игре в чат поддержки. Намеренное использование ошибки является нарушением.',
          'Относитесь с уважением к другим игрокам и команде поддержки. Оскорбления, угрозы и спам запрещены.'
        ]
      },
      {
        title: '4. Торговля между игроками',
        paragraphs: [
          'Обмены, подарки и сделки на бирже в игре добровольны. Мы не обязаны их отменять.',
          'Договорённости и сделки вне игры, в том числе за реальные деньги, касаются только их участников. Мы в них не участвуем, не проверяем их и не возмещаем потери, например при мошенничестве.'
        ]
      },
      {
        title: '5. Игровые ценности',
        paragraphs: [
          'Животные, монеты, билеты и все прочие игровые ценности виртуальны. Они вам не принадлежат, вы можете пользоваться ими в рамках игры. Они не имеют денежной стоимости и не подлежат выплате.',
          'Если что-то было начислено неверно из-за технической ошибки, мы вправе это исправить.'
        ]
      },
      {
        title: '6. Проверки и меры',
        paragraphs: [
          'Мы проверяем ход игры на нарушения правил, частично автоматически. Приложение может попросить вас ввести код, прежде чем продолжить игру.',
          'При нарушении или обоснованном подозрении мы можем по своему усмотрению:'
        ],
        bullets: [
          'вынести вам предупреждение,',
          'удалить или сбросить игровые ценности, прогресс или места в рейтингах, даже если они уже были преобразованы или переданы,',
          'заблокировать для вашего аккаунта отдельные функции, например обмен или рейтинги,',
          'временно или навсегда заблокировать или удалить ваш аккаунт.'
        ],
        after: [
          'Как правило, мы сообщаем вам о принятой мере. Вы можете высказаться в чате поддержки. Удалённые игровые ценности не возмещаются.'
        ]
      },
      {
        title: '7. Изменения игры и доступность',
        paragraphs: [
          'Мы вправе в любое время развивать, изменять, ограничивать или прекращать игру. Это касается и значений, цен, событий и функций.',
          'Мы стремимся к стабильной работе, но не можем гарантировать, что игра будет доступна всегда.'
        ]
      },
      {
        title: '8. Ответственность',
        paragraphs: [
          'Мы несём неограниченную ответственность за умысел и грубую неосторожность, а также за вред жизни, телу или здоровью. В остальном мы отвечаем только в случаях, прямо предусмотренных законом.'
        ]
      },
      {
        title: '9. Удаление аккаунта, окончание игры',
        paragraphs: [
          'Вы можете в любое время удалить свой аккаунт в настройках. Мы вправе удалять аккаунты по уважительной причине и прекратить работу Zoo Empire. Об окончании игры мы заранее сообщим в приложении.'
        ]
      },
      {
        title: '10. Изменение этих условий',
        paragraphs: [
          'Мы вправе изменять эти условия, например при появлении новых функций или изменении законодательства. Новую редакцию мы покажем вам в приложении, и вы продолжите игру после того, как примете её. Если вы не хотите её принимать, вы можете удалить свой аккаунт.'
        ]
      },
      {
        title: '11. Заключительные положения',
        paragraphs: [
          'Применяется немецкое право. Обязательные нормы защиты прав потребителей страны вашего проживания остаются в силе. Если какое-либо положение недействительно, остальные положения сохраняют силу. Решающее значение имеет немецкая редакция, переводы служат только для понимания.'
        ]
      }
    ]
  }
}

export const PRIVACY = {
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Stand: 11. Oktober 2026',
    intro: 'Hier steht, welche personenbezogenen Daten bei Zoo Empire (Browser und Android-App) verarbeitet werden, wozu, wie lange und welche Rechte du hast.',
    sections: [
      {
        title: '1. Verantwortlicher',
        paragraphs: [
          'Verantwortlich ist {operator}. Fragen zum Datenschutz schickst du an {operatorEmail} oder über den Support-Chat in der App.'
        ]
      },
      {
        title: '2. Konto und Anmeldung',
        paragraphs: [
          'Für ein Konto speichern wir deine E-Mail-Adresse und eine technische Konto-ID. Du meldest dich mit Passwort (gespeichert nur als Hash), mit einem Einmal-Link per E-Mail oder mit deinem Google-Konto an. Bei der Google-Anmeldung erhalten wir von Google deine E-Mail-Adresse und die Angaben, die Google für die Anmeldung übermittelt.',
          'Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).'
        ]
      },
      {
        title: '3. Spielstand und Spielverlauf',
        paragraphs: ['Damit das Spiel funktioniert, speichern wir:'],
        bullets: [
          'Profil: Benutzername, Avatar, Einstellungen, Coins, Tickets und Stufen',
          'Tiere, Eier, Futter und Fortschritt in Minispielen und Ereignissen',
          'Tausche, Geschenke, Börsen-Angebote, Freundschaften und Transaktionen',
          'Käufe von Truhen und Shop-Tieren je 5-Minuten-Rotation mit Zeitpunkt',
          'wann du welche Fassung der Nutzungsbedingungen und dieser Erklärung akzeptiert hast'
        ],
        after: ['Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.']
      },
      {
        title: '4. Was andere Spieler sehen',
        bullets: [
          'deinen Benutzernamen, deinen Avatar und deine Werte in den Ranglisten (z. B. Coins)',
          'deine öffentlichen Tauschangebote und Börsen-Angebote mit Benutzernamen',
          'in der Zoo-Welt deinen Benutzernamen, dein Aussehen, deine Position und deine ausgerüsteten Tiere',
          'Freunde sehen zusätzlich deinen Coin-Stand'
        ],
        after: [
          'Wenn du bei der Anmeldung keinen Benutzernamen wählst, wird anfangs der Teil deiner E-Mail-Adresse vor dem @ verwendet. Du kannst ihn in den Einstellungen ändern.'
        ]
      },
      {
        title: '5. Fair Play und Schutz vor Missbrauch',
        paragraphs: [
          'Um unerlaubte Automatisierung und andere Regelverstöße zu erkennen, werten wir Zeitpunkte und Häufigkeit deiner Spielaktionen aus, außerdem statistische Kennzahlen zu Klickfolgen im Spiel. Bildschirminhalte oder Eingaben außerhalb des Spiels erfassen wir nicht.',
          'Die Aktivität pro 5-Minuten-Abschnitt wird nach 2 Tagen gelöscht. Prüfungen, die angeschlagen haben, bewahren wir mit dem zugehörigen Support-Ticket auf, damit Entscheidungen nachvollziehbar bleiben. Über Maßnahmen entscheidet immer ein Mensch aus dem Admin-Team.',
          'Rechtsgrundlage ist unser berechtigtes Interesse an einem fairen Spiel für alle (Art. 6 Abs. 1 lit. f DSGVO).'
        ]
      },
      {
        title: '6. Support',
        paragraphs: [
          'Wenn du den Support-Chat nutzt, speichern wir deine Nachrichten, deinen Benutzernamen und deine E-Mail-Adresse. Über neue Tickets wird das Admin-Team per E-Mail benachrichtigt, auf Wunsch bekommst du eine Kopie. Für den E-Mail-Versand nutzen wir Resend.',
          'Support-Tickets bleiben auch nach einer Kontolöschung erhalten, damit Anfragen und Entscheidungen nachvollziehbar bleiben. Auf Anfrage löschen wir sie, sobald keine offenen Vorgänge mehr bestehen.'
        ]
      },
      {
        title: '7. Server-Protokolle',
        paragraphs: [
          'Bei jedem Zugriff auf unseren Server werden technisch IP-Adresse, Zeitpunkt, aufgerufene Funktion sowie Browser- und Geräteangaben protokolliert. Wir nutzen diese Protokolle für Sicherheit, Fehlersuche und die Aufklärung von Missbrauch. Sie werden derzeit nach etwa 24 Stunden gelöscht.',
          'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.'
        ]
      },
      {
        title: '8. Dienstleister',
        bullets: [
          'Supabase (Datenbank, Anmeldung, Server): Die Datenbank liegt in der EU-Region Stockholm (Schweden). Supabase nutzt für die Auslieferung Cloudflare.',
          'Vercel (Auslieferung der Web-App sowie Vercel Web Analytics und Speed Insights): Erfasst werden Seitenaufrufe und Ladezeiten ohne Cookies.',
          'Resend (Versand von Support-E-Mails)',
          'Google (Anmeldung mit Google, nur wenn du sie nutzt)',
          'Google Fonts: Schriftarten werden beim Laden der Seite von Servern von Google geladen. Dabei erhält Google deine IP-Adresse.'
        ],
        after: [
          'Mit den Dienstleistern bestehen, soweit erforderlich, Verträge zur Auftragsverarbeitung. Einige sitzen in den USA. Daten werden dorthin auf Grundlage des EU-US Data Privacy Framework oder von EU-Standardvertragsklauseln übermittelt.'
        ]
      },
      {
        title: '9. Speicher auf deinem Gerät',
        paragraphs: [
          'Die App speichert im Browser bzw. auf deinem Gerät deine Anmeldesitzung, Einstellungen wie Sprache und Design, den Fortschritt von Anleitungen und einige Spiel-Hilfswerte. Das ist für den Betrieb nötig (§ 25 Abs. 2 TDDDG). Tracking- oder Werbe-Cookies setzen wir nicht.',
          'Die Android-App braucht nur Internetzugriff. Sie nutzt weder Standort noch Kamera oder Push-Nachrichten.'
        ]
      },
      {
        title: '10. Speicherdauer und Löschung',
        paragraphs: [
          'Deine Konto- und Spieldaten speichern wir, solange du dein Konto hast. In den Einstellungen kannst du dein Konto jederzeit löschen. Dabei werden dein Konto und die zugeordneten Spieldaten entfernt.',
          'Erhalten bleiben Support-Tickets (siehe Abschnitt 6) sowie Transaktionen und Börsen-Abschlüsse ohne Zuordnung zu deinem Konto, weil sie auch andere Spieler betreffen.'
        ]
      },
      {
        title: '11. Deine Rechte',
        bullets: [
          'Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)',
          'Berichtigung (Art. 16) und Löschung (Art. 17)',
          'Einschränkung der Verarbeitung (Art. 18)',
          'Datenübertragbarkeit (Art. 20)',
          'Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21)',
          'Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77)'
        ],
        after: [
          'In den Einstellungen kannst du einen Export deiner Daten herunterladen und dein Konto löschen. Für alles Weitere schreib uns an {operatorEmail} oder im Support-Chat.'
        ]
      },
      {
        title: '12. Kinder und Jugendliche',
        paragraphs: [
          'Wenn du jünger als 16 bist, brauchst du für die Nutzung das Einverständnis deiner Eltern.'
        ]
      },
      {
        title: '13. Änderungen',
        paragraphs: [
          'Ändert sich diese Erklärung wesentlich, zeigen wir dir die neue Fassung in der App und bitten um deine Zustimmung.'
        ]
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Updated: October 11, 2026',
    intro: 'This explains which personal data is processed for Zoo Empire (browser and Android app), for what purpose, for how long, and which rights you have.',
    sections: [
      {
        title: '1. Controller',
        paragraphs: [
          'The controller is {operator}. Send questions about data protection to {operatorEmail} or through the support chat in the app.'
        ]
      },
      {
        title: '2. Account and sign-in',
        paragraphs: [
          'For an account we store your email address and a technical account ID. You sign in with a password (stored only as a hash), with a one-time link sent by email, or with your Google account. When you sign in with Google, we receive your email address and the details that Google transmits for the sign-in.',
          'The legal basis is the performance of the user contract (Art. 6(1)(b) GDPR).'
        ]
      },
      {
        title: '3. Game progress and gameplay',
        paragraphs: ['So that the game works, we store:'],
        bullets: [
          'Profile: username, avatar, settings, coins, tickets and levels',
          'Animals, eggs, food and progress in mini-games and events',
          'Trades, gifts, market offers, friendships and transactions',
          'Purchases of chests and shop animals per 5-minute rotation, with time',
          'when you accepted which version of these terms and of this policy'
        ],
        after: ['The legal basis is Art. 6(1)(b) GDPR.']
      },
      {
        title: '4. What other players see',
        bullets: [
          'your username, your avatar and your values in the rankings (e.g. coins)',
          'your public trade offers and market offers, with your username',
          'in the Zoo World, your username, your appearance, your position and your equipped animals',
          'friends also see your coin balance'
        ],
        after: [
          'If you do not choose a username when you sign up, the part of your email address before the @ is used at first. You can change it in the settings.'
        ]
      },
      {
        title: '5. Fair play and protection against misuse',
        paragraphs: [
          'To detect unauthorized automation and other violations, we analyze the timing and frequency of your game actions, as well as statistical figures on click sequences in the game. We do not record screen content or inputs outside the game.',
          'Activity per 5-minute segment is deleted after 2 days. Checks that triggered are kept together with the associated support ticket so that decisions remain traceable. A human member of the admin team always decides on measures.',
          'The legal basis is our legitimate interest in a fair game for everyone (Art. 6(1)(f) GDPR).'
        ]
      },
      {
        title: '6. Support',
        paragraphs: [
          'If you use the support chat, we store your messages, your username and your email address. The admin team is notified of new tickets by email, and on request you receive a copy. We use Resend to send emails.',
          'Support tickets are retained even after an account deletion so that requests and decisions remain traceable. On request, we delete them as soon as there are no open matters left.'
        ]
      },
      {
        title: '7. Server logs',
        paragraphs: [
          'With every access to our server, the IP address, time, function called, and browser and device information are technically logged. We use these logs for security, troubleshooting and investigating misuse. They are currently deleted after about 24 hours.',
          'The legal basis is Art. 6(1)(f) GDPR.'
        ]
      },
      {
        title: '8. Service providers',
        bullets: [
          'Supabase (database, sign-in, servers): The database is located in the EU region Stockholm (Sweden). Supabase uses Cloudflare for delivery.',
          'Vercel (delivery of the web app as well as Vercel Web Analytics and Speed Insights): Page views and load times are recorded without cookies.',
          'Resend (sending support emails)',
          'Google (sign-in with Google, only if you use it)',
          'Google Fonts: Fonts are loaded from Google servers when the page loads. In the process, Google receives your IP address.'
        ],
        after: [
          'Where necessary, we have data processing agreements with the service providers. Some of them are located in the USA. Data is transferred there on the basis of the EU-US Data Privacy Framework or EU standard contractual clauses.'
        ]
      },
      {
        title: '9. Storage on your device',
        paragraphs: [
          'The app stores in your browser or on your device your sign-in session, settings such as language and theme, the progress of tutorials, and some game helper values. This is necessary for operation (§ 25 Abs. 2 TDDDG). We do not set tracking or advertising cookies.',
          'The Android app only needs internet access. It uses neither location, camera nor push notifications.'
        ]
      },
      {
        title: '10. Retention period and deletion',
        paragraphs: [
          'We store your account and game data for as long as you have your account. You can delete your account at any time in the settings. This removes your account and the associated game data.',
          'The following are retained: support tickets (see section 6), as well as transactions and market trades that are not assigned to your account, because they also affect other players.'
        ]
      },
      {
        title: '11. Your rights',
        bullets: [
          'access to the data stored about you (Art. 15 GDPR)',
          'rectification (Art. 16) and erasure (Art. 17)',
          'restriction of processing (Art. 18)',
          'data portability (Art. 20)',
          'objection to processing based on legitimate interests (Art. 21)',
          'complaint to a data protection supervisory authority (Art. 77)'
        ],
        after: [
          'In the settings you can download an export of your data and delete your account. For anything else, write to us at {operatorEmail} or in the support chat.'
        ]
      },
      {
        title: '12. Children and young people',
        paragraphs: [
          'If you are under 16, you need the consent of your parents to use the service.'
        ]
      },
      {
        title: '13. Changes',
        paragraphs: [
          'If this policy changes materially, we will show you the new version in the app and ask for your consent.'
        ]
      }
    ]
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Редакция от 11 октября 2026 г.',
    intro: 'Здесь описано, какие персональные данные обрабатываются в Zoo Empire (браузер и приложение для Android), для чего, как долго и какими правами вы обладаете.',
    sections: [
      {
        title: '1. Ответственный за обработку',
        paragraphs: [
          'Ответственный за обработку: {operator}. Вопросы о защите данных направляйте на {operatorEmail} или через чат поддержки в приложении.'
        ]
      },
      {
        title: '2. Аккаунт и вход',
        paragraphs: [
          'Для аккаунта мы храним ваш адрес электронной почты и технический идентификатор аккаунта. Вы входите с паролем (хранится только в виде хеша), по одноразовой ссылке, отправленной на почту, или с помощью аккаунта Google. При входе через Google мы получаем от Google ваш адрес электронной почты и сведения, которые Google передает для входа.',
          'Правовое основание: исполнение договора об использовании сервисом (ст. 6 ч. 1 лит. b GDPR).'
        ]
      },
      {
        title: '3. Состояние игры и игровой процесс',
        paragraphs: ['Чтобы игра работала, мы сохраняем:'],
        bullets: [
          'Профиль: имя пользователя, аватар, настройки, монеты, билеты и уровни',
          'Животных, яйца, корм и прогресс в мини-играх и событиях',
          'Обмены, подарки, предложения на бирже, дружбу и транзакции',
          'Покупки сундуков и животных из магазина по каждому 5-минутному циклу с указанием времени',
          'когда вы приняли какую версию этих условий и этой политики'
        ],
        after: ['Правовое основание: ст. 6 ч. 1 лит. b GDPR.']
      },
      {
        title: '4. Что видят другие игроки',
        bullets: [
          'ваше имя пользователя, аватар и ваши показатели в рейтингах (например, монеты)',
          'ваши публичные предложения обмена и предложения на бирже с указанием имени пользователя',
          'в Зоо-мире ваше имя пользователя, внешний вид, позицию и экипированных животных',
          'друзья дополнительно видят ваш баланс монет'
        ],
        after: [
          'Если при входе вы не выберете имя пользователя, сначала используется часть вашего адреса электронной почты до знака @. Изменить его можно в настройках.'
        ]
      },
      {
        title: '5. Честная игра и защита от злоупотреблений',
        paragraphs: [
          'Чтобы выявлять недопустимую автоматизацию и другие нарушения, мы анализируем время и частоту ваших игровых действий, а также статистические показатели последовательностей кликов в игре. Содержимое экрана или ввод вне игры мы не записываем.',
          'Данные об активности за каждый 5-минутный отрезок удаляются через 2 дня. Сработавшие проверки мы храним вместе с относящимся к ним тикетом поддержки, чтобы решения оставались прослеживаемыми. О мерах всегда решает человек из команды администраторов.',
          'Правовое основание: наш законный интерес в честной игре для всех (ст. 6 ч. 1 лит. f GDPR).'
        ]
      },
      {
        title: '6. Поддержка',
        paragraphs: [
          'Если вы пользуетесь чатом поддержки, мы сохраняем ваши сообщения, имя пользователя и адрес электронной почты. О новых тикетах команда администраторов уведомляется по электронной почте, по вашему желанию вы получаете копию. Для отправки писем мы используем Resend.',
          'Тикеты поддержки сохраняются и после удаления аккаунта, чтобы обращения и решения оставались прослеживаемыми. По запросу мы удаляем их, как только не останется открытых обращений.'
        ]
      },
      {
        title: '7. Серверные журналы',
        paragraphs: [
          'При каждом обращении к нашему серверу технически фиксируются IP-адрес, время, вызванная функция, а также данные о браузере и устройстве. Мы используем эти журналы для безопасности, поиска ошибок и выяснения случаев злоупотреблений. Сейчас они удаляются примерно через 24 часа.',
          'Правовое основание: ст. 6 ч. 1 лит. f GDPR.'
        ]
      },
      {
        title: '8. Поставщики услуг',
        bullets: [
          'Supabase (база данных, вход, серверы): база данных находится в регионе ЕС Стокгольм (Швеция). Для доставки Supabase использует Cloudflare.',
          'Vercel (доставка веб-приложения, а также Vercel Web Analytics и Speed Insights): фиксируются просмотры страниц и время загрузки без файлов cookie.',
          'Resend (отправка писем службы поддержки)',
          'Google (вход через Google, только если вы им пользуетесь)',
          'Google Fonts: шрифты загружаются с серверов Google при загрузке страницы. При этом Google получает ваш IP-адрес.'
        ],
        after: [
          'При необходимости с поставщиками услуг заключены договоры о поручении обработки данных. Некоторые из них находятся в США. Данные передаются туда на основании EU-US Data Privacy Framework или стандартных договорных оговорок ЕС.'
        ]
      },
      {
        title: '9. Хранение на вашем устройстве',
        paragraphs: [
          'Приложение сохраняет в браузере или на вашем устройстве сессию входа, настройки, например язык и оформление, прогресс обучающих подсказок и некоторые вспомогательные игровые значения. Это необходимо для работы (§ 25 Abs. 2 TDDDG). Трекинговые и рекламные файлы cookie мы не используем.',
          'Приложению для Android нужен только доступ в интернет. Оно не использует геолокацию, камеру или push-уведомления.'
        ]
      },
      {
        title: '10. Срок хранения и удаление',
        paragraphs: [
          'Данные вашего аккаунта и игры мы храним, пока у вас есть аккаунт. В настройках вы можете удалить аккаунт в любое время. При этом удаляются ваш аккаунт и связанные с ним игровые данные.',
          'Сохраняются тикеты поддержки (см. раздел 6), а также транзакции и сделки на бирже, которые не привязаны к вашему аккаунту, поскольку они касаются и других игроков.'
        ]
      },
      {
        title: '11. Ваши права',
        bullets: [
          'доступ к сохраненным о вас данным (ст. 15 GDPR)',
          'исправление (ст. 16) и удаление (ст. 17)',
          'ограничение обработки (ст. 18)',
          'переносимость данных (ст. 20)',
          'возражение против обработки на основании законных интересов (ст. 21)',
          'жалоба в надзорный орган по защите данных (ст. 77)'
        ],
        after: [
          'В настройках вы можете скачать экспорт своих данных и удалить аккаунт. По всем остальным вопросам пишите нам на {operatorEmail} или в чат поддержки.'
        ]
      },
      {
        title: '12. Дети и подростки',
        paragraphs: [
          'Если вам нет 16 лет, для использования сервиса необходимо согласие родителей.'
        ]
      },
      {
        title: '13. Изменения',
        paragraphs: [
          'Если эта политика существенно изменится, мы покажем вам новую редакцию в приложении и попросим дать согласие.'
        ]
      }
    ]
  }
}
