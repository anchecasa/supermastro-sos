import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function SuperMastroTerminiContent() {
  const { name, product, brand, seat, infoEmail, adminEmail } = LEGAL_ENTITY;

  return (
    <>
      <section>
        <h2>1. Premessa e accettazione</h2>
        <p>
          I presenti Termini e Condizioni (&quot;Termini&quot;) regolano l&apos;accesso e
          l&apos;utilizzo del servizio <strong>{product}</strong>, sezione SOS della piattaforma
          digitale <strong>{brand}</strong>, gestita da <strong>{name}</strong>, con sede in{" "}
          {seat} (&quot;Fornitore&quot; o &quot;Titolare&quot;).
        </p>
        <p>
          Utilizzando {product} — inclusi wizard di richiesta, geolocalizzazione, area riservata e
          modalità dimostrativa — l&apos;utente (&quot;Cliente&quot;) dichiara di aver letto,
          compreso e accettato integralmente i presenti Termini, l&apos;{" "}
          <a href="/supermastro/privacy">Informativa Privacy</a> e la{" "}
          <a href="/supermastro/cookie">Cookie Policy</a>.
        </p>
        <p>
          Se non accetta i Termini, non deve utilizzare il servizio.
        </p>
      </section>

      <section>
        <h2>2. Definizioni</h2>
        <ul>
          <li>
            <strong>{product}:</strong> servizio che consente al Cliente di inviare una richiesta
            urgente di intervento artigianale, con eventuale analisi fotografica e match con
            professionisti iscritti a {brand}.
          </li>
          <li>
            <strong>Artigiano / Mastro:</strong> professionista registrato sulla piattaforma{" "}
            {brand}, autonomo nella propria organizzazione e responsabilità.
          </li>
          <li>
            <strong>Match:</strong> abbinamento tra richiesta SOS e Artigiano disponibile nella zona
            indicata.
          </li>
          <li>
            <strong>Modalità demo:</strong> percorso simulato che illustra le funzionalità senza
            generare obblighi contrattuali né interventi reali, salvo diversa indicazione esplicita.
          </li>
          <li>
            <strong>Talent pool / Recruitment:</strong> servizio di iscrizione lavoratori (artigiani
            e dipendenti) e di pubblicazione fabbisogni da parte di condomini, hotel e ditte,
            accessibile da {product} e <a href="/lavoro">/lavoro</a>, con match mediato tra
            candidato e datore.
          </li>
          <li>
            <strong>Datore:</strong> organizzazione che pubblica un fabbisogno di personale tramite
            la piattaforma {brand}.
          </li>
        </ul>
      </section>

      <section>
        <h2>2bis. Recruitment — natura del servizio</h2>
        <p>
          {name} fornisce intermediazione tecnologica per mettere in contatto candidati iscritti al
          talent pool e datori di lavoro. Il Fornitore <strong>non assume</strong> i candidati né
          garantisce assunzione, salvo diversa pattuizione scritta con partner autorizzati (es.
          agenzie per il lavoro).
        </p>
        <p>
          Il rapporto di lavoro o prestazione si conclude <strong>tra candidato e datore</strong>.
          L&apos;iscrizione al talent pool è gratuita per i candidati salvo diversa indicazione.
        </p>
        <p>
          <strong>SOS vs recruitment:</strong> l&apos;iscrizione è valida in tutta Italia; il
          servizio SOS urgente resta limitato alle zone pilota. Le opportunità recruitment operano su
          base nazionale secondo CAP e raggio indicati.
        </p>
      </section>

      <section>
        <h2>3. Natura del servizio</h2>
        <p>
          {name} fornisce una <strong>piattaforma di intermediazione tecnologica</strong>: mette in
          contatto Clienti e Artigiani e facilita la trasmissione delle richieste. Il Fornitore{" "}
          <strong>non esegue direttamente</strong> lavori edili, idraulici, elettrici o di altra
          natura, né garantisce la disponibilità immediata di un Artigiano in ogni luogo o orario.
        </p>
        <p>
          Il contratto per l&apos;esecuzione dell&apos;intervento si conclude{" "}
          <strong>tra Cliente e Artigiano</strong>, autonomamente, con prezzi, tempi e garanzie
          definiti tra le parti. {name} non è parte di tale rapporto, salvo diversa pattuizione
          scritta e specifica.
        </p>
      </section>

      <section>
        <h2>4. Requisiti dell&apos;utente</h2>
        <p>
          Il servizio è riservato a persone fisiche maggiorenni o a soggetti giuridici rappresentati
          da persone con poteri di firma. Il Cliente garantisce la veridicità e l&apos;aggiornamento
          dei dati forniti e di disporre dei diritti su immagini e contenuti caricati.
        </p>
      </section>

      <section>
        <h2>5. Registrazione, account e autenticazione</h2>
        <p>
          Per inviare richieste SOS in produzione può essere richiesta la creazione di un account o
          l&apos;accesso tramite magic link all&apos;indirizzo email indicato. Il Cliente è
          responsabile della custodia delle credenziali e di ogni attività svolta dal proprio
          account. Deve segnalare tempestivamente accessi non autorizzati a{" "}
          <a href={`mailto:${infoEmail}`}>{infoEmail}</a>.
        </p>
      </section>

      <section>
        <h2>6. Invio richiesta SOS</h2>
        <p>Per utilizzare il wizard il Cliente si impegna a:</p>
        <ul>
          <li>Fornire descrizioni veritiere del problema e dell&apos;urgenza;</li>
          <li>
            Concedere, ove richiesto, il permesso di geolocalizzazione per individuare Artigiani
            nelle vicinanze;
          </li>
          <li>
            Caricare immagini pertinenti, senza contenuti illeciti, diffamatori o lesivi della
            privacy altrui;
          </li>
          <li>
            Non utilizzare il servizio per richieste false, abusive o finalizzate a scopi diversi
            dall&apos;intervento dichiarato.
          </li>
        </ul>
        <p>
          {name} si riserva di sospendere o rifiutare richieste manifestamente infondate, duplicate
          in modo anomalo o contrarie alla legge o ai presenti Termini.
        </p>
      </section>

      <section>
        <h2>7. Geolocalizzazione e analisi fotografica</h2>
        <p>
          La geolocalizzazione è utilizzata esclusivamente per finalità di erogazione del servizio
          SOS. L&apos;analisi automatica delle fotografie (eventualmente assistita da IA) ha scopo
          di categorizzazione e prioritizzazione: non sostituisce il sopralluogo o la diagnosi
          dell&apos;Artigiano. Il Cliente resta responsabile della decisione di procedere
          all&apos;intervento sulla base delle informazioni raccolte.
        </p>
      </section>

      <section>
        <h2>8. Contatti e &quot;vault&quot;</h2>
        <p>
          Fino al match, i recapiti del Cliente possono essere trattati in modalità protetta e non
          resi visibili agli Artigiani. Dopo il match, nome, telefono, email e dati necessari
          all&apos;intervento saranno comunicati all&apos;Artigiano selezionato per consentire il
          contatto diretto.
        </p>
      </section>

      <section>
        <h2>9. Modalità dimostrativa (demo)</h2>
        <p>
          La demo consente di provare il flusso SOS con dati simulati o parzialmente locali al
          browser. Non costituisce richiesta reale né genera obbligo di invio Artigiano. I contatti,
          nomi e tempi mostrati in demo possono essere fittizi. L&apos;attivazione della demo non
          sostituisce l&apos;accettazione dei Termini per l&apos;uso in produzione.
        </p>
      </section>

      <section>
        <h2>10. Prezzi, pagamenti e rapporto con l&apos;Artigiano</h2>
        <p>
          Salvo diversa indicazione esplicita sul sito, l&apos;invio della richiesta SOS tramite{" "}
          {product} <strong>non comporta costi verso {name}</strong> per il Cliente nella versione
          attuale del servizio. Eventuali corrispettivi per l&apos;intervento sono concordati
          direttamente con l&apos;Artigiano. {name} non è responsabile per fatturazione, IVA,
          rimborsi o contestazioni economiche tra Cliente e Artigiano, salvo obblighi inderogabili di
          legge.
        </p>
      </section>

      <section>
        <h2>11. Obblighi e responsabilità del Cliente</h2>
        <p>Il Cliente è responsabile:</p>
        <ul>
          <li>Dell&apos;uso lecito e conforme dei Termini;</li>
          <li>Dei contenuti trasmessi (testi, immagini, dati di localizzazione);</li>
          <li>Della disponibilità del luogo di intervento e delle autorizzazioni necessarie;</li>
          <li>Del rispetto delle norme di sicurezza indicate dall&apos;Artigiano.</li>
        </ul>
      </section>

      <section>
        <h2>12. Limitazione di responsabilità del Fornitore</h2>
        <p>
          Nei limiti massimi consentiti dalla legge applicabile, {name} non risponde di: (a) ritardi
          o impossibilità di match; (b) qualità, tempi o esito dell&apos;intervento eseguito
          dall&apos;Artigiano; (c) danni derivanti da informazioni inesatte fornite dal Cliente; (d)
          interruzioni del servizio per manutenzione, forza maggiore o guasti di terze parti; (e)
          perdite indirette o mancati profitti.
        </p>
        <p>
          Resta ferma la responsabilità del Fornitore per dolo o colpa grave e per i casi in cui la
          limitazione non sia ammissibile per legge (inclusi diritti inderogabili del consumatore
          ove applicabili).
        </p>
      </section>

      <section>
        <h2>13. Proprietà intellettuale</h2>
        <p>
          Marchi, loghi, software, testi e layout di {brand} e {product} sono di titolarità di{" "}
          {name} o concessi in licenza. È vietata la riproduzione non autorizzata. Il Cliente
          concede a {name} una licenza non esclusiva per utilizzare i contenuti caricati nella
          misura necessaria all&apos;erogazione del servizio SOS.
        </p>
      </section>

      <section>
        <h2>14. Sospensione e recesso</h2>
        <p>
          {name} può sospendere o chiudere l&apos;accesso al servizio in caso di violazione dei
          Termini, richieste dell&apos;autorità o esigenze di sicurezza. Il Cliente può cessare
          l&apos;utilizzo in qualsiasi momento e richiedere la cancellazione dell&apos;account
          secondo l&apos;Informativa Privacy.
        </p>
      </section>

      <section>
        <h2>15. Modifiche ai Termini</h2>
        <p>
          Il Fornitore può aggiornare i Termini per adeguamenti normativi o evoluzioni del servizio.
          Le modifiche sostanziali saranno comunicate con mezzi idonei (avviso sul sito, email o
          in-app). L&apos;uso continuato del servizio dopo l&apos;entrata in vigore costituisce
          accettazione, salvo diverso obbligo di legge per i consumatori.
        </p>
      </section>

      <section>
        <h2>16. Legge applicabile e foro competente</h2>
        <p>
          I Termini sono regolati dalla <strong>legge italiana</strong>. Per ogni controversia è
          competente il foro del luogo di residenza o domicilio del consumatore, se applicabile il
          Codice del Consumo; negli altri casi, foro di <strong>Milano</strong>, salvo foro
          inderogabile.
        </p>
      </section>

      <section>
        <h2>17. Clauole per consumatori (Italia)</h2>
        <p>
          Ove il Cliente agisca in qualità di consumatore ai sensi del D.Lgs. 206/2005, restano
          applicabili le disposizioni imperative in materia di contratti a distanza, garanzie legali
          sui beni/servizi acquistati <strong>dall&apos;Artigiano</strong>, e risoluzione
          extragiudiziale delle controversie (Piattaforma ODR UE:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          ). {name} non è obbligato a partecipare a procedure di risoluzione alternativa salvo
          obblighi di legge.
        </p>
      </section>

      <section>
        <h2>18. Contatti</h2>
        <p>
          {name} — {brand} / {product}
          <br />
          Email: <a href={`mailto:${infoEmail}`}>{infoEmail}</a>
          <br />
          Amministrazione: <a href={`mailto:${adminEmail}`}>{adminEmail}</a>
        </p>
      </section>
    </>
  );
}
