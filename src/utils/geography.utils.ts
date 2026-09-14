import { User } from "@/modules/user/user.model";

import { BadRequestException } from "./app-error.utils";

export type GeographyFields = {
  country?: string;
  state?: string;
  city?: string;
};

export function normalizeGeographyValue(value?: string | null): string | undefined {
  if (typeof value !== "string")
    return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function normalizeGeography<T extends GeographyFields>(value: T): T {
  return {
    ...value,
    country: normalizeGeographyValue(value.country),
    state: normalizeGeographyValue(value.state),
    city: normalizeGeographyValue(value.city),
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildCaseInsensitiveExactMatch(value?: string) {
  const normalized = normalizeGeographyValue(value);
  if (!normalized)
    return undefined;
  return new RegExp(`^${escapeRegex(normalized)}$`, "i");
}

export function buildGeographyFilter(value: GeographyFields) {
  const normalized = normalizeGeography(value);
  const filter: Record<string, unknown> = {};

  const country = buildCaseInsensitiveExactMatch(normalized.country);
  const state = buildCaseInsensitiveExactMatch(normalized.state);
  const city = buildCaseInsensitiveExactMatch(normalized.city);

  if (country)
    filter.country = country;
  if (state)
    filter.state = state;
  if (city)
    filter.city = city;

  return filter;
}

export function ensureCountryProvided(country?: string | null) {
  if (!normalizeGeographyValue(country)) {
    throw new BadRequestException("country is required");
  }
}

export async function getUserGeography(userId?: string | null) {
  if (!userId)
    return {} as GeographyFields;

  const user = await User.findById(userId)
    .select("country state city")
    .lean();

  if (!user)
    return {} as GeographyFields;

  return normalizeGeography({
    country: user.country,
    state: user.state,
    city: user.city,
  });
}
