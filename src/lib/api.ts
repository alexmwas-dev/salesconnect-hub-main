const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");
const IS_NGROK_URL = /https?:\/\/[^/]*ngrok/i.test(API_BASE_URL);

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (IS_NGROK_URL) {
      (headers as Record<string, string>)["ngrok-skip-browser-warning"] =
        "true";
    }

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const isJsonResponse = contentType.toLowerCase().includes("application/json");

    if (!response.ok) {
      const error = isJsonResponse
        ? await response.json().catch(() => ({}))
        : {};
      const responseText = !isJsonResponse
        ? await response.text().catch(() => "")
        : "";
      const looksLikeHtml =
        responseText.trimStart().startsWith("<!DOCTYPE") ||
        responseText.trimStart().startsWith("<html");
      throw new Error(
        error.message ||
          (looksLikeHtml && IS_NGROK_URL
            ? "Received HTML from ngrok instead of JSON. Ensure the tunnel is pointing to your backend and ngrok browser warning is bypassed."
            : `Request failed with status ${response.status}`),
      );
    }

    if (!isJsonResponse) {
      const responseText = await response.text().catch(() => "");
      const looksLikeHtml =
        responseText.trimStart().startsWith("<!DOCTYPE") ||
        responseText.trimStart().startsWith("<html");

      if (looksLikeHtml && IS_NGROK_URL) {
        throw new Error(
          "Received HTML from ngrok instead of JSON. Ensure the tunnel is pointing to your backend and ngrok browser warning is bypassed.",
        );
      }

      throw new Error(
        `Expected JSON response but received '${contentType || "unknown"}'`,
      );
    }

    const json = await response.json();

    // Unwrap the response if it has a data property (backend returns {status, data})
    if (json && typeof json === "object" && "data" in json) {
      return json.data as T;
    }

    return json as T;
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string) =>
      this.request<{ user: any; organization: any; token: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      ),

    signup: (data: {
      organizationName: string;
      organizationSlug: string;
      name: string;
      email: string;
      password: string;
    }) =>
      this.request<{ user: any; organization: any; token: string }>(
        "/auth/signup",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),

    googleAuth: (credential: string, organizationName?: string) =>
      this.request<{ user: any; organization: any; token: string }>(
        "/auth/google",
        {
          method: "POST",
          body: JSON.stringify({
            credential,
            ...(organizationName ? { organizationName } : {}),
          }),
        },
      ),

    me: () => this.request<{ user: any; organization: any }>("/auth/me"),

    logout: () =>
      this.request<{ message: string }>("/auth/logout", {
        method: "POST",
      })
        .then(() => {
          this.setToken(null);
        })
        .catch(() => {
          // Still clear token on client even if server request fails
          this.setToken(null);
        }),

    updateProfile: (data: { name?: string; email?: string }) =>
      this.request<{ user: any }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    changePassword: (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) =>
      this.request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };

  // Organization endpoints
 
organization = {
  get: () => this.request<any>("/organization"),

  getStats: () => this.request<any>("/organization/stats"),

  getActivity: () => this.request<any[]>("/organization/activity"),

  update: (data: { name?: string }) =>
    this.request<any>("/organization", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /*
  =============================
  connect whatsapp
  =============================
  */

  connectWhatsAppBusiness: (data: {
    code: string;
    wabaId: string;
    phoneNumberId?: string;
  }) =>
    this.request<any>("/organization/connect-whatsapp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /*
  =============================
  get any whatsapp connection
  =============================
  */

  getWhatsAppConnection: () =>
    this.request<{
      organization: {
        businessId: string;
        whatsappBusinessAccountId: string;
        whatsappStatus: string;
      };
      numbers: {
        id: string;
        displayName: string;
        phoneNumber: string;
        isPrimary: boolean;
      }[];
    }>("/organization/whatsapp-connection"),
};

  // Billing endpoints
  billing = {
    getPlans: () => this.request<any>("/billing/plans"),

    getOverview: () => this.request<any>("/billing/overview"),

    listPromotions: () => this.request<any>("/billing/promotions"),

    createPromotion: (data: {
      code: string;
      description?: string;
      discountType?: "PERCENTAGE" | "FIXED";
      discountValue: number;
      active?: boolean;
      startsAt?: string;
      endsAt?: string;
      maxUses?: number;
    }) =>
      this.request<any>("/billing/promotions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    validatePromotion: (data: { planCode: string; promoCode: string }) =>
      this.request<any>("/billing/promotions/validate", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createCheckout: (data: {
      planCode: string;
      customerPhone?: string;
      customerEmail?: string;
      promoCode?: string;
    }) =>
      this.request<any>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listPayments: () => this.request<any>("/billing/payments"),

    getPayment: (paymentId: string) =>
      this.request<any>(`/billing/payments/${paymentId}`),

    verifyPayment: (paymentId: string) =>
      this.request<any>(`/billing/payments/${paymentId}/verify`, {
        method: "POST",
      }),

    cancelSubscription: () =>
      this.request<any>("/billing/subscription/cancel", {
        method: "POST",
      }),
  };

  // Team endpoints
  team = {
    list: () => this.request<any[]>("/organization/team"),

    invite: (data: {
      email: string;
      role: string;
      name: string;
      phone?: string;
    }) =>
      this.request<any>("/organization/team/invite", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateRole: (memberId: string, role: string) =>
      this.request<any>(`/organization/team/${memberId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      }),

    remove: (memberId: string) =>
      this.request<void>(`/organization/team/${memberId}`, {
        method: "DELETE",
      }),
  };

  // WhatsApp Numbers endpoints
  whatsappNumbers = {
    list: () => this.request<any[]>("/organization/whatsapp-numbers"),

    getPrimary: () =>
      this.request<any>("/organization/whatsapp-numbers/primary"),

    create: (data: {
      phoneNumber: string;
      displayName: string;
      token?: string;
    }) =>
      this.request<any>("/organization/whatsapp-numbers", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { displayName?: string; token?: string }) =>
      this.request<any>(`/organization/whatsapp-numbers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    toggle: (id: string) =>
      this.request<any>(`/organization/whatsapp-numbers/${id}/toggle`, {
        method: "PUT",
      }),

    delete: (id: string) =>
      this.request<void>(`/organization/whatsapp-numbers/${id}`, {
        method: "DELETE",
      }),
  };

  // WhatsApp Templates endpoints
  templates = {
    list: () => this.request<any[]>("/organization/whatsapp-templates"),

    create: (data: {
      name: string;
      content: string;
      category: string;
      language: string;
      bodyParamKeys?: string[];
      exampleValues?: string[];
    }) =>
      this.request<any>("/organization/whatsapp-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: {
        name?: string;
        content?: string;
        category?: string;
        language?: string;
        bodyParamKeys?: string[];
        exampleValues?: string[];
      },
    ) =>
      this.request<any>(`/organization/whatsapp-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    toggle: (id: string) =>
      this.request<any>(`/organization/whatsapp-templates/${id}/toggle`, {
        method: "PUT",
      }),

    pollStatus: (id?: string) =>
      this.request<any>(
        id
          ? `/organization/whatsapp-templates/${id}/poll-status`
          : "/organization/whatsapp-templates/poll-status",
        {
          method: "POST",
        },
      ),

    delete: (id: string) =>
      this.request<void>(`/organization/whatsapp-templates/${id}`, {
        method: "DELETE",
      }),
  };

  // Campaign endpoints
  campaigns = {
    list: () => this.request<any[]>("/campaign"),
    get: (id: string) => this.request<any>(`/campaign/${id}`),

    // NOTE: /campaign/stats exists, but may be unreachable if server route order is wrong.
    getStats: () => this.request<any>("/campaign/stats"),

    create: (data: {
      name: string;
      description?: string;
      templateId?: string;
    }) =>
      this.request<any>("/campaign", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createContactAndAttach: (
      campaignId: string,
      data: {
        name: string;
        phone: string;
        email?: string;
        salesRepId?: string | null;
      },
    ) =>
      this.request<any>(`/campaign/${campaignId}/contacts/create`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    send: (data: {
      campaignId?: string;
      templateId?: string;
      limit?: number;
      delay?: number;
    }) =>
      this.request<any>("/campaign/send", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    pause: (campaignId: string) =>
      this.request<any>(`/campaign/${campaignId}/pause`, {
        method: "POST",
      }),
    resume: (campaignId: string) =>
      this.request<any>(`/campaign/${campaignId}/resume`, {
        method: "POST",
      }),
    cancel: (campaignId: string) =>
      this.request<any>(`/campaign/${campaignId}/cancel`, {
        method: "POST",
      }),
    resend: (campaignId: string, data?: { limit?: number; delay?: number }) =>
      this.request<any>(`/campaign/${campaignId}/resend`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    delete: (campaignId: string) =>
      this.request<any>(`/campaign/${campaignId}`, {
        method: "DELETE",
      }),
  };

  // Contact endpoints
  contacts = {
    // Assigned contacts for sales reps
    listAssigned: () => this.request<any>("/messages/contacts"),

    listOrganization: () => this.request<any>("/organization/contacts"),

    create: (data: {
      phoneNumber: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      salesRepId?: string;
    }) => {
      const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
      return this.request<any>("/organization/contacts", {
        method: "POST",
        body: JSON.stringify({
          name: name || "Unknown",
          phone: data.phoneNumber,
          email: data.email,
          salesRepId: data.salesRepId,
        }),
      });
    },

    update: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        email?: string;
        status?: string;
        consent?: boolean;
        salesRepId?: string | null;
      },
    ) =>
      this.request<any>(`/organization/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<void>(`/organization/contacts/${id}`, {
        method: "DELETE",
      }),
    // Bulk import contacts (accepts { contacts: [...], campaignId?: string })
    import: (payload: { contacts: any[]; campaignId?: string }) =>
      this.request<any>(`/organization/contacts`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };
}

export const api = new ApiClient();
