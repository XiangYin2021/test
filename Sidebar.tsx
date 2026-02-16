import {
  Box,
  Flex,
  Icon,
  useColorModeValue,
  Text,
  BoxProps,
  FlexProps,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Input,
  ModalOverlay,
  ModalCloseButton,
  Button,
  useDisclosure,
  Switch,
  Card,
  CardBody,
  Heading,
  Stack,
  StackDivider,
  Select,
  NumberInput,
  NumberInputField,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInputStepper,
  VStack,

} from "@chakra-ui/react";


import { selectFinalAF } from "../../features/app/appStateSlice";
import { FiFile, FiEdit, FiSettings } from "react-icons/fi";
import { BiExport, BiImport } from "react-icons/bi";
import { motion } from "framer-motion";

import {ArgumentationFramework, ArgumentData} from "../../types";

import Tree from "../Graph/Tree";
import Chat from "../Chat/Chat";
import { IconType } from "react-icons";
import { useCallback, useState, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { selectFramework } from "../../features/argumentation/argumentationSlice";
import {
  addMessage,
  selectAfDepth,
  selectApiBaseUrl,
  selectApiKey,
  selectSemantics,
  setAfDepth,
  setApiBaseUrl,
  setApiKey,
  setSemantics,
  startNewChat,
  setChatInput,
} from "../../features/app/appStateSlice";
import useArgumentationFramework from "../Graph/hooks/useArgumentationFramework";
import APIService from "../APIService";

interface LinkItemProps {
  name: string;
  icon: IconType;
}
const LinkItems: Array<LinkItemProps> = [
  { name: "New Chat", icon: FiEdit },
  { name: "Examples", icon: FiFile },
  { name: "Settings", icon: FiSettings },
  { name: "Export", icon: BiExport },
  { name: "Import", icon: BiImport },
  { name: "Claims", icon: FiEdit },
];

export default function App() {
  const [size, setSize] = useState(35.0);
  const [resize, setResize] = useState(false);

  const handleMouseDown = () => {
    window.addEventListener("mouseup", handleMouseUp, true);
  };

  const handleMouseUp = () => {
    window.removeEventListener("mouseup", handleMouseUp, true);
    setResize(false);
  };

  const resizer = (e: React.MouseEvent<Element, MouseEvent>) => {
    const selectedSize = size + (100 * e.movementX) / (window.innerWidth - 170);
    const minSize = (100 * 320) / (window.innerWidth - 170);
    const newSize = Math.min(100, Math.max(minSize, selectedSize));
    if (resize) {
      setSize(newSize);
    }
  };

  return (
    <Box
      display={"flex"}
      flexDirection={"row"}
      minH="100vh"
      bg={useColorModeValue("gray.100", "gray.900")}
      onMouseMove={resizer}
    >
      <div style={{ flex: "0 1 170px" }}>
        <SidebarContent display={{ base: "none", md: "block" }} />
      </div>
      <div style={{ flex: size.toString() + " 1 0px" }}>
        {/* <div style={{ flex: '1 1 35%'}}> */}
        <Chat />
      </div>
      <div
        style={{
          height: "100vh",
          cursor: "ew-resize",
          backgroundColor: "#a8a8a8",
          width: "7px",
        }}
        onMouseDown={() => {
          handleMouseDown();
          setResize(true);
        }}
        onMouseUp={() => {
          setResize(false);
        }}
      >
        <button
          style={{
            userSelect: "none",
            width: "7px",
            height: "50px",
            backgroundColor: "#626161",
            color: "#fff",
            fontSize: "x-small",
            position: "relative",
            top: "45%",
          }}
          onMouseUp={() => {
            if (size === 100) {
              setSize((100 * 320) / (window.innerWidth - 170));
            } else {
              setSize(100.0);
            }
          }}
        >
          {size === 100 && `<`}
          {size !== 100 && `>`}
        </button>
      </div>
      <div
        style={{ flex: (100 - size).toString() + " 1 0px", height: "100vh" }}
      >
        <Tree />
      </div>
    </Box>
  );
}


const SidebarContent = ({ ...rest }: BoxProps) => {




const finalAF = useSelector(selectFinalAF);
const currentAF = useSelector(selectFramework);



  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: examplesIsOpen,
    onOpen: examplesOnOpen,
    onClose: examplesOnClose,
  } = useDisclosure();
  const {
    isOpen: hypothesisIsOpen,
    onOpen: openHypothesisModal,
    onClose: closeHypothesisModal,
  } = useDisclosure();

  const [hypothesisQuestion, setHypothesisQuestion] = useState("");
  const [claims, setClaims] = useState<string[]>([]);
  const [hypothesisLoading, setHypothesisLoading] = useState(false);

  const [claimResults, setClaimResults] = useState<
    Record<
      number,
      {
        status: "idle" | "running" | "done";
        strength?: number;
        af?: ArgumentationFramework;
      }
    >
  >({});
  const [activeClaimIndex, setActiveClaimIndex] = useState<number | null>(null);
  const [currentClaimIndex, setCurrentClaimIndex] = useState<number | null>(null);


const sortedClaims = claims
  .map((claim, index) => ({
    claim,
    index,
    strength: claimResults[index]?.strength,
  }))
  .sort((a, b) => {
    // ✅ 都没 strength → 保持原顺序
    if (a.strength === undefined && b.strength === undefined) {
      return a.index - b.index;
    }

    // ✅ 一个有一个没有 → 有的在前
    if (a.strength === undefined) return 1;
    if (b.strength === undefined) return -1;

    // ✅ 都有 → strength 降序
    return b.strength - a.strength;
  });



  const dispatch = useDispatch();
  const apiKey = useSelector(selectApiKey);
  const apiBaseUrl = useSelector(selectApiBaseUrl);
  const semantics = useSelector(selectSemantics);
  const afDepth = useSelector(selectAfDepth);
  const { updateFramework, getFramework, resetFramework, evalFramework } =
    useArgumentationFramework();

  const onLinkClick = useCallback(
    (name: string) => {
      if (name === "Settings") {
        onOpen();
      } else if (name === "New Chat") {
        dispatch(startNewChat());
        resetFramework();
      } else if (name == "Examples") {
        examplesOnOpen();
      } else if (name == "Export") {
        const framework = getFramework();
        console.log(framework);
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
          JSON.stringify(framework)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "data.json";

        link.click();
      } else if (name == "Import") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              const data = JSON.parse(text);
              updateFramework(data);
              evalFramework(data);
            };
            reader.readAsText(file);
          }
        };
        input.click();
      } else if (name === "Claims") openHypothesisModal();
    },
    [
      dispatch,
      getFramework,
      resetFramework,
      updateFramework,
      evalFramework,
      onOpen,
      examplesOnOpen,
    ]
  );


  useEffect(() => {
  if (activeClaimIndex === null) return;
  if (!finalAF || !finalAF.arguments) return;

    const topic = Object.values(finalAF.arguments).find(
      (arg: ArgumentData) => arg.provenance === "topic"
    );

  if (!topic) return;

  setClaimResults((prev) => ({
    ...prev,
    [activeClaimIndex]: {
      status: "done",
      strength: topic.strength,   // ✅ 一定是 final strength
      af: finalAF,                // ✅ 一定是 final AF
    },
  }));

  setActiveClaimIndex(null);
}, [finalAF]);

useEffect(() => {
  if (currentClaimIndex === null) return;

  const r = claimResults[currentClaimIndex];
  if (!r || r.status !== "done") return;

  // 从 currentAF 里取 topic strength（用 provenance 更稳）
  const topic = currentAF?.arguments
    ? Object.values(currentAF.arguments).find((a: any) => a.provenance === "topic")
    : null;

  const latestStrength =
    topic && typeof (topic as any).strength === "number"
      ? (topic as any).strength
      : r.strength; // fallback

  const t = window.setTimeout(() => {
    setClaimResults((prev) => ({
      ...prev,
      [currentClaimIndex]: {
        ...prev[currentClaimIndex],
        af: currentAF,
        strength: latestStrength, // ✅ 同步更新显示用的 strength
      },
    }));
  }, 200);

  return () => window.clearTimeout(t);
}, [currentAF, currentClaimIndex, claimResults]);



  const loadExample = useCallback(
    (name: string) => {
      console.log("Loading", name);
      if (name === "optune") {
        const af = {
          arguments: {
            db0: {
              name: "db0",
              argument: "I should choose Optune as a treatment.",
              initial_weight: 75,
              strength: 50,
              provenance: "topic",
            },
            s1: {
              name: "s1",
              argument:
                "Optune has reasonable evidence supporting its use for glioblastoma (GBM), showing a survival advantage when used in addition to the standard Stupp protocol of surgery, radiotherapy, and chemotherapy.",
              initial_weight: 95,
              strength: 50,
              provenance: "agent",
            },
            s2: {
              name: "s2",
              argument:
                "Data from a randomised phase three trial (EF-14) indicated that patients using Optune in conjunction with standard treatment lived longer compared to those who received only standard treatment.",
              initial_weight: 90,
              strength: 50,
              provenance: "agent",
            },
            s3: {
              name: "s3",
              argument:
                "Optune provides a different mode of action compared to chemotherapy, potentially allowing for combined use with chemotherapy to provide added benefits and varied side-effect profiles.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            s3s1: {
              name: "s3s1",
              argument:
                "Optune acts by passing an alternating electric field through a tumor, which interferes with cell division, particularly in rapidly dividing cells, differing fundamentally from the mechanisms of chemotherapy.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            a1: {
              name: "a1",
              argument:
                "Optune is highly inconvenient to use, requiring the device to be worn for over 18 hours a day, head shaving, regular electrode changes, and carrying the device around almost constantly",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            a1s1: {
              name: "a1s1",
              argument:
                "Patients must keep their heads shaved for the device to function properly, adding an additional personal care requirement.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            a1s2: {
              name: "a1s2",
              argument:
                "Electrodes need to be changed every three days, which entails a recurring task that can be seen as cumbersome.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            a2: {
              name: "a2",
              argument:
                "The cost of Optune is prohibitive, especially for self-pay patients, with an estimated cost of £17,000 per month, making it a financially burdensome option for long-term use.",
              initial_weight: 90,
              strength: 50,
              provenance: "agent",
            },
          },
          attacks: [
            ["a1", "db0"],
            ["a2", "db0"],
          ],
          supports: [
            ["s1", "db0"],
            ["s2", "db0"],
            ["s3", "db0"],
            ["s3s1", "s3"],
            ["a1s1", "a1"],
            ["a1s2", "a1"],
          ],
        };
        dispatch(
          addMessage({
            sender: "user",
            text: af.arguments.db0.argument,
          })
        );
        updateFramework(af);
        evalFramework(af);
      } else if (name === "genomic") {
        const af = {
          arguments: {
            db0: {
              name: "db0",
              argument: "I should opt for Extended Genomic Testing.",
              initial_weight: 60,
              strength: 50,
              provenance: "topic",
            },
            s1: {
              name: "s1",
              argument:
                "Extended Genomic Testing can help identify abnormalities in the tumour that are not detected by conventional approaches, potentially leading to targeted treatments.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            s2: {
              name: "s2",
              argument:
                "Some data support the use of Extended Genomic Testing in specific brain tumours, particularly for identifying nTRK and FGFR fusions, and BRAF mutations, which have available drug treatments targeting these mutations.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
            a1: {
              name: "a1",
              argument:
                "Outside of commonly used tests like IDH-1, IDH-2, and MGMT testing, there is limited proof that Next-Gen Sequencing (NGS) significantly adds to treatment in brain tumours.",
              initial_weight: 75,
              strength: 50,
              provenance: "agent",
            },
            a2: {
              name: "a2",
              argument:
                "The value of genomic testing in brain tumours remains unclear and is currently considered best as a 'fishing expedition' with uncertain actionable outcomes.",
              initial_weight: 85,
              strength: 50,
              provenance: "agent",
            },
          },
          attacks: [
            ["a1", "db0"],
            ["a2", "db0"],
          ],
          supports: [
            ["s1", "db0"],
            ["s2", "db0"],
          ],
        };
        dispatch(
          addMessage({
            sender: "user",
            text: af.arguments.db0.argument,
          })
        );
        updateFramework(af);
        evalFramework(af);
      }
      dispatch(
        addMessage({
          sender: "ai",
          text: "I have loaded the example reasoning trace for the statement you provided. See the arguments on the right for details. Feel free to let me know if you have any thoughts on the arguments, and I will update my prediction accordingly.",
        })
      );
    },
    [updateFramework, evalFramework, dispatch]
  );

  const handleAskHypotheses = useCallback(async () => {
    if (!hypothesisQuestion.trim()) return;
    setHypothesisLoading(true);
    try {
      const res = await APIService.AskHypotheses(hypothesisQuestion);
      console.log("Claims only:", res.claims);
      setClaims(res.claims || []);
      setClaimResults({});
      setActiveClaimIndex(null);

    } catch (e) {
      console.error(e);
      setClaims(["Calling API Failed"]);
    } finally {
      setHypothesisLoading(false);
    }
  }, [hypothesisQuestion]);

const handleClaimClick = (claim: string, index: number) => {
    closeHypothesisModal(); // ✅ 先关弹窗，防止遮罩挡住页面
    setCurrentClaimIndex(index);
  const result = claimResults[index];
  if (result) {
    if (result.status === "done") {
        setCurrentClaimIndex(index);
      updateFramework(result.af as ArgumentationFramework);
    }
    return;
  }

  // ✅ 第一次点：标记 active
  setActiveClaimIndex(index);
  setClaimResults((prev) => ({
    ...prev,
    [index]: { status: "running" },
  }));

  // ✅ 复用原来的 Chat 发送逻辑
  dispatch(startNewChat());
  dispatch(setChatInput(claim));

setTimeout(() => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".chat-input button");
  buttons[buttons.length - 1]?.click();
}, 0);

};



  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text as="b">API Key:</Text>
            <Input
              placeholder="Please enter API key"
              value={apiKey}
              onChange={(e) => dispatch(setApiKey(e.target.value))}
              marginTop="10px"
              marginBottom="10px"
            />
            <Text as="b">Use development server:</Text>
            <br />
            <Switch
              size="lg"
              colorScheme="cyan"
              marginTop="5px"
              marginBottom="10px"
              isChecked={apiBaseUrl === "http://127.0.0.1:5000"}
              onChange={(e) =>
                dispatch(
                  setApiBaseUrl(
                    e.target.checked
                      ? "http://127.0.0.1:5000"
                      : "https://arg-llm-api-rag-acebe09e8eeb.herokuapp.com"
                  )
                )
              }
            />
            <br />
            <Text as="b">Argumentation semantics:</Text>
            <br />
            <Select
              value={semantics}
              onChange={(e) => dispatch(setSemantics(e.target.value))}
              marginTop="10px"
              marginBottom="10px"
            >
              <option value="qe">Quadratic Energy</option>
              <option value="dfquad">DF-QuAD</option>
              <option value="eb">Euler-based</option>
            </Select>
            <Text as="b">AF depth:</Text>
            <br />
            <NumberInput
              value={afDepth}
              min={1}
              max={2}
              marginTop="10px"
              onChange={(v) => dispatch(setAfDepth(Math.round(Number(v))))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="cyan" color="white" onClick={onClose}>
              Close and save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={examplesIsOpen} onClose={examplesOnClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Examples</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Card>
              <CardBody>
                <Stack divider={<StackDivider />} spacing="4">
                  <Box onClick={() => loadExample("optune")} cursor="pointer">
                    <Heading size="xs" textTransform="uppercase">
                      Optune
                    </Heading>
                    <Text pt="2" fontSize="sm">
                      Should I choose Optune as a treatment?
                    </Text>
                  </Box>
                  <Box onClick={() => loadExample("genomic")} cursor="pointer">
                    <Heading size="xs" textTransform="uppercase">
                      Extended Genomic Testing
                    </Heading>
                    <Text pt="2" fontSize="sm">
                      Should I opt for Extended Genomic Testing?
                    </Text>
                  </Box>
                </Stack>
              </CardBody>
            </Card>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="cyan" color="white" onClick={examplesOnClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Claims Modal */}
      <Modal isOpen={hypothesisIsOpen} onClose={closeHypothesisModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Claim Generator</ModalHeader>
          <ModalCloseButton onClick={closeHypothesisModal} />
          <ModalBody>
            <Text mb={2}>Enter your question:</Text>

            <Input
              placeholder="e.g., are bilayer tablets more common than granule blends?"
              value={hypothesisQuestion}
              onChange={(e) => setHypothesisQuestion(e.target.value)}
              mb={4}
            />

            <Button
              colorScheme="cyan"
              color="white"
              onClick={handleAskHypotheses}
              isLoading={hypothesisLoading}
              mb={4}
            >
              Ask LLM
            </Button>

            <Text as="b" display="block" mb={2}>
              Generated Claims:
            </Text>

            <VStack align="stretch" spacing={3}>
              {claims.length === 0 && (
                <Text fontSize="sm" color="gray.500">
                  No claims generated yet.
                </Text>
              )}

              {sortedClaims.map(({ claim, index }) => (
              <motion.div
                      key={claim}          // ✅ 用 claim 做 key，比 index 稳定
                      layout               // ✅ 自动位置动画
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
              >
                <Box
                  key={index}
                  p={3}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                  cursor="pointer"                // ✅ 鼠标变成可点击手型
                  transition="all 0.2s ease"      // ✅ 过渡动画
                  _hover={{                       // ✅ 悬浮高亮效果
                    bg: "cyan.50",
                    borderColor: "cyan.400",
                    boxShadow: "md",
                  }}
                  onClick={() => handleClaimClick(claim, index)}
                >

                  <Text fontWeight="bold" display="flex" alignItems="center">
                      Claim {index + 1}

                      {claimResults[index]?.status === "running" && (
                        <Text ml={2} fontSize="sm" color="cyan.600">
                          (reasoning, please wait...)
                        </Text>
                      )}
                        {claimResults[index]?.status === "done" && (
                        <Text ml={2} fontSize="sm" color="green.600">
                          Final Confidence: {claimResults[index]?.strength}%
                        </Text>
                      )}
                    </Text>

                  <Text mt={1}>{claim}</Text>
                </Box>
                </motion.div>
              ))}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeHypothesisModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box
        bg={useColorModeValue("white", "gray.900")}
        borderRight="1px"
        borderRightColor={useColorModeValue("gray.200", "gray.700")}
        pos="fixed"
        h="full"
        {...rest}
      >
        <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
          <Text fontSize="lg" fontFamily="monospace" fontWeight="bold">
            ArgLLM-RAG
          </Text>
        </Flex>
        {LinkItems.map((link) => (
          <NavItem
            key={link.name}
            icon={link.icon}
            onClick={() => onLinkClick(link.name)}
          >
            {link.name}
          </NavItem>
        ))}
      </Box>
    </>
  );
};

interface NavItemProps extends FlexProps {
  icon: IconType;
  children: string | number;
}
const NavItem = ({ icon, children, ...rest }: NavItemProps) => {
  return (
    <Box
      as="a"
      href="#"
      style={{ textDecoration: "none" }}
      _focus={{ boxShadow: "none" }}
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: "cyan.400",
          color: "white",
        }}
        {...rest}
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: "white",
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Box>
  );
};