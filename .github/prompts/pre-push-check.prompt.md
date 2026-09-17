Pruefe ausschliesslich die Dateien, die der User explizit mitgibt, mit folgenden Schritten:

1. Fuehre `prettier` auf den angegebenen Dateien aus.
2. Fuehre `eslint` auf den angegebenen Dateien aus.
3. Pruefe die angegebenen Dateien auf doppelten oder stark duplizierten Code.

Wichtige Regeln:
- Pruefe immer nur genau die Dateien, die der User in seiner Anfrage genannt hat. Keine anderen Dateien.
- Wenn der User keine Dateien angibt, frage nach, welche Dateien geprueft werden sollen.
- Wenn du Duplikate findest, schlage eine Extraktion oder Wiederverwendung vorhandener Logik vor.
- Wenn ein Check fehlschlaegt, behebe zuerst die Ursache und fuehre die Checks danach erneut aus.
- Gib am Ende eine kurze, klare Rueckmeldung, ob alles gruen ist oder was noch offen ist.

Nutze diese Anweisung immer dann, wenn ich dich vor einem Push um eine Pruefung bitte.