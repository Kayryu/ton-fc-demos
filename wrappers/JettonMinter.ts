import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from 'ton-core';

/*
owner: Address.parse("EQD4gS-Nj2Gjr2FYtg-s3fXUvjzKbzHGZ5_1Xe_V0-GCp0p2"),
name: "MyJetton",
symbol: "JET1",
image: "https://www.linkpicture.com/q/download_183.png", // Image url
description: "My jetton",
*/
export type JettonMinterConfig = {
    owner: Address;
    name: string;
    symbol: string;
    image: string;
    description: string;
    context: Cell;
    walletCode: Cell;
};

export function JettonMinterConfigToCell(config: JettonMinterConfig): Cell {
    return beginCell()
    .storeCoins(0)
    .storeAddress(config.owner)
    .storeRef(config.context)
    .storeRef(config.walletCode)
    .endCell();
}

export function mintBody(
  owner: Address,
  jettonAmount: bigint,
  transferToJWallet: bigint,
  queryId?: number,
): Cell {
  return beginCell()
    .storeUint(Opcodes.Mint, 32)
    .storeUint(queryId?? 0, 64) // queryid
    .storeAddress(owner)
    .storeCoins(transferToJWallet)
    .storeRef(
      // internal transfer message
      beginCell()
        .storeUint(Opcodes.InternalTransfer, 32)
        .storeUint(queryId?? 0, 64)
        .storeCoins(jettonAmount)
        .storeAddress(null)
        .storeAddress(owner)
        .storeCoins(toNano(0.001))
        .storeBit(false) // forward_payload in this slice, not separate cell
        .endCell(),
    )
    .endCell();
}

export const Opcodes = {
    Mint: 0x15,
    InternalTransfer: 0x178d4519,
};

export class JettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    }

    static createFromConfig(config: JettonMinterConfig, code: Cell, workchain = 0) {
        const data = JettonMinterConfigToCell(config);
        const init = { code, data };
        return new JettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
      provider: ContractProvider,
      via: Sender,
      opts: {
          value: bigint;
          to: Address;
          amount: bigint;
          queryID?: number;
      }
  ) {
      await provider.internal(via, {
          value: opts.value,
          sendMode: SendMode.PAY_GAS_SEPARATELY,
          body: mintBody(opts.to, opts.amount, opts.value, opts.queryID),
      });
  }
    
    async getJettonData(provider: ContractProvider) {
        const result = await provider.get('get_jetton_data', []);
        let totalSupply = result.stack.readBigNumber();
        let mintable = result.stack.readBoolean();
        let adminAddress = result.stack.readAddress();
        let content = result.stack.readCell();
        let walletCode = result.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode
        };
    }

    async getWalletAddress(provider: ContractProvider, owner: Address) {
        const result = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]);
        return result.stack.readAddress();
    }
}
