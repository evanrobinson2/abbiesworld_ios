window.StudioLive = {
  client: null,
  config: null,

  async prepare() {
    const response = await fetch("/api/config");
    if (response.status === 404) return false;
    if (!response.ok) {
      this.missing = true;
      return "missing";
    }
    const config = await response.json();
    if (!config.clientId || !config.domain) {
      this.missing = true;
      return "missing";
    }
    this.config = config;
    const auth0 = window.auth0;
    if (!auth0 || !auth0.createAuth0Client) return false;
    this.client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: "memory",
      authorizationParams: {
        audience: config.audience,
        redirect_uri: window.location.origin,
      },
    });
    const params = new URLSearchParams(window.location.search);
    if ((params.has("code") || params.has("error")) && params.has("state")) {
      await this.client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return true;
  },

  async signedIn() {
    return this.client ? this.client.isAuthenticated() : false;
  },

  async signIn() {
    await this.client.loginWithRedirect({
      authorizationParams: {
        audience: this.config.audience,
        redirect_uri: window.location.origin,
        connection: "google-oauth2",
      },
    });
  },

  async token() {
    return this.client.getTokenSilently({
      authorizationParams: {
        audience: this.config.audience,
      },
    });
  },

  async loadWorld() {
    const response = await fetch("/api/world", {
      headers: { Authorization: `Bearer ${await this.token()}` },
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.message || body.error || "Could not load the world");
      error.status = response.status;
      throw error;
    }
    return body;
  },

  async saveWorld(document) {
    const response = await fetch("/api/world", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.error || "Save failed");
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  },
};
