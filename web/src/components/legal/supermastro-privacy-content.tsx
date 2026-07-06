import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function SuperMastroPrivacyContent() {
  const { name, product, brand, seat, privacyEmail, infoEmail } = LEGAL_ENTITY;

  return (
    <>
      <section>
        <h2>1. Titolare del trattamento</h2>
        <p>
          Il Titolare del trattamento dei dati personali raccolti tramite la sezione{" "}
          <strong>{product}</strong> del sito {brand} è <strong>{name}</strong>, con sede legale in{" "}
          {seat}, titolare del marchio e della piattaforma digitale {brand}.
        </p>
        <p>
          Per ogni richiesta relativa alla privacy e all&apos;esercizio dei diritti previsti dal
          GDPR:{" "}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
          <br />
          Per assistenza generale sul servizio:{" "}
          <a href={`mailto:${infoEmail}`}>{infoEmail}</a>
        </p>
      </section>

      <section>
        <h2>2. Ambito di applicazione</h2>
        <p>
          La presente informativa si applica al trattamento dei dati personali degli utenti che
          utilizzano <strong>{product}</strong> — servizio di richiesta urgente di intervento
          artigianale (SOS) messo a disposizione da {brand} — attraverso il sito web, l&apos;area
          riservata e le funzionalità collegate (wizard di richiesta, geolocalizzazione, analisi
          fotografica assistita, tracciamento stato richiesta).
        </p>
        <p>
          {product} è destinato a <strong>clienti finali</strong> (privati o referenti aziendali)
          che richiedono un intervento. Per il trattamento relativo agli <strong>artigiani
          iscritti</strong> alla piattaforma {brand} si applica l&apos;informativa dedicata
          disponibile nella sezione Artigiano.
        </p>
        <p>
          La presente informativa copre anche il <strong>talent pool e recruitment</strong>{" "}
          (iscrizione lavoratori in tutta Italia, profili artigiano/dipendente, richieste datori di
          lavoro) accessibile da {product} e dalle sezioni <a href="/lavoro">/lavoro</a> e{" "}
          <a href="/supermastro/lavoro">/supermastro/lavoro</a>.
        </p>
      </section>

      <section>
        <h2>2bis. Recruitment e talent pool</h2>
        <p>
          Per candidati (dipendenti e artigiani con P.IVA) trattiamo: dati anagrafici, competenze,
          CAP/comune, raggio operativo, disponibilità lavorativa, Partita IVA (solo artigiani),
          foto profilo e storico opportunità/match recruitment.
        </p>
        <p>
          Per datori (condomini, hotel, ditte) trattiamo: dati organizzazione, referente, fabbisogno
          personale, CAP e recapiti — mediati fino al match con candidato accettato.
        </p>
        <p>
          <strong>Copertura geografica:</strong> l&apos;iscrizione al talent pool e il servizio SOS
          urgente operano in tutta Italia, con match basato su competenze, CAP e raggio indicati.
        </p>
      </section>

      <section>
        <h2>3. Tipologie di dati trattati</h2>
        <p>In relazione al servizio {product}, possono essere trattate le seguenti categorie:</p>
        <ul>
          <li>
            <strong>Dati identificativi e di contatto:</strong> nome, cognome, indirizzo email,
            numero di telefono, eventuale ragione sociale.
          </li>
          <li>
            <strong>Dati di autenticazione:</strong> identificativo account, token di sessione,
            log di accesso (in caso di registrazione o login tramite magic link).
          </li>
          <li>
            <strong>Dati di localizzazione:</strong> coordinate GPS o posizione approssimativa
            dell&apos;intervento, indirizzo indicato manualmente, città e CAP.
          </li>
          <li>
            <strong>Dati relativi alla richiesta SOS:</strong> categoria del problema, descrizione
            testuale, urgenza, stato della richiesta, storico aggiornamenti.
          </li>
          <li>
            <strong>Immagini e contenuti multimediali:</strong> fotografie caricate dall&apos;utente
            per descrivere il guasto o il fabbisogno; tali immagini possono essere analizzate con
            strumenti di intelligenza artificiale per suggerire categoria e priorità.
          </li>
          <li>
            <strong>Dati tecnici e di navigazione:</strong> indirizzo IP, user agent, timestamp,
            cookie e tecnologie simili (si veda la{" "}
            <a href="/supermastro/cookie">Cookie Policy</a>).
          </li>
          <li>
            <strong>Dati di contatto in &quot;vault&quot;:</strong> fino al momento del match con
            un artigiano, i recapiti del cliente possono essere conservati in forma protetta e non
            resi visibili agli operatori del marketplace.
          </li>
        </ul>
        <p>
          L&apos;utente è invitato a non caricare immagini che ritraggano persone identificabili o
          dati non necessari all&apos;intervento (es. documenti con codice fiscale visibile).
        </p>
      </section>

      <section>
        <h2>4. Finalità e base giuridica del trattamento</h2>
        <table>
          <thead>
            <tr>
              <th>Finalità</th>
              <th>Base giuridica (art. 6 GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Creazione e gestione dell&apos;account, invio magic link</td>
              <td>Esecuzione di misure precontrattuali/contrattuali (lett. b)</td>
            </tr>
            <tr>
              <td>Ricezione, qualificazione e instradamento richieste SOS</td>
              <td>Esecuzione del contratto / servizio richiesto (lett. b)</td>
            </tr>
            <tr>
              <td>Geolocalizzazione per individuare artigiani nelle vicinanze</td>
              <td>Consenso esplicito al momento della richiesta (lett. a)</td>
            </tr>
            <tr>
              <td>Analisi fotografica assistita da IA per categorizzazione</td>
              <td>Consenso esplicito al caricamento (lett. a) e/o esecuzione contrattuale (lett. b)</td>
            </tr>
            <tr>
              <td>Comunicazioni operative (stato richiesta, match, assistenza)</td>
              <td>Esecuzione contrattuale (lett. b)</td>
            </tr>
            <tr>
              <td>Sicurezza, prevenzione abusi, log tecnici</td>
              <td>Legittimo interesse del Titolare (lett. f)</td>
            </tr>
            <tr>
              <td>Adempimenti di legge, contenzioso, richieste autorità</td>
              <td>Obbligo di legge (lett. c) e difesa in giudizio (lett. f)</td>
            </tr>
            <tr>
              <td>Statistiche aggregate e miglioramento del servizio</td>
              <td>Legittimo interesse, previa anonimizzazione o aggregazione (lett. f)</td>
            </tr>
          </tbody>
        </table>
        <p>
          Eventuali comunicazioni promozionali relative a {brand} o {product}, ove previste, sono
          effettuate solo previo consenso specifico, revocabile in qualsiasi momento.
        </p>
      </section>

      <section>
        <h2>5. Modalità del trattamento e sicurezza</h2>
        <p>
          I dati sono trattati con strumenti informatici e telematici, nel rispetto dei principi
          di liceità, correttezza, trasparenza, minimizzazione e integrità. {name} adotta misure
          tecniche e organizzative adeguate, incluse connessioni cifrate (HTTPS), controllo degli
          accessi, segregazione degli ambienti e backup periodici.
        </p>
        <p>
          L&apos;infrastruttura applicativa utilizza fornitori con data center nell&apos;Unione
          Europea (incluso Supabase EU). I trattamenti automatizzati con IA non producono decisioni
          che producono effetti giuridici o incidono in modo analogo significativamente
          sull&apos;utente senza intervento umano nella fase di match e contatto con l&apos;artigiano.
        </p>
      </section>

      <section>
        <h2>6. Destinatari e categorie di destinatari</h2>
        <p>I dati possono essere comunicati, nei limiti strettamente necessari, a:</p>
        <ul>
          <li>Personale e collaboratori autorizzati di {name}, vincolati alla riservatezza;</li>
          <li>
            <strong>Artigiani iscritti</strong> a {brand}, solo dopo il match e limitatamente ai
            dati necessari per eseguire l&apos;intervento (contatti, indirizzo, descrizione
            problema);
          </li>
          <li>
            Fornitori di servizi tecnologici (hosting, database, email transazionale, CDN,
            analytics se consenso) nominati Responsabili del trattamento ai sensi dell&apos;art. 28
            GDPR;
          </li>
          <li>Fornitori di servizi di intelligenza artificiale per l&apos;analisi delle immagini,
            ove attivati, con obblighi contrattuali di riservatezza e limitazione d&apos;uso;</li>
          <li>Autorità giudiziarie o amministrative, quando richiesto dalla legge.</li>
        </ul>
        <p>
          I dati personali <strong>non sono venduti</strong> a terzi per finalità di profilazione
          commerciale indipendente.
        </p>
      </section>

      <section>
        <h2>7. Trasferimenti verso Paesi extra-UE</h2>
        <p>
          I dati sono preferibilmente trattati all&apos;interno dello Spazio Economico Europeo. Qualora
          fosse necessario un trasferimento verso Paesi terzi, {name} adotterà le garanzie previste
          dagli artt. 44-49 GDPR (decisioni di adeguatezza, Standard Contractual Clauses, misure
          supplementari). Informazioni dettagliate sono disponibili scrivendo a{" "}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
      </section>

      <section>
        <h2>8. Periodo di conservazione</h2>
        <ul>
          <li>
            <strong>Dati account e richieste SOS:</strong> per la durata del rapporto contrattuale e,
            successivamente, fino a <strong>24 mesi</strong> dall&apos;ultima interazione, salvo
            obblighi di legge diversi.
          </li>
          <li>
            <strong>Fotografie caricate:</strong> conservate per il tempo necessario alla gestione
            della richiesta e, salvo revoca anticipata, per un massimo di <strong>90 giorni</strong>
            , salvo obblighi di conservazione per contestazioni o richieste dell&apos;autorità.
          </li>
          <li>
            <strong>Log tecnici e sicurezza:</strong> fino a <strong>12 mesi</strong>.
          </li>
          <li>
            <strong>Cookie:</strong> secondo quanto indicato nella{" "}
            <a href="/supermastro/cookie">Cookie Policy</a>.
          </li>
        </ul>
        <p>Trascorsi i termini, i dati sono cancellati o resi anonimi in modo irreversibile.</p>
      </section>

      <section>
        <h2>9. Natura del conferimento e conseguenze del rifiuto</h2>
        <p>
          Il conferimento dei dati contrassegnati come obbligatori nel wizard SOS (descrizione,
          localizzazione, recapito) è necessario per erogare il servizio. Il mancato conferimento
          impedisce l&apos;invio della richiesta e il match con un artigiano. Il conferimento di
          dati facoltativi (es. foto aggiuntive, marketing) è volontario.
        </p>
      </section>

      <section>
        <h2>10. Diritti dell&apos;interessato</h2>
        <p>
          L&apos;interessato può esercitare in qualsiasi momento i diritti di accesso, rettifica,
          cancellazione, limitazione, portabilità, opposizione (artt. 15-22 GDPR), nonché revocare
          i consensi prestati senza pregiudicare la liceità del trattamento basata sul consenso
          prima della revoca.
        </p>
        <p>
          Richieste: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> — oggetto
          &quot;Diritti GDPR – {product}&quot;. {name} risponderà entro i termini di legge (di
          regola 30 giorni).
        </p>
        <p>
          L&apos;interessato ha diritto di proporre reclamo al Garante per la protezione dei dati
          personali (
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
            www.garanteprivacy.it
          </a>
          ).
        </p>
      </section>

      <section>
        <h2>11. Minori</h2>
        <p>
          {product} non è destinato a minori di 18 anni. {name} non raccoglie consapevolmente dati
          di minori; in caso di segnalazione provvederà alla cancellazione tempestiva.
        </p>
      </section>

      <section>
        <h2>12. Modifiche all&apos;informativa</h2>
        <p>
          {name} si riserva di aggiornare la presente informativa per adeguamenti normativi o
          evoluzioni del servizio. La versione vigente è sempre pubblicata su questa pagina con
          indicazione della data di aggiornamento.
        </p>
      </section>
    </>
  );
}
