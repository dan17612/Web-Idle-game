// Texte des Regelwerks als Daten (de/en/ru mit gleicher Abschnittsstruktur).
// Deutsch ist maßgeblich. Platzhalter {operatorName}, {operatorAddress},
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
          'Zoo Empire wird betrieben von {operatorName}, {operatorAddress}. Du erreichst uns unter {operatorEmail} oder über den Support-Chat in der App.',
          'Zoo Empire ist kostenlos. Es gibt keine Käufe mit echtem Geld.'
        ]
      },
      {
        title: '2. Dein Konto',
        bullets: [
          'Pro Person ist ein Konto erlaubt.',
          'Zweitkonten, die einem anderen Konto Tiere, Coins oder Tickets zuschieben, sind verboten.',
          'Halte deine Zugangsdaten geheim. Was über dein Konto passiert, geht auf dich.',
          'Dein Benutzername darf niemanden beleidigen und nicht vorgeben, jemand anderes zu sein.',
          'Wenn du jünger als 16 bist, brauchst du das Einverständnis deiner Eltern.'
        ]
      },
      {
        title: '3. Fair Play',
        paragraphs: ['Damit das Spiel für alle fair bleibt, gelten diese Regeln:'],
        bullets: [
          'Spiel selbst. Makros, Autoklicker, Bots, Skripte und jede andere Software, die für dich tippt, klickt oder kauft, sind verboten. Das gilt auch, wenn so ein Programm nur zeitweise läuft, zum Beispiel über Nacht.',
          'Verändere weder die App noch ihre Verbindung zum Server, und greif nicht an der App vorbei auf unsere Schnittstellen zu.',
          'Fehler im Spiel meldest du im Support-Chat. Einen Fehler bewusst auszunutzen ist ein Verstoß.',
          'Konten, Tiere, Coins, Tickets und andere Spielinhalte dürfen nicht gegen echtes Geld oder andere Gegenleistungen außerhalb des Spiels gehandelt werden.',
          'Geh respektvoll mit anderen Spielern und dem Support-Team um. Beleidigungen, Drohungen und Spam sind nicht erlaubt.'
        ]
      },
      {
        title: '4. Spielinhalte',
        paragraphs: [
          'Tiere, Coins, Tickets und alle anderen Spielinhalte sind virtuell. Sie haben keinen Geldwert und können nicht ausgezahlt werden.',
          'Wir entwickeln das Spiel weiter und können dabei Werte, Preise, Ereignisse und Funktionen ändern. Wird etwas durch einen technischen Fehler falsch gutgeschrieben, dürfen wir es korrigieren.'
        ]
      },
      {
        title: '5. Prüfungen und Maßnahmen bei Verstößen',
        paragraphs: [
          'Wir prüfen Spielverläufe auf Regelverstöße, teilweise automatisch. Bei Hinweisen auf automatisiertes Spielen kann die App dich bitten, einen Code einzutippen, bevor du weiterspielst.',
          'Je nach Schwere eines Verstoßes können wir:'
        ],
        bullets: [
          'dich verwarnen,',
          'Spielinhalte entfernen, die durch den Verstoß entstanden sind, auch wenn sie schon umgewandelt oder an ein anderes Konto weitergegeben wurden,',
          'dein Konto befristet sperren,',
          'dein Konto dauerhaft sperren.'
        ],
        after: [
          'Wir sagen dir, welche Maßnahme wir ergreifen und warum. Im Support-Chat kannst du dazu Stellung nehmen.'
        ]
      },
      {
        title: '6. Verfügbarkeit',
        paragraphs: [
          'Wir bemühen uns um einen stabilen Betrieb, können aber nicht garantieren, dass das Spiel jederzeit erreichbar ist. Ereignisse und Minispiele können zeitlich begrenzt sein.'
        ]
      },
      {
        title: '7. Haftung',
        paragraphs: [
          'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper oder Gesundheit. Im Übrigen haften wir nur, soweit das Gesetz es zwingend vorschreibt.'
        ]
      },
      {
        title: '8. Konto löschen, Ende des Spiels',
        paragraphs: [
          'Du kannst dein Konto jederzeit in den Einstellungen löschen. Wir können den Betrieb von Zoo Empire beenden und kündigen das rechtzeitig in der App an.'
        ]
      },
      {
        title: '9. Änderungen',
        paragraphs: [
          'Ändern wir diese Bedingungen wesentlich, zeigen wir dir die neue Fassung in der App. Weiterspielen kannst du, sobald du ihr zugestimmt hast.'
        ]
      },
      {
        title: '10. Schlussbestimmungen',
        paragraphs: [
          'Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt. Maßgeblich ist die deutsche Fassung, Übersetzungen dienen dem Verständnis.'
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
          'Zoo Empire is operated by {operatorName}, {operatorAddress}. You can reach us at {operatorEmail} or through the support chat in the app.',
          'Zoo Empire is free of charge. There are no purchases with real money.'
        ]
      },
      {
        title: '2. Your account',
        bullets: [
          'One account per person is allowed.',
          'Second accounts that send animals, coins or tickets to another account are forbidden.',
          'Keep your login details secret. Whatever happens through your account is your responsibility.',
          'Your username must not insult anyone or pretend to be someone else.',
          'If you are under 16, you need the consent of your parents.'
        ]
      },
      {
        title: '3. Fair play',
        paragraphs: ['To keep the game fair for everyone, these rules apply:'],
        bullets: [
          'Play yourself. Macros, auto clickers, bots, scripts and any other software that taps, clicks or buys for you are forbidden. This also applies if such a program only runs now and then, for example overnight.',
          'Do not modify the app or its connection to the server, and do not access our interfaces by bypassing the app.',
          'Report bugs in the game through the support chat. Deliberately exploiting a bug is a violation.',
          'Accounts, animals, coins, tickets and other game content may not be traded for real money or other considerations outside the game.',
          'Treat other players and the support team with respect. Insults, threats and spam are not allowed.'
        ]
      },
      {
        title: '4. Game content',
        paragraphs: [
          'Animals, coins, tickets and all other game content are virtual. They have no monetary value and cannot be paid out.',
          'We keep developing the game and may change values, prices, events and features in the process. If something is credited incorrectly because of a technical error, we may correct it.'
        ]
      },
      {
        title: '5. Checks and measures for violations',
        paragraphs: [
          'We check game activity for violations, partly automatically. If there are signs of automated play, the app may ask you to type in a code before you continue playing.',
          'Depending on how serious a violation is, we may:'
        ],
        bullets: [
          'warn you,',
          'remove game content that resulted from the violation, even if it has already been converted or passed on to another account,',
          'temporarily suspend your account,',
          'permanently suspend your account.'
        ],
        after: [
          'We tell you which measure we take and why. In the support chat you can state your position.'
        ]
      },
      {
        title: '6. Availability',
        paragraphs: [
          'We work to keep operations stable, but we cannot guarantee that the game is available at all times. Events and mini-games may be time-limited.'
        ]
      },
      {
        title: '7. Liability',
        paragraphs: [
          'We are liable without limitation for intent and gross negligence, and for damage to life, body or health. Otherwise we are only liable to the extent that the law mandatorily requires it.'
        ]
      },
      {
        title: '8. Deleting your account, end of the game',
        paragraphs: [
          'You can delete your account at any time in the settings. We may stop operating Zoo Empire, and we will announce this in good time in the app.'
        ]
      },
      {
        title: '9. Changes',
        paragraphs: [
          'If we make material changes to these terms, we will show you the new version in the app. You can continue playing as soon as you have agreed to it.'
        ]
      },
      {
        title: '10. Final provisions',
        paragraphs: [
          'German law applies. Mandatory consumer protection rules of your country of residence remain unaffected. The German version is authoritative; translations are provided only to aid understanding.'
        ]
      }
    ]
  },
  ru: {
    title: 'Условия использования и правила игры',
    updated: 'Редакция от 11 октября 2026 г.',
    intro: 'Эти условия действуют для Zoo Empire в браузере и в приложении для Android. Вы соглашаетесь с ними в приложении до начала игры.',
    sections: [
      {
        title: '1. Оператор',
        paragraphs: [
          'Оператор Zoo Empire: {operatorName}, {operatorAddress}. Связаться с нами можно по адресу {operatorEmail} или через чат поддержки в приложении.',
          'Zoo Empire бесплатна. Покупок за реальные деньги в игре нет.'
        ]
      },
      {
        title: '2. Ваш аккаунт',
        bullets: [
          'На одного человека допускается один аккаунт.',
          'Запрещены дополнительные аккаунты, которые передают другому аккаунту животных, монеты или билеты.',
          'Храните свои данные для входа в тайне. За все, что происходит через ваш аккаунт, отвечаете вы.',
          'Имя пользователя не должно оскорблять других людей и выдавать вас за другого человека.',
          'Если вам нет 16 лет, необходимо согласие родителей.'
        ]
      },
      {
        title: '3. Честная игра',
        paragraphs: ['Чтобы игра оставалась честной для всех, действуют следующие правила:'],
        bullets: [
          'Играйте сами. Макросы, автокликеры, боты, скрипты и любое другое ПО, которое нажимает, кликает или покупает за вас, запрещено. Это относится и к программам, которые работают лишь время от времени, например ночью.',
          'Не изменяйте приложение и его соединение с сервером и не обращайтесь к нашим интерфейсам в обход приложения.',
          'Об ошибках в игре сообщайте в чат поддержки. Намеренное использование ошибки является нарушением правил.',
          'Аккаунты, животных, монеты, билеты и другой игровой контент нельзя продавать за реальные деньги или обменивать на иные встречные предоставления вне игры.',
          'Уважительно относитесь к другим игрокам и команде поддержки. Оскорбления, угрозы и спам не допускаются.'
        ]
      },
      {
        title: '4. Игровой контент',
        paragraphs: [
          'Животные, монеты, билеты и весь остальной игровой контент виртуальны. У них нет денежной стоимости, и их нельзя выплатить.',
          'Мы продолжаем развивать игру и можем при этом менять значения, цены, события и функции. Если из-за технической ошибки что-то зачислено неверно, мы вправе это исправить.'
        ]
      },
      {
        title: '5. Проверки и меры при нарушениях',
        paragraphs: [
          'Мы проверяем игровой процесс на нарушения, частично автоматически. При признаках автоматизированной игры приложение может попросить вас ввести код, прежде чем вы продолжите играть.',
          'В зависимости от тяжести нарушения мы можем:'
        ],
        bullets: [
          'вынести вам предупреждение,',
          'удалить игровой контент, возникший в результате нарушения, даже если он уже был преобразован или передан другому аккаунту,',
          'временно заблокировать ваш аккаунт,',
          'заблокировать ваш аккаунт навсегда.'
        ],
        after: [
          'Мы сообщаем вам, какую меру принимаем и почему. В чате поддержки вы можете дать свои пояснения.'
        ]
      },
      {
        title: '6. Доступность',
        paragraphs: [
          'Мы стараемся обеспечивать стабильную работу, но не можем гарантировать, что игра будет доступна в любое время. События и мини-игры могут быть ограничены по времени.'
        ]
      },
      {
        title: '7. Ответственность',
        paragraphs: [
          'Мы несём неограниченную ответственность за умысел и грубую неосторожность, а также за ущерб жизни, телу или здоровью. В остальных случаях мы отвечаем только в той мере, в какой это прямо предписано законом.'
        ]
      },
      {
        title: '8. Удаление аккаунта, окончание игры',
        paragraphs: [
          'Вы можете удалить свой аккаунт в любое время в настройках. Мы можем прекратить работу Zoo Empire и заблаговременно объявим об этом в приложении.'
        ]
      },
      {
        title: '9. Изменения',
        paragraphs: [
          'Если мы существенно изменим эти условия, мы покажем вам новую редакцию в приложении. Продолжить игру можно будет после того, как вы с ней согласитесь.'
        ]
      },
      {
        title: '10. Заключительные положения',
        paragraphs: [
          'Применяется немецкое право. Обязательные нормы защиты прав потребителей по месту вашего проживания остаются в силе. Решающее значение имеет немецкая редакция, переводы служат только для лучшего понимания.'
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
          'Verantwortlich ist {operatorName}, {operatorAddress}. Fragen zum Datenschutz schickst du an {operatorEmail} oder über den Support-Chat in der App.'
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
          'Um Makros, Autoklicker und andere Regelverstöße zu erkennen, werten wir Zeitpunkte und Häufigkeit deiner Spielaktionen aus, außerdem statistische Kennzahlen zu Klickfolgen im Spiel. Bildschirminhalte oder Eingaben außerhalb des Spiels erfassen wir nicht.',
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
          'The controller is {operatorName}, {operatorAddress}. Send questions about data protection to {operatorEmail} or through the support chat in the app.'
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
          'To detect macros, auto clickers and other violations, we analyze the timing and frequency of your game actions, as well as statistical figures on click sequences in the game. We do not record screen content or inputs outside the game.',
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
          'Ответственный за обработку: {operatorName}, {operatorAddress}. Вопросы о защите данных направляйте на {operatorEmail} или через чат поддержки в приложении.'
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
          'Чтобы выявлять макросы, автокликеры и другие нарушения, мы анализируем время и частоту ваших игровых действий, а также статистические показатели последовательностей кликов в игре. Содержимое экрана или ввод вне игры мы не записываем.',
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
