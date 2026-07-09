"use client";



import type { ConciergePlaceResult, ConciergeSearchResult } from "@/lib/procione/concierge";

import { Bookmark, ExternalLink, MapPin, Train } from "lucide-react";



type ConciergeResultsCardProps = {

  result: ConciergeSearchResult;

  onDismiss?: () => void;

  onSavePlace?: (place: ConciergePlaceResult, index: number) => void;

};



export function ConciergeResultsCard({ result, onDismiss, onSavePlace }: ConciergeResultsCardProps) {

  const isTrain = result.kind === "train";



  return (

    <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-md ring-1 ring-orange-100">

      <div className="mb-3 flex items-start justify-between gap-2">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">

            Concierge Procione

          </p>

          <h3 className="text-sm font-semibold text-gray-900">

            {isTrain ? "Treni" : result.kind === "hotel" ? "Hotel" : "Ristoranti"} — {result.destination}

          </h3>

          {result.favoriteHint && (

            <p className="mt-1 text-xs font-medium text-orange-700">{result.favoriteHint}</p>

          )}

          {result.policyNote && (

            <p className="mt-1 text-xs text-gray-500">{result.policyNote}</p>

          )}

        </div>

        {onDismiss && (

          <button

            type="button"

            onClick={onDismiss}

            className="text-xs text-gray-400 hover:text-gray-600"

          >

            Chiudi

          </button>

        )}

      </div>



      {isTrain &&

        result.transit?.map((route, idx) => (

          <a

            key={idx}

            href={route.mapsUrl}

            target="_blank"

            rel="noopener noreferrer"

            className="mb-2 flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-orange-200 hover:bg-orange-50/40"

          >

            <Train className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />

            <div className="min-w-0 flex-1">

              <p className="text-sm font-medium text-gray-900">

                {route.duration} · {route.departure} → {route.arrival}

              </p>

              <p className="text-xs text-gray-500">

                {route.legs.map((l) => l.line).join(" · ") || route.summary}

              </p>

            </div>

            <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" />

          </a>

        ))}



      {!isTrain &&

        result.places?.map((place, idx) => (

          <div

            key={idx}

            className="mb-2 rounded-xl border border-gray-100 p-3 transition hover:border-orange-200 hover:bg-orange-50/40"

          >

            <div className="flex items-start gap-3">

              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />

              <div className="min-w-0 flex-1">

                <p className="text-sm font-medium text-gray-900">

                  {place.name}

                  {place.isFavorite && (

                    <span className="ml-1 text-xs font-normal text-orange-600">(già gradito)</span>

                  )}

                </p>

                <p className="truncate text-xs text-gray-500">{place.address}</p>

                {place.rating != null && (

                  <p className="text-xs text-orange-600">★ {place.rating.toFixed(1)}</p>

                )}

              </div>

            </div>

            <div className="mt-2 flex flex-wrap gap-2">

              <a

                href={place.mapsUrl}

                target="_blank"

                rel="noopener noreferrer"

                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-orange-200"

              >

                <ExternalLink className="h-3 w-3" />

                Maps

              </a>

              {place.bookingUrl && (

                <a

                  href={place.bookingUrl}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"

                >

                  Booking

                </a>

              )}

              {onSavePlace && (

                <button

                  type="button"

                  onClick={() => onSavePlace(place, idx)}

                  className="inline-flex items-center gap-1 rounded-lg border border-orange-300 px-2.5 py-1.5 text-xs font-semibold text-[#F27131] hover:bg-orange-50"

                >

                  <Bookmark className="h-3 w-3" />

                  Salva prenotazione

                </button>

              )}

            </div>

          </div>

        ))}

    </div>

  );

}

