# Testabdeckung

| Nr. | Testgegenstand | Benutzergruppe(n) | Status | Testdatei(en) | Hinweise |
|-----|----------------|-------------------|--------|---------------|----------|
| 1 | Anmelden Verschiedene Usergruppen | Schüler, Schulbegleiter, Lehrkraft, Ersatzschullehrkraft, Schuladmin (1/mehrere Schulen), Landesadmin, Entsperrte Benutzerin | ⚠️ | `tests/Authentifizierung.spec.ts` | Nur der Root-Admin (Landesadmin) wird im dedizierten Login-Test explizit getestet. Andere Benutzergruppen loggen sich als Vorbedingung in anderen Testfällen ein, sind aber nicht Gegenstand eines eigenen Login-Tests. Schulbegleiter gar nicht abgedeckt. |
| 2 | Anmelden Negativtests | Falsche Logindaten, Gesperrter Nutzer, Gelöschte Nutzerin | ⚠️ | `tests/Authentifizierung.spec.ts` | „Falsche Logindaten" und „Gesperrter Nutzer" sind abgedeckt. „Gelöschte Nutzerin" fehlt komplett. |
| 3 | Abmelden Verschiedene Usergruppen | Schüler, Schulbegleiter, Lehrkraft, Ersatzschullehrkraft, Schuladmin (1/mehrere Schulen), Landesadmin, Entsperrte Benutzerin | ⚠️ | `tests/Authentifizierung.spec.ts` | Nur für Root-Admin (Landesadmin) explizit getestet. Logout anderer Benutzergruppen findet lediglich als afterEach-Teardown in anderen Tests statt, nicht als dedizierter Testfall. |
| 4 | 2FA einrichten | Lehr, Schuladmin, Landesadmin | ✅ | `tests/ZweiFaktorAuthEinrichten.spec.ts` | Lehr via eigenes Profil; Schuladmin und Landesadmin via Admin-Oberfläche (Token hinzufügen + Status prüfen). Alle drei Rollen explizit abgedeckt. |
| 5 | 2FA einrichten Negativszenarien | Falsche Logindaten, Gesperrter Nutzer, Gelöschte Nutzer | ❌ | – | Kein Test prüft 2FA-Einrichtung bei ungültigen Zugangsdaten, gesperrtem oder gelöschtem Account. Das leere OTP-Feld wird geprüft, aber die genannten Login-Negativszenarien im 2FA-Kontext fehlen. |
| 6 | 2FA Verwenden | Lehrkräfte, Landesadmins, Schuladmins | ❌ | – | Kein Test authentifiziert sich mit einem eingerichteten 2FA-Token (OTP-Eingabe beim Login). |
| 7 | 2FA Ändern | Lehrkräfte, Landesadmins, Schuladmins | ❌ | – | Kein Test ändert oder ersetzt ein bestehendes 2FA-Token. |
| 8 | Benutzer Ergebnisliste Suchfunktion | Landesadmin, Schuladmin 1 Schule, Schuladmin mehrere Schulen | ✅ | `tests/personen/PersonenErgebnislisteDurchsuchen.spec.ts` | Suche nach Nachname, Vorname, Benutzername, KoPers-Nr. und Rolle wird für Landesadmin und Schuladmin (inkl. Variante mit 2 Schulen) explizit geprüft. |
| 9 | Benutzer Ergebnisliste Schulfilter filtern & zurücksetzen | Landesadmin | ⚠️ | `tests/personen/PersonenErgebnislisteDurchsuchen.spec.ts` | Schulfilter setzen wird getestet. Ein dediziertes Zurücksetzen des Schulfilters ist im Test nicht nachgewiesen; lediglich implizit durch Suche mit neuem Wert. |
| 10 | Benutzer Ergebnisliste Schulfilter Schule vorausgewählt | Schuladmin | ✅ | `tests/personen/PersonenErgebnislisteDurchsuchen.spec.ts` | SPSH-3494: Für Schuladmin (1 Schule) wird explizit geprüft, dass der Schulfilter vorbelegt und nicht änderbar ist. |
| 11 | Benutzer Ergebnisliste Filter zurücksetzen | – | ❌ | – | Kein dedizierter Test für das Zurücksetzen aller Benutzer-Ergebnislisten-Filter. |
| 12 | Benutzer Ergebnisliste Spalten sortieren | – | ✅ | `tests/personen/PersonenErgebnislisteDurchsuchen.spec.ts` | SPSH-2174: Sortierung nach Nachname, Vorname, Benutzername, KoPers-Nr. wird für Landesadmin geprüft; nicht-sortierbare Spalten werden ebenfalls validiert. |
| 13 | Neue Benutzer anlegen | Landesadmin | ✅ | `tests/personen/PersonAnlegen.spec.ts` | Anlage von Schuladmin, Lehrkraft, LiV und Schüler als Landesadmin. Inkl. Anmeldung mit dem neu angelegten Konto. |
| 14 | SuS anlegen | Landesadmin, Schuladmin | ⚠️ | `tests/personen/PersonAnlegen.spec.ts` | Landesadmin ist abgedeckt. Schuladmin-Perspektive fehlt; die Testschleife iteriert nur über `landesadminRolle`. |
| 15 | Benutzer importieren | Landesadmin | ✅ | `tests/personen/PersonenImportieren.spec.ts` | CSV-Upload, Import-Ausführung, Erfolgsmeldung, Download und Prüfung in Personenliste vollständig abgedeckt. |
| 16 | Passwort Reset für Lehrer | Landesadmin | ✅ | `tests/personen/PasswortZuruecksetzen.spec.ts` | Passwort-Reset als Landesadmin und anschließende Anmeldung mit neuem Passwort wird geprüft. |
| 17 | Person Sperren & Entsperren | Landesadmin | ⚠️ | `tests/personen/PersonSperren.spec.ts` | Sperren (unbefristet und befristet) ist abgedeckt. Entsperren fehlt als dedizierter Testfall. |
| 18 | Person löschen via Gesamtübersicht | Landesadmin | ✅ | `tests/personen/PersonLoeschen.spec.ts` | Löschung via Gesamtübersicht und Verifikation in der Ergebnisliste werden explizit geprüft. |
| 19 | Landesbediensteten (suchen und hinzufügen) | – | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | Umfangreiche funktionale Tests für Schuladmin (1 Schule und 2 Schulen): Suche via Name, KoPers, Username, E-Mail; Hinzufügen; Bestätigungs-Popup; Erfolgsseite. |
| 20 | User existiert nicht. (Mail, Name, Benutzername, KoPers) | Schuladmin 1 Schule | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3461–3465: Alle vier ungültigen Suchtypen (Name, KoPers, Mail, Benutzername) werden mit Fehlerpopup-Prüfung abgedeckt. |
| 21 | Buttons Zurück zur Suche & Zurücksetzen | Schuladmin | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3466 (Zurücksetzen-Button), SPSH-3472/3475 (Zurück zur Suche) explizit getestet. |
| 22 | LK mit KoPers und ohne Schulzuordnung kann neu zugeordnet werden | Schuladmin | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3479: Lehrkraft ohne Schulzuordnung wird gesucht und erfolgreich hinzugefügt. |
| 23 | Sonderfälle: ELSK, Gesperrte Benutzer, doppelte Namen | Schuladmin | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3467 (ELSK), SPSH-3468 (gesperrte Person), SPSH-3469 (doppelter Name) sind alle als separate Fixtures implementiert. |
| 24 | Dienststellen-Nr. werden neben Klassen angezeigt | Landesadmin, Schuladmin 2 Schulen | ✅ | `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | SPSH-2855: Für Landesadmin, Schuladmin (1 Schule) und Schuladmin (2 Schulen) wird geprüft, dass die Dienststellennummer korrekt neben dem Klassennamen angezeigt wird. |
| 25 | Neue Klasse anlegen | Landesadmin, Schuladmin 1 Schule, Schuladmin mehrere Schulen | ⚠️ | `tests/klassen/KlasseAnlegen.spec.ts` | Landesadmin und Schuladmin (1 Schule) abgedeckt. Schuladmin mit mehreren Schulen fehlt als explizite Variante. |
| 26 | Klasse anzeigen | Landesadmin, Schuladmin | ⚠️ | `tests/klassen/KlasseAnlegen.spec.ts`, `tests/klassen/KlasseBearbeiten.spec.ts`, `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | Kein dedizierter „Klasse anzeigen"-Test. Die Klassendetails werden im Rahmen von Anlege- und Bearbeiten-Tests implizit aufgerufen und geprüft. |
| 27 | Klasse bearbeiten | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseBearbeiten.spec.ts` | SPSH-2856/2857: Anlegen, Öffnen, Bearbeiten und Validierung der Bestätigungsseite für beide Rollen. |
| 28 | Klasse ohne SuS löschen via Quickaction | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseLoeschen.spec.ts` | SPSH-2858/2859: Für beide Rollen explizit geprüft. |
| 29 | Klasse mit SuS löschen via Quickaction | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseLoeschen.spec.ts` | SPSH-2860: Prüft, dass Löschung nicht möglich ist, wenn Schüler zugeordnet sind. |
| 30 | Klasse ohne SuS löschen via Gesamtübersicht | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseLoeschen.spec.ts` | SPSH-2861/2862: Für beide Rollen explizit geprüft. |
| 31 | Klasse mit SuS löschen via Gesamtübersicht | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseLoeschen.spec.ts` | SPSH-2863: Prüft, dass Löschung nicht möglich ist. |
| 32 | Ergebnisliste nach Klassen sortieren | Landesadmin, Schuladmin 1 Schule, Schuladmin 2 Schulen | ✅ | `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | Auf- und absteigende Sortierung sowie nicht-sortierbare Spalten werden für alle drei Varianten geprüft. |
| 33 | Ergebnisliste Einträge pro Seite ändern | Landesadmin, Schuladmin 1 Schule, Schuladmin 2 Schulen | ⚠️ | `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | `setItemsPerPage()` wird als Hilfsmethode in anderen Tests genutzt, ist aber kein eigenständiger Testfall für diesen Testgegenstand. |
| 34 | Ergebnisliste Filter benutzen | Landesadmin, Schuladmin 1 Schule, Schuladmin 2 Schulen | ✅ | `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | Filter-Funktionen werden für alle drei Varianten explizit geprüft. |
| 35 | Neue Rolle anlegen (Typ: Lehr) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Anlage, Erfolgsseite, Gesamtübersicht und Ergebnisliste für Typ Lehr vollständig geprüft. |
| 36 | Neue Rolle anlegen (Typ: Lern) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Anlage, Erfolgsseite, Gesamtübersicht und Ergebnisliste für Typ Lern vollständig geprüft. |
| 37 | Neue Rolle anlegen (Typ: Leit) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Anlage, Erfolgsseite, Gesamtübersicht und Ergebnisliste für Typ Leit vollständig geprüft. |
| 38 | Rolle anlegen mit Namen bestehender Rolle und Angeboten | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Testfall „Rolle doppelt anlegen" prüft die Fehlerbehandlung bei gleichem Namen (Duplikat-Alert). |
| 39 | Als Nutzer mit neu angelegter Rolle anmelden | Lehr, Lern, Leit | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Anmeldung als Nutzer mit neu angelegter Rolle wird für alle drei Rollenarten explizit geprüft. |
| 40 | Mehrere Rollen nacheinander anlegen | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | SPSH-2946: Zwei Rollen hintereinander anlegen und in der Ergebnisliste prüfen. |
| 41 | Rolle doppelt anlegen | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Fehlermeldung bei doppeltem Rollennamen wird explizit validiert. |
| 42 | Ungültige Eingaben | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | SPSH-2951: Zu langer Name und Sonderzeichen werden geprüft, inkl. Fehlermeldungstext. |
| 43 | Rollennamen ändern | Landesadmin | ✅ | `tests/rollen/RolleBearbeiten.spec.ts` | SPSH-2948: Rollenname wird geändert und Erfolg bestätigt. |
| 44 | Rolle löschen | Landesadmin | ✅ | `tests/rollen/RolleLoeschen.spec.ts` | SPSH-2949: Erfolgreiche Löschung und Versuch, eine vergebene Rolle zu löschen (mit Fehlermeldung), abgedeckt. |
| 45 | Alle Angebote anzeigen | Landesadmin | ❌ | – | Kein Test für die Admin-Ansicht „Alle Angebote/Service Provider". Die Sichtbarkeit von Service Providern auf der Startseite wird separat geprüft (Nr. 54–67). |
| 46 | Ergebnisliste Suchfunktion benutzen (Schulen) | Landesadmin | ✅ | `tests/schulen/SchuleErgebnislisteDurchsuchen.spec.ts` | Suche nach Schulname und Dienststellennummer wird explizit geprüft. |
| 47 | Neue Schule anlegen | Landesadmin | ✅ | `tests/schulen/SchuleAnlegen.spec.ts` | SPSH-2954/2952: Einzelne Schule anlegen und 2 Schulen nacheinander anlegen, inkl. Ergebnislistenprüfung. |
| 48 | Alle Schulträger anzeigen | Landesadmin | ❌ | – | Kein Test für die Schulträger-Übersicht vorhanden. |
| 49 | Neuen Schulträger anlegen | Landesadmin | ❌ | – | Kein Test für das Anlegen eines Schulträgers vorhanden. |
| 50 | Hinweise bearbeiten | Landesadmin | ❌ | – | Page-Object `HinweiseCreationView.page.ts` existiert, aber kein Spec-File für Hinweise-Tests gefunden. |
| 51 | Passwort ändern | Lern, Lehr, Schuladmin, Landesadmin | ⚠️ | `tests/profile/EigenesPasswortAendern.spec.ts` | Passwortänderung für Lehr und Lern (Schüler) abgedeckt. Schuladmin und Landesadmin fehlen als explizite Testfälle. |
| 52 | Einloggen mit neuem Passwort | Lehr | ⚠️ | `tests/profile/EigenesPasswortAendern.spec.ts` | Login nach Passwortänderung wird für Lern (Schüler) explizit geprüft, nicht für Lehr. |
| 53 | Weiterleitungen funktionieren (SSO / 2FA) | Lern, Lehr, Schuladmin, Berufsschullehrer, Berufsschüler | ❌ | – | Kein Test verifiziert, dass SP-Links korrekt weiterleiten (SSO/2FA-Redirect). Nur Sichtbarkeit der SP-Kacheln wird geprüft. |
| 54 | Email | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit der E-Mail-Kachel für Lehr wird geprüft. Kein Test für tatsächliche Weiterleitung/Zugriff. |
| 55 | Adressbuch | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Nur Sichtbarkeit für Lehr geprüft. |
| 56 | Kalender | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Nur Sichtbarkeit für Lehr geprüft. |
| 57 | Dateiablage OP.SH | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Nur Sichtbarkeit für Lehr geprüft. |
| 58 | itslearning | Lern, Lehr, Schuladmin | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für Lern und Lehr abgedeckt. Schuladmin (Leit) hat itslearning nicht in der Testfixture und ist daher nicht abgedeckt. |
| 59 | Telli | Lehr | ❌ | – | „Telli" ist in keiner Testfixture enthalten. |
| 60 | Vidis | Lehr | ❌ | – | „Vidis" ist in keiner Testfixture enthalten. |
| 61 | School-SH | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Nur Sichtbarkeit für Lehr geprüft. |
| 62 | WebUntis | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für Lehr (und Lern) geprüft. Kein Redirect-Test. |
| 63 | Anleitungen | Lehr, Schuladmin, Landesadmin | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für Lehr (Lehr), Schuladmin (Leit) und Landesadmin (Sysadmin) geprüft. Kein Redirect-Test. |
| 64 | Helpdesk Kontaktieren | Lehr, Schuladmin, Landesadmin | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für alle drei Gruppen geprüft. Kein Redirect-Test. |
| 65 | Psychosoziales Beratungsangebot | Lehr, Schuladmin, Landesadmin | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für alle drei Gruppen geprüft. Kein Redirect-Test. |
| 66 | Schulrecht A-Z | Lehr, Schuladmin, Landesadmin | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Sichtbarkeit für alle drei Gruppen geprüft. Kein Redirect-Test. |
| 67 | Firmenfitness Angebot | Lehr | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts` | Nur Sichtbarkeit für Lehr geprüft. |
| 68 | **UI-Tests: Ansehen / Vollständig / Richtigkeit** | *(Abschnittsüberschrift)* | ⚠️ | – | Kategorie-Trenner im Testgegenstandsdokument, kein eigenständiger Testgegenstand. Wird über die nachfolgenden UI-Einzeltests abgedeckt. |
| 69 | Landingpage | – | ❌ | – | Kein dedizierter Test für die Landingpage-UI. Die Seite wird in Login-Tests aufgerufen, aber nicht auf Vollständigkeit/Richtigkeit geprüft. |
| 70 | Anmelden | – | ⚠️ | `tests/Authentifizierung.spec.ts` | Login-Funktionalität ist getestet. Eine dedizierte Prüfung der Anmeldeseite auf UI-Vollständigkeit fehlt. |
| 71 | Startseite | SuS, Lehrkraft, Ersatzschullehrkraft, Schuladmin, Landesadmin, Berufsschullehrkraft, Berufs-SuS | ⚠️ | `tests/start/ServiceProviderAufStartseite.spec.ts`, `tests/start/NewsboxAufStartseite.spec.ts` | Lehr, Lern, Leit, Orgadmin und Sysadmin abgedeckt. Ersatzschullehrkraft, Berufsschullehrkraft und Berufs-SuS fehlen explizit. |
| 72 | Mein Profil (Pers. Daten, Zuordnung, PW, 2FA) | SuS 1 Zuordnung, Lehrkraft 1 Schulzuordnung, Schuladmin 1 Schulzuordnung, Landesadmin | ✅ | `tests/profile/EigenesProfilPruefen.spec.ts` | Alle vier Benutzergruppen werden explizit geprüft: persönliche Daten, Zuordnungen, Passwort-Karte und 2FA-Karte (inkl. Abwesenheit der 2FA-Karte bei Lern). |
| 73 | Benutzer Ergebnisliste anzeigen | Landesadmin, Schuladmin | ✅ | `tests/personen/PersonenErgebnislisteDurchsuchen.spec.ts` | SPSH-2923: UI-Prüfung für beide Rollen explizit vorhanden. |
| 74 | Neue Benutzer anlegen (UI) | – | ⚠️ | `tests/personen/PersonAnlegen.spec.ts` | UI des Formulars wird getestet. Nur Landesadmin-Perspektive; Schuladmin-Sicht fehlt. |
| 75 | Benutzer importieren (UI) | – | ⚠️ | `tests/personen/PersonenImportieren.spec.ts` | UI des Import-Dialogs wird als Landesadmin getestet. Andere Rollen nicht abgedeckt. |
| 76 | Landesbediensteten (suchen und hinzufügen) | Schuladmin | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3458: Vollständigkeitsprüfung des Suchformulars als Schuladmin explizit abgedeckt. |
| 77 | Landesbediensteten (suchen und hinzufügen) – Suchergebnis | Schuladmin | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3470/3471: Persönliche Daten und Zuordnung im Suchergebnis werden auf Vollständigkeit geprüft. |
| 78 | Landesbediensteten (suchen und hinzufügen) – Card LB hinzufügen | Schuladmin 2 Schulen, Schuladmin 1 Schule | ✅ | `tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts` | SPSH-3476–3486: Initialer Formularstatus, Organisationsauswahl, Rollenfelder, Bestätigungs-Popup und Erfolgsseite für beide Varianten geprüft. |
| 79 | Klasse Ergebnisliste | Landesadmin, Schuladmin 2 Schulen, Schuladmin 1 Schule | ✅ | `tests/klassen/KlasseErgebnislisteDurchsuchen.spec.ts` | SPSH-2853: UI-Prüfung für alle drei Varianten explizit abgedeckt. |
| 80 | Neue Klassen anlegen (UI) | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseAnlegen.spec.ts` | Formular-UI für beide Rollen explizit geprüft. |
| 81 | Klasse anlegen – Bestätigungsseite | Landesadmin, Schuladmin | ✅ | `tests/klassen/KlasseAnlegen.spec.ts` | SPSH-2854: Bestätigungsseite auf Vollständigkeit geprüft für beide Rollen. |
| 82 | Rolle Ergebnisliste UI prüfen | Landesadmin | ✅ | `tests/rollen/RolleErgebnislisteDurchsuchen.spec.ts` | UI-Prüfung der Rollenliste als Landesadmin explizit abgedeckt. |
| 83 | Neue Rolle anlegen (Formular) | – | ⚠️ | `tests/rollen/RolleAnlegen.spec.ts` | Kein dedizierter UI-Vollständigkeitstest für das Anlege-Formular selbst. Das Formular wird funktional genutzt, aber nicht isoliert auf Vollständigkeit geprüft. |
| 84 | Neue Rolle anlegen – Erfolgsseite (Lehr) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | SPSH-2947: Erfolgsseite für Lehr explizit geprüft. |
| 85 | Neue Rolle anlegen – Erfolgsseite (Lern) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Erfolgsseite für Lern explizit geprüft. |
| 86 | Neue Rolle anlegen – Erfolgsseite (Leit) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Erfolgsseite für Leit explizit geprüft. |
| 87 | Neue Rolle anlegen – Gesamtübersicht (Lehr) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Gesamtübersicht nach Anlage für Lehr explizit geprüft. |
| 88 | Neue Rolle anlegen – Gesamtübersicht (Lern) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Gesamtübersicht nach Anlage für Lern explizit geprüft. |
| 89 | Neue Rolle anlegen – Gesamtübersicht (Leit) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Gesamtübersicht nach Anlage für Leit explizit geprüft. |
| 90 | Neue Rolle anlegen – Ergebnisliste (Lehr) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | SPSH-2950: Prüfung in Ergebnisliste für Lehr explizit abgedeckt. |
| 91 | Neue Rolle anlegen – Ergebnisliste (Lern) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Prüfung in Ergebnisliste für Lern explizit abgedeckt. |
| 92 | Neue Rolle anlegen – Ergebnisliste (Leit) | Landesadmin | ✅ | `tests/rollen/RolleAnlegen.spec.ts` | Prüfung in Ergebnisliste für Leit explizit abgedeckt. |
| 93 | Alle Angebote anzeigen (UI) | – | ❌ | – | Kein Test für die Admin-Verwaltungsansicht der Service Provider. |
| 94 | Schulen Ergebnisliste anzeigen | Landesadmin | ✅ | `tests/schulen/SchuleErgebnislisteDurchsuchen.spec.ts` | SPSH-2953: UI-Prüfung der Schulliste als Landesadmin explizit abgedeckt. |
| 95 | Neue Schule anlegen (UI) | – | ✅ | `tests/schulen/SchuleAnlegen.spec.ts` | UI des Anlege-Formulars und Bestätigungsseite werden explizit geprüft. |
| 96 | Alle Schulträger anzeigen (UI) | – | ❌ | – | Kein Test für die Schulträger-Übersicht vorhanden. |
| 97 | Neuen Schulträger anlegen (UI) | – | ❌ | – | Kein Test für das Anlegen eines Schulträgers vorhanden. |

---

## Zusammenfassung

| Status | Anzahl |
|--------|--------|
| ✅ Vollständig abgedeckt | 53 |
| ⚠️ Teilweise abgedeckt | 28 |
| ❌ Nicht abgedeckt | 15 |
| **Gesamt (ohne Abschnittsüberschrift Nr. 68)** | **96** |

> **Hinweis:** Zeile 68 („UI-Tests: Ansehen / Vollständig / Richtigkeit") ist eine Abschnittsüberschrift im Testgegenstandsdokument und kein eigenständiger Testgegenstand; sie fließt nicht in die Zählung der 96 Testgegenstände ein.
>
> Häufigste Lücken:
> - **2FA**: Negativszenarien, Verwenden und Ändern fehlen vollständig.
> - **Service-Provider-Redirects**: Alle SP-Tests prüfen nur Sichtbarkeit, nicht die tatsächliche Weiterleitung (SSO/2FA).
> - **Telli / Vidis**: Nicht in Tests enthalten.
> - **Schulträger-Verwaltung & Hinweise**: Keine Tests vorhanden.
> - **Abmelden / Anmelden** diverser Benutzergruppen: Nur Root-Admin explizit getestet; andere Gruppen nur implizit als Teilvorbedingung.
