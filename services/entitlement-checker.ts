import { Context } from "openapi-backend";

export type Entitlement = {
  schemaUrl: string;
  href: string;
};

export type EntitlementChecker = (c: Context) => Promise<Entitlement | null>;
type CheckerMapType = {
  [key: string]: EntitlementChecker;
};

const checkers: CheckerMapType = {};

export const registerEntitlementChecker = (attributeSetType: string, checker: EntitlementChecker) => {
  if (checkers[attributeSetType]) {
    throw new Error(`An EntitlementChecker is already registered for attributeSetType '${attributeSetType}'`);
  }
  checkers[attributeSetType] = checker;
};

export const getEntitlementChecker = (attributeSetType: string) => {
  return checkers[attributeSetType];
};
