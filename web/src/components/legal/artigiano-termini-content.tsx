import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function ArtigianoTerminiContent() {
  const { name, brand, seat, infoEmail, adminEmail } = LEGAL_ENTITY;

  return (
    <>
      <section>
        <h2>1. Oggetto</h2>
        <p>
          I presenti Termini regolano l&apos;iscrizione e l&apos;utilizzo dell&apos;area Artigiano
          della piattaforma <strong>{brand}</strong>, gestita da <strong>{name}</strong>, con sede
          in {seat}, da parte di professionisti autonomi (&quot;Artigiano&quot; o &quot;Mastro&quot;).
        </p>
        <p>
          L&apos;Artigiano accetta anche l&apos;{" "}
          <a href="/artigiano/privacy">Informativa Privacy</a> e la{" "}
          <a href="/supermastro/cookie">Cookie Policy</a> del sito.
        </p>
      </section>

      <section>
        <h2>2. Natura del rapporto</h2>
        <p>
          {name} fornisce strumenti tecnologici di visibilità, ricezione richieste e match con
          clienti. L&apos;Artigiano opera in regime di <strong>autonomia professionale</strong> ed
          è l&apos;unico responsabile dell&apos;esecuzione dei lavori, della sicurezza in cantiere,
          degli adempimenti assicurativi, fiscali e previdenziali e del rapporto contrattuale con il
          cliente finale.
        </p>
      </section>

      <section>
        <h2>3. Requisiti di iscrizione</h2>
        <p>L&apos;Artigiano dichiara di:</p>
        <ul>
          <li>Essere maggiorenne e legittimato allo svolgimento dell&apos;attività dichiarata;</li>
          <li>Fornire dati veritieri su competenze, recapiti e zone operative;</li>
          <li>Possedere, ove richiesto dalla legge, assicurazione RC professionale valida;</li>
          <li>Rispettare il codice deontologico e le norme applicabili al proprio settore.</li>
        </ul>
        <p>
          {name} può sospendere o revocare l&apos;iscrizione in caso di false dichiarazioni, reclami
          gravemente fondati o violazioni dei Termini.
        </p>
      </section>

      <section>
        <h2>4. Richieste SOS e disponibilità</h2>
        <p>
          L&apos;Artigiano può ricevere richieste urgenti (SOS) e ordinarie tramite la piattaforma.
          È tenuto a gestire le notifiche con diligenza professionale e a comunicare tempestivamente
          indisponibilità o impossibilità di intervento. L&apos;accettazione di una richiesta impegna
          l&apos;Artigiano verso il cliente nei termini concordati direttamente con quest&apos;ultimo.
        </p>
      </section>

      <section>
        <h2>5. Corrispettivi e commissioni</h2>
        <p>
          Eventuali commissioni, abbonamenti o canoni per l&apos;utilizzo della piattaforma sono
          indicati in area riservata o in accordi separati. Salvo diverso accordo scritto, il
          prezzo dell&apos;intervento per il cliente è determinato dall&apos;Artigiano.
        </p>
      </section>

      <section>
        <h2>6. Obblighi dell&apos;Artigiano</h2>
        <ul>
          <li>Trattare i dati dei clienti conformemente al GDPR e solo per finalità di intervento;</li>
          <li>Non aggirare la piattaforma per eludere obblighi contrattuali con {name} ove previsti;</li>
          <li>Non utilizzare marchi {brand} senza autorizzazione scritta;</li>
          <li>Mantenere riservate credenziali di accesso all&apos;area riservata.</li>
        </ul>
      </section>

      <section>
        <h2>7. Limitazione di responsabilità di {name}</h2>
        <p>
          {name} non garantisce un volume minimo di richieste né risponde della condotta
          dell&apos;Artigiano verso i clienti, salvo dolo o colpa grave del Fornitore o obblighi
          inderogabili di legge.
        </p>
      </section>

      <section>
        <h2>8. Durata e recesso</h2>
        <p>
          Il rapporto ha durata a tempo indeterminato salvo diverso accordo. Ciascuna parte può
          recedere con preavviso ragionevole secondo quanto indicato nell&apos;area riservata o via
          email a <a href={`mailto:${adminEmail}`}>{adminEmail}</a>.
        </p>
      </section>

      <section>
        <h2>9. Legge applicabile e foro</h2>
        <p>
          Legge italiana. Foro competente: Milano, salvo foro inderogabile per i professionisti
          consumatori ove applicabile.
        </p>
      </section>

      <section>
        <h2>10. Contatti</h2>
        <p>
          {name} — {brand} Artigiano
          <br />
          <a href={`mailto:${infoEmail}`}>{infoEmail}</a>
        </p>
      </section>
    </>
  );
}
