mode: 'agent'  
inputs:  
  - id: provider_display_name  
    description: 'Anzeigename des ServiceProviders (z. B. "Firmenfitness Angebot")'  
    type: string  
  - id: provider_constant_name  
    description: 'TypeScript-Konstantenname in camelCase (z. B. "firmenfitness")'  
    type: string  
  - id: target_role  
    description: 'RollenArt, der der ServiceProvider hinzugefügt werden soll (z. B. "Lehr")'  
    type: string  
---  

## Plan: ${input:provider_display_name} für ${input:target_role}-Rolle testen  

**Was/Warum:**  
Das Angebot "${input:provider_display_name}" soll als zusätzlicher ServiceProvider für die Rolle "${input:target_role}" im Test `ServiceProviderAufStartseite.spec.ts` geprüft werden. Es muss in die Konstantendatei, die Fixture-Daten und die Spec-Datei aufgenommen werden.  

**Schritte**  
1. In `base/sp.ts` die Konstante ergänzen:  
   - `export const ${input:provider_constant_name}: string = '${input:provider_display_name}';`  
2. In `tests/start/ServiceProviderAufStartseite.data.ts`:  
   - `${input:provider_constant_name}` aus `../../base/sp` importieren.  
   - In der Fixture mit `rollenArt: RollenArt.${input:target_role}` den Wert `${input:provider_constant_name}` zu `serviceProviderNames` hinzufügen.  
3. In `tests/start/ServiceProviderAufStartseite.spec.ts`:  
   - `${input:provider_constant_name}` aus `../../base/sp` importieren.  
   - `${input:provider_constant_name}` in das Array `allProviderNames` aufnehmen.  
     Hinweis: `allProviderNames` ist die vollständige Liste aller bekannten ServiceProvider. Der Test leitet daraus ab, welche Provider für eine Rolle nicht sichtbar sein dürfen. Fehlt ein Eintrag, ist die Unsichtbarkeitsprüfung für andere Rollen inkorrekt.  

**Relevante Dateien**  
- `base/sp.ts` — neue Konstante  
- `tests/start/ServiceProviderAufStartseite.data.ts` — Import und Fixture-Erweiterung  
- `tests/start/ServiceProviderAufStartseite.spec.ts` — Import und `allProviderNames` ergänzen  

**Verifikation**  
1. Test ausführen: `npm test -- tests/start/ServiceProviderAufStartseite.spec.ts`  
2. Prüfen, dass "${input:provider_display_name}" für die Rolle `${input:target_role}` sichtbar ist.  
3. Prüfen, dass "${input:provider_display_name}" für alle anderen Rollen nicht sichtbar ist.  
4. Keine anderen ServiceProvider für `${input:target_role}` betroffen.  

**Entscheidungen**  
- `${input:provider_constant_name}` wird wie alle anderen Angebote als benannte Konstante in `base/sp.ts` geführt.  
- Die Änderung betrifft ausschließlich die Rolle `${input:target_role}`.  