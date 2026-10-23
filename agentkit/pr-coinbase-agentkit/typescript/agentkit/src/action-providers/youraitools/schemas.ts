import { z } from "zod";

export const ScreenAddressSchema = z.object({ address: z.string().min(10).describe("Crypto address to screen (EVM, BTC, Solana, ...)") }).strip().describe("Input for payguard_screen_address");
export const CheckTokenSchema = z.object({ token: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("ERC-20 token contract address on Base") }).strip().describe("Input for tokenverdict_check_token");
export const SmartMoneySchema = z.object({ symbol: z.string().min(1).max(20).describe("Coin symbol, e.g. BTC") }).strip().describe("Input for smartperps_smart_money");
export const FindPaidApiSchema = z.object({ need: z.string().min(2).max(200).describe("Capability the agent needs, e.g. 'web search'") }).strip().describe("Input for toolpick_find_paid_api");
export const ReadUrlSchema = z.object({ url: z.string().url().describe("Public https URL to read") }).strip().describe("Input for webread_read_url");
export const ScanTextSchema = z.object({ text: z.string().min(1).max(20000).describe("Untrusted text to scan") }).strip().describe("Input for injectscan_scan_text");
