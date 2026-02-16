import "./Chat.css";
import { io, Socket } from "socket.io-client";
import React, { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setChatInput,
  setMessages,
  addMessage,
  selectApiBaseUrl,
  selectChatInput,
  selectMessages,
  selectApiKey,
  selectSemantics,
  selectAfDepth,
    finalAFReceived,
} from "../../features/app/appStateSlice";
import {
  IoDocumentAttachOutline,
  IoCloseCircleSharp
} from "react-icons/io5";

import {
  ArgumentationFramework,
  ArgumentMiningResult, AttachedFile,
  Message,
  MessageResult,
} from "../../types";
import useArgumentationFramework from "../Graph/hooks/useArgumentationFramework";

function attachFile(apiBaseUrl: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const attachResult: Promise<AttachedFile> = fetch(apiBaseUrl + "/arguments/attach", {
    method: "POST",
    body: formData as BodyInit,
  }).then((response) => response.json());

  return attachResult;
}


function mineArguments(
  apiBaseUrl: string,
  claim: string,
  apiKey: string,
  semantics = "dfquad",
  afDepth = 1,
  attachedFiles: string[]
) {
  const miningResult: Promise<ArgumentMiningResult> = fetch(
    apiBaseUrl + "/arguments/mine",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: claim,
        api_key: apiKey,
        semantics: semantics,
        depth: afDepth,
        files: attachedFiles
      }),
    }
  ).then((response) => response.json());
  return miningResult;
}

// FIXME: Duplicated from useArgumentationFramework and with multiple
//        duplicate implementations, should handle in better way.
function processMiningResult(result: ArgumentMiningResult) {
  return {
    ...result,
    prediction: Math.round(result.prediction * 100),
    af: {
      ...result.af,
      arguments: objMap(result.af.arguments, (v) => {
        return {
          ...v,
          initial_weight: Math.round(v.initial_weight * 100),
          strength: Math.round(v.strength * 100),
        };
      }),
    },
  };
}

function processMessageResult(result: MessageResult) {
  return {
    ...result,
    prediction: Math.round(result.prediction * 100),
    af: {
      ...result.af,
      arguments: objMap(result.af.arguments, (v) => {
        return {
          ...v,
          initial_weight: Math.round(v.initial_weight * 100),
          strength: Math.round(v.strength * 100),
        };
      }),
    },
  };
}

function processFrameworkForServer(framework: ArgumentationFramework) {
  return {
    ...framework,
    arguments: objMap(framework.arguments, (v) => {
      return {
        ...v,
        initial_weight: v.initial_weight / 100,
        strength: v.strength / 100,
      };
    }),
  };
}

function processMessage(
  apiBaseUrl: string,
  messages: Message[],
  framework: ArgumentationFramework,
  apiKey: string,
  semantics = "dfquad"
) {
  const messageResult: Promise<MessageResult> = fetch(
    apiBaseUrl + "/arguments/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        af: processFrameworkForServer(framework),
        api_key: apiKey,
        semantics: semantics,
      }),
    }
  ).then((response) => response.json());
  return messageResult;
}

function objMap(obj, func) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, func(v)]));
}

export default function Chat() {
  const { updateFramework, getFramework } = useArgumentationFramework();
  const [socket, setSocket] = useState<Socket | null>(null);
  const dispatch = useDispatch();
  const apiBaseUrl = useSelector(selectApiBaseUrl);
  const chatInput = useSelector(selectChatInput);
  const messages = useSelector(selectMessages);
  const apiKey = useSelector(selectApiKey);
  const semantics = useSelector(selectSemantics);
  const afDepth = useSelector(selectAfDepth);
  const [attachedFiles, setAttachedFiles] = useState<Record<string, string>>({});

  const constructSocket = useCallback(
    (token: string) => {
      console.log("Updating socket");
      const newSocket = io(apiBaseUrl + "/ws/arguments/mine", {
        auth: { token },
      });
      console.log(newSocket);
      setSocket(newSocket);
    },
    [apiBaseUrl, setSocket]
  );

  const reportResult = useCallback(
    (result: ArgumentMiningResult) => {
      if (result) {
        const status = result.status;
        if (status === "in_progress") {
          updateFramework(result.af);
        } else if (status === "completed") {
          updateFramework(result.af);


            dispatch(finalAFReceived(result.af));
          const aiResponse = {
            sender: "ai",
            text: `I have finished reasoning about your input. Overall, my confidence in the provided input is ${result.prediction}%. See the arguments on the right for details. Feel free to let me know if you have any thoughts on the arguments, and I will update my prediction accordingly.`,
          };
          dispatch(addMessage(aiResponse));
        } else if (status === "failed") {
          const aiResponse = {
            sender: "ai",
            text: "Sorry, something went wrong. Please reload and try again.",
          };
          dispatch(addMessage(aiResponse));
        }
      }
    },
    [updateFramework, dispatch]
  );

  useEffect(() => {
    function onConnect() {
      console.log("Connected to socket");
    }

    function onDisconnect() {
      console.log("Disconnected from socket");
    }

    function onMiningStatus(miningResult: ArgumentMiningResult) {
      if (miningResult.status === "failed") {
        console.error("Mining failed!");
      } else {
        miningResult = processMiningResult(miningResult);
      }

      console.log("Received mining status from socket:");
      console.log(miningResult);
      reportResult(miningResult);
    }

    if (socket) {
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("mining_status", onMiningStatus);

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("mining_status", onMiningStatus);
      };
    }
  }, [socket, reportResult]);

  const handleSend = () => {
    if (chatInput.trim() === "") return;

    const newMessage = { sender: "user", text: chatInput };
    dispatch(setChatInput(""));
    dispatch(addMessage(newMessage));

    if (messages.length == 1) {
      // New topic, mine arguments
      mineArguments(apiBaseUrl, chatInput, apiKey, semantics, afDepth, Object.values(attachedFiles)).then(
        (result) => {
          console.log("Received result from mining:");
          console.log(result);
          const status = result.status;
          if (status === "started") {
            constructSocket(result.token);
            const aiResponse = {
              sender: "ai",
              text: "Ok, please hold on while I reason about your input...",
            };
            dispatch(addMessage(aiResponse));
          } else {
            const aiResponse = {
              sender: "ai",
              text: "Something unexpected happened, please reload and try again.",
            };
            dispatch(addMessage(aiResponse));
          }
        }
      );
    } else {
      const updatedMessages = [...messages, newMessage];
      processMessage(apiBaseUrl, updatedMessages, getFramework(), apiKey).then(
        (result) => {
          console.log("Received result from message:");
          console.log(result);
          console.log("Current framework:");
          console.log(getFramework());
          result = processMessageResult(result);
          updateFramework(result.af);
          dispatch(setMessages(result.messages));
        }
      );
    }
  };
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSend();
    }
  };
    const onAttachClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
                attachFile(apiBaseUrl, file).then((fileText) => {
          const parsedText = fileText.parsed_content;
          console.log("Attached file parsed content:", parsedText);
          setAttachedFiles(prev => ({
            ...prev,
            [file.name]: parsedText
          }));
        });
      }
    };
    input.click();
  }

    const onRemoveAttachClick = (fileKey: string) => {
        setAttachedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[fileKey];
        return newFiles;
        });
    }
  return (
    <div className="chat-container">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
        {Object.keys(attachedFiles).length > 0 && (
          <ul>
            {Object.entries(attachedFiles).map(([key]) => (
                <li key={key}>
                  {key}
                  <button onClick={() => onRemoveAttachClick(key)}>
                    <IoCloseCircleSharp size={16} />
                  </button>
                </li>
            ))}
          </ul>
      )}
      <div className="chat-input">
          <button aria-label={"attach"} onClick={() => onAttachClick()}>
          <IoDocumentAttachOutline size={24} />
        </button>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => dispatch(setChatInput(e.target.value))}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
