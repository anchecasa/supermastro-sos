import { LEGAL_ENTITY } from "@/lib/legal/constants";

export function ArtigianoPrivacyContent() {
  const { name, brand, seat, infoEmail } = LEGAL_ENTITY;

  return (
    <>
      <section>
        <h2>1. Titolare del trattamento</h2>
        <p>
          Il Titolare del trattamento è <strong>{name}</strong>, con sede legale in {seat},
          gestore della piattaforma <strong>{brand}</strong> e del programma di iscrizione per
          artigiani e professionisti (&quot;Mastri&quot;).
        </p>
        <p>
          Contatti: <a href={`mailto:${infoEmail}`}>{infoEmail}</a>
        </p>
      </section>

      <section>
        <h2>2. Ambito</h2>
        <p>
          La presente informativa riguarda i dati personali dei professionisti e candidati che si
          registrano, completano l&apos;onboarding o operano nell&apos;area talent di {brand},
          incluse competenze, zone operative, Partita IVA (artigiani) e opportunità recruitment
          nationwide.
        </p>
        <p>
          L&apos;iscrizione è aperta in tutta Italia. Il servizio SOS urgente e le opportunità di
          lavoro operano su base nazionale in base a competenze e zona indicata.
        </p>
      </section>

      <section>
        <h2>3. Dati trattati</h2>
        <ul>
          <li>Dati anagrafici e identificativi (nome, cognome, email, telefono);</li>
          <li>Dati professionali (categoria/mestiere, competenze, esperienza, P.IVA ove richiesta);</li>
          <li>Dati di geolocalizzazione e zone di copertura per l&apos;assegnazione richieste;</li>
          <li>Documenti e certificazioni eventualmente caricati;</li>
          <li>Log di accesso, dispositivo, IP e cookie (vedi{" "}
            <a href="/supermastro/cookie">Cookie Policy</a> del sito {brand});</li>
          <li>Storico richieste ricevute, risposte e interazioni con i clienti via piattaforma.</li>
        </ul>
      </section>

      <section>
        <h2>4. Finalità e base giuridica</h2>
        <ul>
          <li>
            <strong>Gestione iscrizione e contratto di collaborazione</strong> — esecuzione
            contrattuale (art. 6.1.b GDPR);
          </li>
          <li>
            <strong>Invio e gestione richieste di lavoro / SOS</strong> — esecuzione contrattuale;
          </li>
          <li>
            <strong>Verifica identità e qualifiche professionali</strong> — legittimo interesse e/o
            obbligo di legge;
          </li>
          <li>
            <strong>Comunicazioni operative e assistenza</strong> — esecuzione contrattuale;
          </li>
          <li>
            <strong>Adempimenti fiscali e contabili</strong> — obbligo di legge (art. 6.1.c);
          </li>
          <li>
            <strong>Miglioramento servizio e sicurezza</strong> — legittimo interesse (art. 6.1.f).
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Conservazione</h2>
        <p>
          I dati sono conservati per la durata del rapporto contrattuale e, successivamente, fino a{" "}
          <strong>24 mesi</strong> dall&apos;ultima interazione, salvo obblighi di legge più lunghi
          (es. documenti contabili fino a 10 anni).
        </p>
      </section>

      <section>
        <h2>6. Destinatari</h2>
        <p>
          I dati possono essere comunicati a clienti {brand} limitatamente a quanto necessario per
          il match e l&apos;esecuzione dell&apos;intervento, a fornitori tecnologici (hosting UE,
          email), consulenti e autorità ove previsto. I dati non sono venduti a terzi per marketing
          indipendente.
        </p>
      </section>

      <section>
        <h2>7. Diritti</h2>
        <p>
          L&apos;interessato può esercitare i diritti GDPR (accesso, rettifica, cancellazione,
          limitazione, portabilità, opposizione) scrivendo a{" "}
          <a href={`mailto:${infoEmail}`}>{infoEmail}</a> e proporre reclamo al Garante (
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
            garanteprivacy.it
          </a>
          ).
        </p>
      </section>
    </>
  );
}
