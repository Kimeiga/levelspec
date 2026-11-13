import type { Rng } from "../../../generate/rng.ts";
import {
  GIVEN_NAMES,
  NUMERALS,
  PRACTITIONER_TITLES,
  SHOP_NAMES,
  SUFFIXES,
  SURNAMES,
  TAGLINES,
  TRADES,
  type Trade,
} from "./words.ts";

/** A business as its signs letter it. Every string is ready to set in type. */
export interface Business {
  /** Two ideographs for a shop, or a practitioner's full name. */
  name: string;
  /** What the business is, lettered after or beside the name. */
  trade: string;
  /** Name and trade in capitals for a second line. */
  english: string;
  /** A slogan or specialty lettered small beside the title. */
  tagline: string;
  /** Telephone number: digits and a hyphen. */
  phone: string;
  /** The floor an upstairs business is on, counted the local way: 1 is the story above the shops. */
  floor?: number;
  sector: Trade["sector"];
}

/** What a business may be drawn from. Omitted fields leave the choice open. */
export interface BusinessBrief {
  /** Sectors to choose the trade from. */
  sectors?: Trade["sector"][];
  /** The trade as lettered, such as one of `TRADES`; overrides `sectors`. */
  trade?: string;
  floor?: number;
}

/**
 * Invents a business from `rng`. Medical trades are often practitioners
 * trading under their own name; every other business takes a shop name.
 */
export function inventBusiness(rng: Rng, brief: BusinessBrief = {}): Business {
  const named = brief.trade === undefined ? undefined : TRADES.find((trade) => trade.zh === brief.trade);
  const sectors = brief.sectors;
  const pool = sectors ? TRADES.filter((trade) => sectors.includes(trade.sector)) : TRADES;
  const trade = named ?? rng.pick(pool);
  const phone = `${rng.pick(["3", "3", "3", "K"])}-${String(rng.int(200000, 989999))}`;
  const tagline = rng.pick(TAGLINES[trade.sector]);
  const titles = PRACTITIONER_TITLES[trade.zh];
  if (titles && rng.bool(0.5)) {
    const surname = rng.pick(SURNAMES),
      given = rng.pick(GIVEN_NAMES),
      title = rng.pick(titles);
    return {
      name: surname.zh + given.zh,
      trade: title.zh,
      english: `DR ${surname.en} ${given.en}`,
      tagline,
      phone,
      floor: brief.floor,
      sector: trade.sector,
    };
  }
  const shop = rng.pick(SHOP_NAMES);
  return {
    name: shop.zh,
    trade: trade.zh,
    english: `${shop.en} ${trade.en}`,
    tagline,
    phone,
    floor: brief.floor,
    sector: trade.sector,
  };
}

/** The business's title on one line: its name followed by its trade. */
export function titleOf(business: Business): string {
  return business.name + business.trade;
}

/** The floor line of an upstairs business, or undefined at street level or above the tenth floor. */
export function floorLine(business: Business): string | undefined {
  const { floor } = business;
  if (floor === undefined || floor < 1 || floor >= NUMERALS.length) return undefined;
  return NUMERALS[floor] + SUFFIXES.floor;
}

/** The telephone line: the word for telephone and the number. */
export function phoneLine(business: Business): string {
  return `${SUFFIXES.phone} ${business.phone}`;
}

/** The title as painted large on a wall, sometimes as a company or as one of its branches. */
export function companyTitle(business: Business, rng: Rng): string {
  return titleOf(business) + rng.pick(["", "", "", SUFFIXES.company, SUFFIXES.company, SUFFIXES.branch]);
}

/** The line that sends callers upstairs to the business's floor, or undefined at street level. */
export function wayUp(business: Business): string | undefined {
  const floor = floorLine(business);
  return floor && SUFFIXES.up + floor;
}
