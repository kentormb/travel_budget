/// <reference types="vite/client" />

interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
    client: {
      init: (config: {
        apiKey: string;
        clientId?: string;
        discoveryDocs: string[];
        scope?: string;
      }) => Promise<any>;
      setToken: (token: { access_token: string }) => void;
      drive: {
        files: {
          list: (params: any) => Promise<any>;
          get: (params: any) => Promise<any>;
        }
      }
    };
  };
  
  google: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        prompt: (callback?: (notification: any) => void) => void;
        renderButton: (element: HTMLElement, options: any) => void;
        disableAutoSelect: () => void;
      };
      oauth2: {
        initTokenClient: (config: any) => {
          requestAccessToken: (options?: { prompt?: string }) => void;
        };
      };
    };
  };
}
