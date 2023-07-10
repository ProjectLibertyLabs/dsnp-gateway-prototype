import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios'; 

declare namespace Components {
    namespace Responses {
        export interface UnauthorizedError {
        }
    }
    namespace Schemas {
        export interface AuthAccountResponse {
            dsnpId: string;
            displayHandle?: string;
        }
        export interface BroadcastExtended {
            fromId: string;
            contentHash: string;
            /**
             * JSON-encoded Activity Content Note
             */
            content: string;
            /**
             * Timestamp of the post
             */
            timestamp: string;
            /**
             * Array of ReplyExtended objects
             */
            replies?: ReplyExtended[];
        }
        export interface ChallengeResponse {
            challenge: string;
        }
        export interface CreateIdentityRequest {
            addProviderSignature: string;
            algo: "SR25519";
            baseHandle: string;
            encoding: "hex";
            expiration: number;
            handleSignature: string;
            publicKey: string;
        }
        export interface CreateIdentityResponse {
            accessToken: string;
            expires: number;
        }
        export interface CreatePostRequest {
            content: string;
            images?: string /* binary */[];
        }
        export interface DelegateRequest {
            algo: "SR25519";
            encoding: "hex";
            encodedValue: string;
            publicKey: string;
        }
        export interface DelegateResponse {
            accessToken: string;
            expires: number;
        }
        export interface EditPostRequest {
            targetContentHash: string;
            targetAnnouncementType: number;
            content: string;
        }
        export interface EditProfileRequest {
            content: string;
        }
        export interface HandlesResponse {
            publicKey: string;
            handle: string;
        }
        export interface LoginRequest {
            algo: "SR25519";
            encoding: "hex";
            encodedValue: string;
            publicKey: string;
            challenge: string;
        }
        export interface LoginResponse {
            accessToken: string;
            expires: number;
            dsnpId: string;
        }
        export interface PaginatedBroadcast {
            newestBlockNumber: number;
            oldestBlockNumber: number;
            posts: BroadcastExtended[];
        }
        export interface Profile {
            fromId: string;
            contentHash: string;
            /**
             * JSON-encoded Activity Content Note
             */
            content: string;
            /**
             * Timestamp of the post
             */
            timestamp: string;
            displayHandle?: string;
        }
        export interface ProviderResponse {
            nodeUrl: string;
            providerId: string;
            schemas: number[];
        }
        export interface ReplyExtended {
            fromId: string;
            contentHash: string;
            /**
             * JSON-encoded Activity Content Note
             */
            content: string;
            /**
             * Timestamp of the post
             */
            timestamp: string;
            /**
             * Array of ReplyExtended objects
             */
            replies?: ReplyExtended[];
        }
    }
}
declare namespace Paths {
    namespace AuthAccount {
        namespace Responses {
            export type $200 = Components.Schemas.AuthAccountResponse;
            export interface $202 {
            }
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace AuthChallenge {
        namespace Responses {
            export type $200 = Components.Schemas.ChallengeResponse;
        }
    }
    namespace AuthCreate {
        export type RequestBody = Components.Schemas.CreateIdentityRequest;
        namespace Responses {
            export type $200 = Components.Schemas.CreateIdentityResponse;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace AuthDelegate {
        export type RequestBody = Components.Schemas.DelegateRequest;
        namespace Responses {
            export type $200 = Components.Schemas.DelegateResponse;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace AuthHandles {
        export type RequestBody = string[];
        namespace Responses {
            export type $200 = Components.Schemas.HandlesResponse[];
        }
    }
    namespace AuthLogin {
        export type RequestBody = Components.Schemas.LoginRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LoginResponse;
        }
    }
    namespace AuthLogout {
        namespace Responses {
            export interface $201 {
            }
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace AuthProvider {
        namespace Responses {
            export type $200 = Components.Schemas.ProviderResponse;
        }
    }
    namespace CreateBroadcast {
        export type RequestBody = Components.Schemas.CreatePostRequest;
        namespace Responses {
            export type $200 = Components.Schemas.BroadcastExtended;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace CreateProfile {
        namespace Parameters {
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        export type RequestBody = Components.Schemas.EditProfileRequest;
        namespace Responses {
            export type $200 = Components.Schemas.Profile;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace EditContent {
        namespace Parameters {
            export type ContentHash = string;
            export type Type = string;
        }
        export interface PathParameters {
            contentHash: Parameters.ContentHash;
            type: Parameters.Type;
        }
        export type RequestBody = Components.Schemas.EditPostRequest;
        namespace Responses {
            export type $200 = Components.Schemas.BroadcastExtended;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GetContent {
        namespace Parameters {
            export type ContentHash = string;
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
            contentHash: Parameters.ContentHash;
        }
        namespace Responses {
            export type $200 = Components.Schemas.BroadcastExtended;
            export type $401 = Components.Responses.UnauthorizedError;
            export interface $404 {
            }
        }
    }
    namespace GetDiscover {
        namespace Parameters {
            export type NewestBlockNumber = number;
            export type OldestBlockNumber = number;
        }
        export interface QueryParameters {
            newestBlockNumber?: Parameters.NewestBlockNumber;
            oldestBlockNumber?: Parameters.OldestBlockNumber;
        }
        namespace Responses {
            export type $200 = Components.Schemas.PaginatedBroadcast;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GetFeed {
        namespace Parameters {
            export type NewestBlockNumber = number;
            export type OldestBlockNumber = number;
        }
        export interface QueryParameters {
            newestBlockNumber?: Parameters.NewestBlockNumber;
            oldestBlockNumber?: Parameters.OldestBlockNumber;
        }
        namespace Responses {
            export type $200 = Components.Schemas.PaginatedBroadcast;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GetProfile {
        namespace Parameters {
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.Profile;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GetUserFeed {
        namespace Parameters {
            export type DsnpId = string;
            export type NewestBlockNumber = number;
            export type OldestBlockNumber = number;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        export interface QueryParameters {
            newestBlockNumber?: Parameters.NewestBlockNumber;
            oldestBlockNumber?: Parameters.OldestBlockNumber;
        }
        namespace Responses {
            export type $200 = Components.Schemas.PaginatedBroadcast;
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GraphFollow {
        namespace Parameters {
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        namespace Responses {
            export interface $201 {
            }
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace GraphUnfollow {
        namespace Parameters {
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        namespace Responses {
            export interface $201 {
            }
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
    namespace UserFollowing {
        namespace Parameters {
            export type DsnpId = string;
        }
        export interface PathParameters {
            dsnpId: Parameters.DsnpId;
        }
        namespace Responses {
            export type $200 = string[];
            export type $401 = Components.Responses.UnauthorizedError;
        }
    }
}

export interface OperationMethods {
  /**
   * authChallenge - Return a challenge for login
   */
  'authChallenge'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthChallenge.Responses.$200>
  /**
   * authProvider - Return the delegation and provider information
   */
  'authProvider'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthProvider.Responses.$200>
  /**
   * authLogin - Use a challenge to login
   */
  'authLogin'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AuthLogin.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthLogin.Responses.$200>
  /**
   * authLogout - Logout and invalidate the access token
   */
  'authLogout'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthLogout.Responses.$201>
  /**
   * authCreate - Creates a new DSNP Identity
   */
  'authCreate'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AuthCreate.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthCreate.Responses.$200>
  /**
   * authAccount - For polling to get the created account as authCreate can take time
   */
  'authAccount'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthAccount.Responses.$200 | Paths.AuthAccount.Responses.$202>
  /**
   * authHandles - Get handles for public keys
   */
  'authHandles'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AuthHandles.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthHandles.Responses.$200>
  /**
   * authDelegate - Delegate to the provider with an existing DSNP Identity
   */
  'authDelegate'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AuthDelegate.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AuthDelegate.Responses.$200>
  /**
   * getUserFeed - Get recent posts from a user, paginated
   */
  'getUserFeed'(
    parameters?: Parameters<Paths.GetUserFeed.PathParameters & Paths.GetUserFeed.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUserFeed.Responses.$200>
  /**
   * getFeed - Get the Feed for the current user, paginated
   */
  'getFeed'(
    parameters?: Parameters<Paths.GetFeed.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFeed.Responses.$200>
  /**
   * getDiscover - Get the Discovery Feed for the current user, paginated
   */
  'getDiscover'(
    parameters?: Parameters<Paths.GetDiscover.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetDiscover.Responses.$200>
  /**
   * createBroadcast - Create a new post
   */
  'createBroadcast'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateBroadcast.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateBroadcast.Responses.$200>
  /**
   * getContent - Get details of a specific post
   */
  'getContent'(
    parameters?: Parameters<Paths.GetContent.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetContent.Responses.$200>
  /**
   * editContent - Edit the content of a specific post
   */
  'editContent'(
    parameters?: Parameters<Paths.EditContent.PathParameters> | null,
    data?: Paths.EditContent.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.EditContent.Responses.$200>
  /**
   * userFollowing - Get a list of users that a specific user follows
   */
  'userFollowing'(
    parameters?: Parameters<Paths.UserFollowing.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UserFollowing.Responses.$200>
  /**
   * graphFollow - Follow a user
   */
  'graphFollow'(
    parameters?: Parameters<Paths.GraphFollow.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GraphFollow.Responses.$201>
  /**
   * graphUnfollow - Unfollow a user
   */
  'graphUnfollow'(
    parameters?: Parameters<Paths.GraphUnfollow.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GraphUnfollow.Responses.$201>
  /**
   * getProfile - Get profile information for a specific user
   */
  'getProfile'(
    parameters?: Parameters<Paths.GetProfile.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetProfile.Responses.$200>
  /**
   * createProfile - Create/Edit the profile information for a current user
   */
  'createProfile'(
    parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
    data?: Paths.CreateProfile.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateProfile.Responses.$200>
}

export interface PathsDictionary {
  ['/v1/auth/challenge']: {
    /**
     * authChallenge - Return a challenge for login
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthChallenge.Responses.$200>
  }
  ['/v1/auth/provider']: {
    /**
     * authProvider - Return the delegation and provider information
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthProvider.Responses.$200>
  }
  ['/v1/auth/login']: {
    /**
     * authLogin - Use a challenge to login
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AuthLogin.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthLogin.Responses.$200>
  }
  ['/v1/auth/logout']: {
    /**
     * authLogout - Logout and invalidate the access token
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthLogout.Responses.$201>
  }
  ['/v1/auth/create']: {
    /**
     * authCreate - Creates a new DSNP Identity
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AuthCreate.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthCreate.Responses.$200>
  }
  ['/v1/auth/account']: {
    /**
     * authAccount - For polling to get the created account as authCreate can take time
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthAccount.Responses.$200 | Paths.AuthAccount.Responses.$202>
  }
  ['/v1/auth/handles']: {
    /**
     * authHandles - Get handles for public keys
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AuthHandles.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthHandles.Responses.$200>
  }
  ['/v1/auth/delegate']: {
    /**
     * authDelegate - Delegate to the provider with an existing DSNP Identity
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AuthDelegate.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AuthDelegate.Responses.$200>
  }
  ['/v1/content/{dsnpId}']: {
    /**
     * getUserFeed - Get recent posts from a user, paginated
     */
    'get'(
      parameters?: Parameters<Paths.GetUserFeed.PathParameters & Paths.GetUserFeed.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUserFeed.Responses.$200>
  }
  ['/v1/content/feed']: {
    /**
     * getFeed - Get the Feed for the current user, paginated
     */
    'get'(
      parameters?: Parameters<Paths.GetFeed.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFeed.Responses.$200>
  }
  ['/v1/content/discover']: {
    /**
     * getDiscover - Get the Discovery Feed for the current user, paginated
     */
    'get'(
      parameters?: Parameters<Paths.GetDiscover.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetDiscover.Responses.$200>
  }
  ['/v1/content/create']: {
    /**
     * createBroadcast - Create a new post
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateBroadcast.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateBroadcast.Responses.$200>
  }
  ['/v1/content/{dsnpId}/{contentHash}']: {
    /**
     * getContent - Get details of a specific post
     */
    'get'(
      parameters?: Parameters<Paths.GetContent.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetContent.Responses.$200>
  }
  ['/v1/content/{type}/{contentHash}']: {
    /**
     * editContent - Edit the content of a specific post
     */
    'put'(
      parameters?: Parameters<Paths.EditContent.PathParameters> | null,
      data?: Paths.EditContent.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.EditContent.Responses.$200>
  }
  ['/v1/graph/{dsnpId}/following']: {
    /**
     * userFollowing - Get a list of users that a specific user follows
     */
    'get'(
      parameters?: Parameters<Paths.UserFollowing.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UserFollowing.Responses.$200>
  }
  ['/v1/graph/{dsnpId}/follow']: {
    /**
     * graphFollow - Follow a user
     */
    'post'(
      parameters?: Parameters<Paths.GraphFollow.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GraphFollow.Responses.$201>
  }
  ['/v1/graph/{dsnpId}/unfollow']: {
    /**
     * graphUnfollow - Unfollow a user
     */
    'post'(
      parameters?: Parameters<Paths.GraphUnfollow.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GraphUnfollow.Responses.$201>
  }
  ['/v1/profiles/{dsnpId}']: {
    /**
     * getProfile - Get profile information for a specific user
     */
    'get'(
      parameters?: Parameters<Paths.GetProfile.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetProfile.Responses.$200>
    /**
     * createProfile - Create/Edit the profile information for a current user
     */
    'put'(
      parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
      data?: Paths.CreateProfile.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateProfile.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
