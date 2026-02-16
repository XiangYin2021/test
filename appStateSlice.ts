import { createSlice } from "@reduxjs/toolkit";
import type { AppStateData } from "../../types";
import { RootState } from "../../store";

const loadFromLocalStorage = () => {
  try {
    const serializedState = localStorage.getItem("appSettings");
    if (serializedState === null) return undefined;
    return JSON.parse(serializedState);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

const persistedSettings = loadFromLocalStorage();

const baseState: AppStateData = {
  apiKey: "",
  apiBaseUrl: "https://arg-llm-api-fef081a5b9e9.herokuapp.com",
  semantics: "dfquad",
  afDepth: 1,
  afBreadth: 1,
  messages: [
    {
      sender: "ai",
      text: "Hello, welcome to ArgLLM-App! Please enter a statement or decision that I can verify for you.",
    },
  ],
  chatInput: "",
  finalAF: null,
};

const initialState: AppStateData = {
  ...baseState,
  ...persistedSettings,
};

export const appStateSlice = createSlice({
  name: "applicationState",
  initialState,
  reducers: {
    setApiKey: (state, action) => {
      state.apiKey = action.payload;
    },
    setApiBaseUrl: (state, action) => {
      state.apiBaseUrl = action.payload;
    },
    setSemantics: (state, action) => {
      state.semantics = action.payload;
    },
    setAfDepth: (state, action) => {
      state.afDepth = action.payload;
    },
    setAfBreadth: (state, action) => {
      state.afBreadth = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setChatInput: (state, action) => {
      state.chatInput = action.payload;
    },
    startNewChat: (state) => {
      state.messages = initialState.messages;
      state.chatInput = "";
    },
    finalAFReceived: (state, action) => {
        state.finalAF = action.payload;
    },
    resetSettings: (state) => {
      state.apiKey = baseState.apiKey;
      state.apiBaseUrl = baseState.apiBaseUrl;
      state.semantics = baseState.semantics;
      state.afDepth = baseState.afDepth;
      state.afBreadth = baseState.afBreadth;
    },
  },
});

export const {
  setApiKey,
  setApiBaseUrl,
  setSemantics,
  setAfDepth,
  setAfBreadth,
  setMessages,
  addMessage,
  setChatInput,
  startNewChat,
  finalAFReceived,
  resetSettings,
} = appStateSlice.actions;

export const selectApiKey = (state: RootState) => state.applicationState.apiKey;
export const selectApiBaseUrl = (state: RootState) =>
  state.applicationState.apiBaseUrl;
export const selectSemantics = (state: RootState) =>
  state.applicationState.semantics;
export const selectAfDepth = (state: RootState) =>
  state.applicationState.afDepth;
export const selectAfBreadth = (state: RootState) =>
  state.applicationState.afBreadth;
export const selectMessages = (state: RootState) =>
  state.applicationState.messages;
export const selectChatInput = (state: RootState) =>
  state.applicationState.chatInput;
export const selectFinalAF = (state: RootState) =>
  state.applicationState.finalAF;
export default appStateSlice.reducer;
