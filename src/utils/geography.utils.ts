import { User } from "@/modules/user/user.model";
import { BadRequestException } from "./app-error.utils";

export type GeographyFields = {
  country?: string;
  state?: string;
  city?: string;
};

export const normalizeGeographyValue = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const normalizeGeography = <T extends GeographyFields>(value: T): T => {
  return {
    ...value,
    country: normalizeGeographyValue(value.country),
    state: normalizeGeographyValue(value.state),
    city: normalizeGeographyValue(value.city),
  };
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildCaseInsensitiveExactMatch = (value?: string) => {
  const normalized = normalizeGeographyValue(value);
  if (!normalized) return undefined;
  return new RegExp(`^${escapeRegex(normalized)}$`, "i");
};

export const buildGeographyFilter = (value: GeographyFields) => {
  const normalized = normalizeGeography(value);
  const filter: Record<string, unknown> = {};

  const country = buildCaseInsensitiveExactMatch(normalized.country);
  const state = buildCaseInsensitiveExactMatch(normalized.state);
  const city = buildCaseInsensitiveExactMatch(normalized.city);

  if (country) filter.country = country;
  if (state) filter.state = state;
  if (city) filter.city = city;

  return filter;
};

export const ensureCountryProvided = (country?: string | null) => {
  if (!normalizeGeographyValue(country)) {
    throw new BadRequestException("country is required");
  }
};

export const getUserGeography = async (userId?: string | null) => {
  if (!userId) return {} as GeographyFields;

  const user = await User.findById(userId)
    .select("country state city")
    .lean();

  if (!user) return {} as GeographyFields;

  return normalizeGeography({
    country: user.country,
    state: user.state,
    city: user.city,
  });
};
