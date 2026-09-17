Definiere und nutze lokale Prompts in diesem Repo nach folgenden Regeln:

1. Speichere repo-spezifische, wiederverwendbare Anweisungen unter `.github\prompts\local`.
2. Verwende fuer neue Dateien einen klaren Zweck im Dateinamen, zum Beispiel `pre-push-check.prompt.md`.
3. Halte jeden Prompt eng auf genau einen wiederholbaren Ablauf begrenzt.
4. Beschreibe im Prompt immer:
   - den konkreten Ausloeser oder Einsatzfall,
   - die auszufuehrenden Schritte,
   - die erwartete Rueckmeldung am Ende.
5. Benenne Checks und Aktionen so, dass sie direkt zu den vorhandenen Repo-Konventionen passen.
6. Wenn ich einen lokalen Prompt aufrufen will, verweise ich direkt auf seinen Dateinamen oder nenne den Zweck eindeutig.

Wenn es mehrere moegliche Prompts gibt, waehle den spezifischsten Prompt fuer die aktuelle Aufgabe statt einen allgemeinen Sammelprompt.