import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function SuperMastroCookieContent() {
  const { name, product, brand, privacyEmail } = LEGAL_ENTITY;

  return (
    <>
      <section>
        <h2>1. Introduzione</h2>
        <p>
          La presente Cookie Policy descrive le tecnologie di tracciamento utilizzate sul sito{" "}
          {brand}, con particolare riferimento alla sezione <strong>{product}</strong>, e le modalità
          con cui l&apos;utente può gestire le proprie preferenze, in conformità al Regolamento UE
          2016/679 (GDPR), al D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018, e alle
          Linee guida del Garante Privacy del 10 giugno 2021 in materia di cookie.
        </p>
        <p>
          Per il trattamento dei dati personali connesso ai cookie si rimanda anche
          all&apos;{" "}
          <a href="/supermastro/privacy">Informativa Privacy</a> di {product}.
        </p>
      </section>

      <section>
        <h2>2. Titolare e contatti</h2>
        <p>
          Titolare: <strong>{name}</strong>. Per informazioni su cookie e privacy:{" "}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
      </section>

      <section>
        <h2>3. Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file di testo che i siti visitati inviano al terminale
          dell&apos;utente, dove vengono memorizzati per essere ritrasmessi agli stessi siti alla
          visita successiva. Tecnologie analoghe (local storage, session storage, pixel, SDK) possono
          essere utilizzate per finalità simili e sono trattate con le stesse logiche di informativa
          e consenso, ove richiesto.
        </p>
      </section>

      <section>
        <h2>4. Tipologie di cookie utilizzati</h2>

        <h3>4.1 Cookie tecnici (necessari)</h3>
        <p>
          Sono indispensabili al funzionamento del sito e del servizio {product}. Non richiedono
          consenso. Includono, a titolo esemplificativo:
        </p>
        <ul>
          <li>Cookie di sessione e autenticazione (magic link, area riservata);</li>
          <li>Cookie di sicurezza e prevenzione CSRF;</li>
          <li>Memorizzazione preferenze essenziali (es. consenso cookie già espresso);</li>
          <li>
            In modalità demo SOS: dati temporanei in <strong>sessionStorage</strong> del browser
            per simulare il flusso senza account (non condivisi con terze parti).
          </li>
        </ul>

        <h3>4.2 Cookie analitici</h3>
        <p>
          Consentono di raccogliere informazioni aggregate sull&apos;utilizzo del sito (pagine
          visitate, tempo di permanenza, errori) al fine di migliorare l&apos;esperienza utente.
          Sono installati <strong>solo previo consenso</strong> dell&apos;utente. Quando attivi,
          possono includere servizi di analytics con sede in UE o, ove applicabile, con garanzie
          contrattuali per eventuali trasferimenti extra-UE.
        </p>

        <h3>4.3 Cookie di profilazione / marketing</h3>
        <p>
          Al momento {product} <strong>non utilizza cookie di profilazione</strong> per pubblicità
          comportamentale cross-site. Qualora tali strumenti venissero introdotti in futuro,
          l&apos;utente sarà informato e potrà prestare o negare il consenso tramite il banner
          dedicato.
        </p>

        <h3>4.4 Cookie di terze parti</h3>
        <p>
          Alcune funzionalità possono comportare cookie impostati da fornitori esterni strettamente
          necessari all&apos;erogazione del servizio (es. infrastruttura cloud, CDN). Tali cookie
          rientrano prevalentemente nella categoria tecnica. L&apos;elenco aggiornato dei principali
          fornitori è disponibile su richiesta a{" "}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
      </section>

      <section>
        <h2>5. Tabella riepilogativa (indicativa)</h2>
        <table>
          <thead>
            <tr>
              <th>Nome / tipologia</th>
              <th>Finalità</th>
              <th>Durata</th>
              <th>Base / consenso</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sessione auth Supabase</td>
              <td>Login e sicurezza area riservata</td>
              <td>Sessione / rinnovo automatico</td>
              <td>Tecnico — non richiede consenso</td>
            </tr>
            <tr>
              <td>cookie_consent / preferenze</td>
              <td>Memorizzare scelta banner cookie</td>
              <td>12 mesi</td>
              <td>Tecnico — non richiede consenso</td>
            </tr>
            <tr>
              <td>Analytics (se abilitati)</td>
              <td>Statistiche aggregate di utilizzo</td>
              <td>Fino a 13 mesi</td>
              <td>Consenso preventivo</td>
            </tr>
            <tr>
              <td>sessionStorage demo SOS</td>
              <td>Simulazione richiesta in demo</td>
              <td>Fino a chiusura scheda browser</td>
              <td>Tecnico locale — non richiede consenso</td>
            </tr>
          </tbody>
        </table>
        <p>
          I nomi effettivi possono variare in base agli aggiornamenti tecnici; la finalità e la
          categoria restano quelle descritte.
        </p>
      </section>

      <section>
        <h2>6. Gestione del consenso</h2>
        <p>
          Al primo accesso, ove previsto dalla normativa, viene mostrato un banner che consente di:
        </p>
        <ul>
          <li>Accettare tutti i cookie non necessari;</li>
          <li>Rifiutare i cookie non necessari;</li>
          <li>Personalizzare le preferenze per categoria;</li>
          <li>Revocare o modificare il consenso in qualsiasi momento.</li>
        </ul>
        <p>
          È inoltre possibile gestire i cookie dalle impostazioni del browser (blocco, cancellazione,
          notifica installazione). La disabilitazione dei cookie tecnici può compromettere il
          funzionamento di login, wizard SOS e area riservata.
        </p>
      </section>

      <section>
        <h2>7. Istruzioni per i browser principali</h2>
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox-desktop"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/it-it/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Aggiornamenti</h2>
        <p>
          {name} può modificare la presente Cookie Policy in relazione a nuovi strumenti o obblighi
          normativi. Si invita a consultare periodicamente questa pagina.
        </p>
      </section>
    </>
  );
}
