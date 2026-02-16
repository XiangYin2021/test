export interface ArgumentationFramework {
  arguments: Record<string, ArgumentData>;
  attacks: string[][];
  supports: string[][];
}

export interface ArgumentData {
  name: string;
  initial_weight: number;
  argument: string;
  strength: number;
  provenance: string;
}

export interface AttachedFile {
  file_name: string;
  parsed_content: string;
}

export interface ArgumentMiningResult {
  token: string;
  status: string;
  af: ArgumentationFramework;
  prediction: number;
  message: string;
}

export interface ArgumentationFrameworkContext {
  framework: ArgumentationFramework;
  setContextFramework: (framework: ArgumentationFramework) => void;
}

export interface Message {
  sender: string;
  text: string;
}

export interface AppStateData {
  apiKey: string;
  apiBaseUrl: string;
  semantics: string;
  afDepth: number;
  afBreadth: number;
  messages: Message[];
  chatInput: string;
  finalAF: ArgumentationFramework | null;
}

export interface ApplicationContextContainer {
  context: AppStateData;
  setContext: React.Dispatch<React.SetStateAction<AppStateData>>;
}

export interface MessageResult {
  status: string;
  messages: Message[];
  af: ArgumentationFramework;
  prediction: number;
  message: string | null;
}
