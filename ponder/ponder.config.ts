import { createConfig } from "@ponder/core";
import { http } from "viem";

// Import ABIs
import ChatAppAbi from "./abis/ChatApp.json";

export default createConfig({
  networks: {
    rise: {
      chainId: 11155931,
      transport: http(process.env.PONDER_RPC_URL_RISE || "https://testnet.riselabs.xyz"),
    },
  },
  contracts: {
    ChatApp: {
      abi: ChatAppAbi,
      address: "0xa7ca09d052d7e259ac5178fa0ec99b5a49dd44b5",
      network: "rise",
      startBlock: 14048650,
    },
  },
});
