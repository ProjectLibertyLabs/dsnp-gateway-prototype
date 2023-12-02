import { Context } from "openapi-backend";
import { registerEntitlementChecker } from "./entitlement-checker.js";
import { registerCredentialSchema } from "./vc.js";

// For POC use only!
switch (process.env.FREQUENCY_NETWORK) {
  case "local":
    registerCredentialSchema("https://ondc.org/schema/interactions/testnet/ProofOfPurchase.json", {
      document: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          { "@vocab": "dsnp://13972#" },
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        type: ["VerifiableCredential", "JsonSchemaCredential"],
        issuer: "dsnp://13972",
        issuanceDate: "2023-10-11T22:30:03.607Z",
        expirationDate: "2099-01-01T00:00:00.000Z",
        credentialSchema: {
          id: "https://www.w3.org/2022/credentials/v2/json-schema-credential-schema.json",
          type: "JsonSchema",
          digestSRI: "sha384-S57yQDg1MTzF56Oi9DbSQ14u7jBy0RDdx0YbeV7shwhCS88G8SCXeFq82PafhCrW",
        },
        credentialSubject: {
          type: "JsonSchema",
          jsonSchema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            title: "OndcProofOfPurchase",
            type: "object",
            properties: {
              credentialSubject: {
                type: "object",
                properties: {
                  interactionId: { type: "string" },
                  href: { type: "string" },
                  reference: { type: "object", properties: {} },
                },
                required: ["interactionId", "href", "reference"],
              },
            },
          },
          dsnp: {
            display: { label: { "en-US": "Verified Purchase" } },
            trust: { oneOf: ["dsnp://13972#OndcVerifiedBuyerPlatform", "dsnp://13972#OndcVerifiedSellerPlatform"] },
          },
        },
        proof: {
          type: "Ed25519Signature2020",
          created: "2023-10-11T22:30:03Z",
          verificationMethod: "dsnp://13972#0",
          proofPurpose: "assertionMethod",
          proofValue: "z2c62FsZNHR68kX3BpN4zpLfBS2wxJFXp7c63dzCb8nRsajH7rhMWHLue914vWZN7YfwSaidPKZEfv6b5GcS2ZQuH",
        },
      },
    });

    registerEntitlementChecker("dsnp://1#OndcProofOfPurchase", async (c: Context) => {
      // Insert logic to validate c.request.body.reference here
      const reference = c.request.body.reference;

      // Example only!
      if (reference.hello !== "world") {
        return null; // not entitled
      }

      return {
        schemaUrl: "https://ondc.org/schema/interactions/testnet/ProofOfPurchase.json",
        href: c.request.body.href,
      };
    });
    break;
  case "testnet":
    registerCredentialSchema("https://ondc.org/schema/interactions/ProofOfPurchase.json", {
      document: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          { "@vocab": "dsnp://1#" },
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        type: ["VerifiableCredential", "JsonSchemaCredential"],
        issuer: "dsnp://1",
        issuanceDate: "2023-10-09T03:31:37.264Z",
        expirationDate: "2099-01-01T00:00:00.000Z",
        credentialSchema: {
          id: "https://www.w3.org/2022/credentials/v2/json-schema-credential-schema.json",
          type: "JsonSchema",
          digestSRI: "sha384-S57yQDg1MTzF56Oi9DbSQ14u7jBy0RDdx0YbeV7shwhCS88G8SCXeFq82PafhCrW",
        },
        credentialSubject: {
          type: "JsonSchema",
          jsonSchema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            title: "OndcProofOfPurchase",
            type: "object",
            properties: {
              credentialSubject: {
                type: "object",
                properties: {
                  interactionId: { type: "string" },
                  href: { type: "string" },
                  reference: { type: "object", properties: { hello: { type: "string" } }, required: ["hello"] },
                },
                required: ["interactionId", "href", "reference"],
              },
            },
          },
          dsnp: {
            display: { label: { "en-US": "Verified Purchase" } },
            trust: { oneOf: ["dsnp://1#OndcVerifiedBuyerPlatform", "dsnp://1#OndcVerifiedSellerPlatform"] },
          },
        },
        proof: {
          type: "Ed25519Signature2020",
          created: "2023-10-09T03:31:37Z",
          verificationMethod: "dsnp://1#0",
          proofPurpose: "assertionMethod",
          proofValue: "z5bGHHXkuPtybipzWfda1EBbzGeK95VMJGg7FuoKq5JSD4akPejDxqEw9pEJwo36BaFXw8x2hrBpgotwx9e7BE9hq",
        },
      },
    });

    registerEntitlementChecker("dsnp://13972#OndcProofOfPurchase", async (c: Context) => {
      // Insert logic to validate c.request.body.reference here
      const reference = c.request.body.reference;

      // Example only!
      if (reference.hello !== "world") {
        return null; // not entitled
      }

      return {
        schemaUrl: "https://ondc.org/schema/interactions/testnet/ProofOfPurchase.json",
        href: c.request.body.href,
      };
    });
    break;
  default:
    throw new Error("Only use this on local or testnet");
}
