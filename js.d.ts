declare module "@digitalbazaar/vc" {
  export function defaultDocumentLoader(url: string): any;
  export function issue(params: any): import("./types/openapi.d.ts").Components.Schemas.VerifiableCredentialWithEd25519Proof;
  export function verifyCredential(options: any): any;
}

declare module "@digitalbazaar/ed25519-verification-key-2020" {
  export interface Ed25519VerificationKey2020 {
  }
}

declare module "@digitalbazaar/ed25519-signature-2020" {
  export class Ed25519Signature2020 {
    constructor(o: any);
    verificationMethod: string;
  }
  export const suiteContext: any;
}

declare module "jsonld-signatures" {
  export function extendContextLoader(extension: ((string) => any));
}
