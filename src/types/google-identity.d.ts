interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleIdButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?:
    | "signin_with"
    | "signup_with"
    | "continue_with"
    | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleIdInitializeConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
}

interface GoogleAccountsIdApi {
  initialize: (config: GoogleIdInitializeConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    options: GoogleIdButtonConfiguration,
  ) => void;
  prompt: () => void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsIdApi;
    };
  };
}

