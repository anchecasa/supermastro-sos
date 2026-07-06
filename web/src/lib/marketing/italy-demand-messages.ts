export type DemandMessage = {
  id: string;
  text: string;
  place: string;
  lat: number;
  lng: number;
  regionId: string;
};

/** Messaggi — coordinate reali, distribuiti su più regioni */
export const CLIENT_DEMAND_MESSAGES: DemandMessage[] = [
  {
    id: "trastevere-elettricista",
    text: "Elettricista urgente",
    place: "Trastevere",
    lat: 41.8894,
    lng: 12.4692,
    regionId: "lazio",
  },
  {
    id: "milano-idraulico",
    text: "Richiesta SOS — idraulico",
    place: "Milano",
    lat: 45.4642,
    lng: 9.19,
    regionId: "lombardia",
  },
  {
    id: "napoli-perdita",
    text: "Perdita d'acqua",
    place: "Napoli",
    lat: 40.8518,
    lng: 14.2681,
    regionId: "campania",
  },
  {
    id: "firenze-fabbro",
    text: "Fabbro",
    place: "Firenze",
    lat: 43.7696,
    lng: 11.2558,
    regionId: "toscana",
  },
  {
    id: "torino-elettricista",
    text: "Elettricista urgente",
    place: "Torino",
    lat: 45.0703,
    lng: 7.6869,
    regionId: "piemonte",
  },
  {
    id: "bari-idraulico",
    text: "Richiesta SOS — idraulico",
    place: "Bari",
    lat: 41.1171,
    lng: 16.8719,
    regionId: "puglia",
  },
  {
    id: "venezia-sos",
    text: "SOS idraulico",
    place: "Venezia",
    lat: 45.4408,
    lng: 12.3155,
    regionId: "veneto",
  },
  {
    id: "palermo-elettricista",
    text: "Elettricista urgente",
    place: "Palermo",
    lat: 38.1157,
    lng: 13.3615,
    regionId: "sicilia",
  },
];

export const WORKER_DEMAND_MESSAGES: DemandMessage[] = [
  {
    id: "rita-elettricista",
    text: "Rita cerca un elettricista",
    place: "Trastevere",
    lat: 41.8894,
    lng: 12.4692,
    regionId: "lazio",
  },
  {
    id: "marco-idraulico",
    text: "Marco cerca un idraulico",
    place: "Milano",
    lat: 45.4642,
    lng: 9.19,
    regionId: "lombardia",
  },
  {
    id: "giulia-sos",
    text: "Giulia — SOS idraulico",
    place: "Napoli",
    lat: 40.8518,
    lng: 14.2681,
    regionId: "campania",
  },
  {
    id: "andrea-fabbro",
    text: "Andrea cerca un fabbro",
    place: "Firenze",
    lat: 43.7696,
    lng: 11.2558,
    regionId: "toscana",
  },
  {
    id: "luca-elettricista",
    text: "Luca cerca un elettricista",
    place: "Torino",
    lat: 45.0703,
    lng: 7.6869,
    regionId: "piemonte",
  },
  {
    id: "sara-idraulico",
    text: "Sara cerca un idraulico",
    place: "Bari",
    lat: 41.1171,
    lng: 16.8719,
    regionId: "puglia",
  },
  {
    id: "paolo-sos",
    text: "Paolo — SOS elettricista",
    place: "Venezia",
    lat: 45.4408,
    lng: 12.3155,
    regionId: "veneto",
  },
  {
    id: "elena-perdita",
    text: "Elena cerca un idraulico",
    place: "Palermo",
    lat: 38.1157,
    lng: 13.3615,
    regionId: "sicilia",
  },
];

/** Messaggi recruitment — domanda lavoro nationwide */
export const RECRUITMENT_DEMAND_MESSAGES: DemandMessage[] = [
  {
    id: "milano-segretaria",
    text: "Cercasi segretaria 20h",
    place: "Milano",
    lat: 45.4642,
    lng: 9.19,
    regionId: "lombardia",
  },
  {
    id: "roma-fattorino",
    text: "Fattorino part-time",
    place: "Roma",
    lat: 41.9028,
    lng: 12.4964,
    regionId: "lazio",
  },
  {
    id: "napoli-manutentore",
    text: "Manutentore condominio",
    place: "Napoli",
    lat: 40.8518,
    lng: 14.2681,
    regionId: "campania",
  },
  {
    id: "firenze-muratore",
    text: "Muratore cerca lavoro",
    place: "Firenze",
    lat: 43.7696,
    lng: 11.2558,
    regionId: "toscana",
  },
  {
    id: "torino-magazziniere",
    text: "Magazziniere in zona",
    place: "Torino",
    lat: 45.0703,
    lng: 7.6869,
    regionId: "piemonte",
  },
  {
    id: "bari-addetto-pulizie",
    text: "Addetto pulizie hotel",
    place: "Bari",
    lat: 41.1171,
    lng: 16.8719,
    regionId: "puglia",
  },
  {
    id: "venezia-receptionist",
    text: "Receptionist stagionale",
    place: "Venezia",
    lat: 45.4408,
    lng: 12.3155,
    regionId: "veneto",
  },
  {
    id: "palermo-saldatore",
    text: "Saldatore disponibile",
    place: "Palermo",
    lat: 38.1157,
    lng: 13.3615,
    regionId: "sicilia",
  },
];

/** Puntini ambient su altre città (visibilità domanda/offerta su tutta Italia) */
export const AMBIENT_CITY_PINS = [
  { lat: 44.4056, lng: 8.9463, label: "Genova" },
  { lat: 44.4949, lng: 11.3426, label: "Bologna" },
  { lat: 41.9028, lng: 12.4964, label: "Roma" },
  { lat: 39.2238, lng: 9.1217, label: "Cagliari" },
] as const;
