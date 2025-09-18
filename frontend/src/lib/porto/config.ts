import { Mode } from "porto";
import { http } from "viem";
import { riseTestnet } from "viem/chains";

// Porto configuration for RISE testnet
export const portoConfig = {
  chains: [riseTestnet],
  mode: Mode.dialog({
    host: "https://rise-wallet-testnet.vercel.app/dialog",
  }),
  relay: http("https://rise-testnet-relay.fly.dev"),
  feeToken: "ETH",
  transports: {
    [riseTestnet.id]: http("https://testnet.riselabs.xyz/"),
  },
} as const;

// Porto dialog themes
export const portoThemes = {
  light: { colorScheme: 'light' },
  dark: { colorScheme: 'dark' },
  default: { colorScheme: 'light dark' },
} as const;

export type PortoThemeType = keyof typeof portoThemes;