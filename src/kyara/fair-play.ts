// Demande à l'API les prix fair-play manquants, avec le minimum de requêtes :
//  - seulement pour les offres acceptables (tu possèdes au moins une carte demandée),
//  - seulement pour la carte proposée + tes cartes demandées,
//  - par lots de 200 ids (comme le site), une requête à la fois,
//  - prix redemandé après 1 h, id en échec réessayé après 5 min,
//  - rien si l'onglet est caché.
import { createLogger } from "../core/log";
import type { OwnedCards } from "../core/storage";
import { isFresh, type PriceStore, writeEntries } from "../core/storage";
import { kyaraFetch } from "./api";
import type { Offer } from "./dom";
import type { OffersSnapshot } from "./offers";
import { parseFair } from "./parse";

const log = createLogger("fair-play");

export const TTL = 60 * 60 * 1000; // prix redemandé après 1 h
export const RETRY = 5 * 60 * 1000; // id en échec : pas de nouvel essai avant 5 min
export const BATCH = 200;

/** Ids dont le prix est à (re)demander, et nombre d'offres acceptables. Fonction pure. */
export function findMissing(
  offers: Offer[],
  owned: OwnedCards | null,
  store: PriceStore,
  tried: Map<number, number>,
  now = Date.now(),
): { need: Set<number>; acceptable: number } {
  const need = new Set<number>();
  let acceptable = 0;
  if (!owned) return { need, acceptable };
  for (const { give, wants } of offers) {
    const mine = wants.filter((c) => (owned[c.id] ?? 0) > 0);
    if (!give || !mine.length) continue;
    acceptable++;
    for (const { id } of [give, ...mine]) {
      const stale = !isFresh(store.fair[id], TTL, now);
      if (stale && now - (tried.get(id) ?? 0) > RETRY) need.add(id);
    }
  }
  return { need, acceptable };
}

export interface FairPlayRequester {
  /** Lance si besoin les requêtes pour cet instantané. `onDone` est appelé quand elles sont finies. */
  request(snapshot: OffersSnapshot, onDone: () => void): void;
}

export function createFairPlayRequester(): FairPlayRequester {
  const tried = new Map<number, number>(); // id -> date du dernier essai
  let inflight = false;

  async function fetchAll(ids: number[]): Promise<void> {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      for (const id of chunk) tried.set(id, Date.now());
      const res = await kyaraFetch(`/fair-play/prices?ids=${chunk.join(",")}`);
      log.debug(`fair-play : ${chunk.length} ids -> HTTP ${res.status}`);
      if (res.ok) await writeEntries(parseFair(res.data));
    }
  }

  return {
    request({ offers, owned, store }, onDone) {
      const { need, acceptable } = findMissing(offers, owned, store, tried);
      log.debug(`${offers.length} offres, ${acceptable} acceptables, ${need.size} prix à demander`);
      if (!need.size) return;
      if (inflight) return log.debug("requête reportée : une requête est en cours"); // relancé à la fin
      if (document.visibilityState !== "visible") return log.debug("requête reportée : onglet caché");
      inflight = true;
      fetchAll([...need])
        .catch((err) => log.error("fair-play : erreur", err))
        .finally(() => {
          inflight = false;
          onDone(); // la liste a pu changer pendant la requête (ex. filtre "Que je peux accepter")
        });
    },
  };
}
