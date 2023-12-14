import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Jetton', () => {
    let jettonWalletCode: Cell;
    let jettonMinterCode: Cell;

    beforeAll(async () => {
        jettonWalletCode = await compile('JettonWallet');
        jettonMinterCode = await compile('JettonMinter');
    });

    let blockchain: Blockchain;
    let jettonWallet: SandboxContract<JettonWallet>;
    let jettonMinter: SandboxContract<JettonMinter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const deployer = await blockchain.treasury('deployer');

        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    owner: deployer.address,
                    name: "USDT",
                    symbol: "USDT",
                    image: "https://www.linkpicture.com/q/download_183.png",
                    description: "My jetton",
                    // TODO: build metadata
                    context: beginCell().endCell(),
                    walletCode: jettonWalletCode,
                },
                jettonMinterCode
            )
        );

        jettonWallet = blockchain.openContract(
            JettonWallet.createFromConfig(
                {
                    balance: BigInt(0),
                    ownerAddress: deployer.address,
                    jettonMasterAddress: jettonMinter.address,
                    jettonWalletCode: jettonWalletCode
                },
                jettonWalletCode
            )
        );
        const deployResult = await jettonMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMinter.address,
            deploy: true,
            success: true,
        });
    });

    it('should mint jetton', async () => {
        const owner = await blockchain.treasury('deployer');

        const data = await jettonMinter.getJettonData();
        console.log("jetton data:", data.totalSupply);

        const jettonWalletAddress = await jettonMinter.getWalletAddress(owner.address);
        console.log("jetton wallet address", jettonWalletAddress);
        expect(jettonWallet.address.toString()).toEqual(jettonWalletAddress.toString());

        console.log(`owner: ${owner.address}, jetton Minter: ${jettonMinter.address}, jetton Wallet: ${jettonWallet.address}`);
        const mintResult = await jettonMinter.sendMint(owner.getSender(), {
            value: toNano('0.1'),
            to: owner.address,
            amount: toNano('1000'),
        });

        expect(mintResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonMinter.address,
            success: true,
        });

        const afterData = await jettonMinter.getJettonData();
        console.log("after jetton total:", afterData.totalSupply);
        expect(afterData.totalSupply).toBe(toNano('1000'));
    });

    it('should transfer jetton', async () => {
        const totalAmount = 1000;
        const owner = await blockchain.treasury('deployer');
        await jettonMinter.sendMint(owner.getSender(), {
            value: toNano('0.05'),
            to: owner.address,
            amount: toNano(totalAmount),
        });
        const afterData = await jettonMinter.getJettonData();
        expect(afterData.totalSupply).toBe(toNano(totalAmount));

        const receipt = await blockchain.treasury('receipt');
        const sentAmount = 100;
        let transferResult = await jettonWallet.sendTransfer(owner.getSender(), {
            value: toNano('0.05'),
            from: owner.address,
            to: receipt.address,
            amount: toNano(sentAmount)
        })
        expect(transferResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonWallet.address,
            success: true,
        });
        const jettonBalance = await jettonWallet.getBalance();
        console.log("owner jetton balance:", jettonBalance);
        expect(jettonBalance).toBe(toNano(totalAmount - sentAmount));

        const receiptJettonWalletAddress = await jettonMinter.getWalletAddress(receipt.address);
        const receiptJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(receiptJettonWalletAddress));
        const receiptJettonBalance = await receiptJettonWallet.getBalance();
        console.log("receipt jetton balance:", receiptJettonBalance);
        expect(receiptJettonBalance).toBe(toNano(sentAmount));
    });

    it('should burn jetton', async () => {
        const totalAmount = 1000;
        const owner = await blockchain.treasury('deployer');
        await jettonMinter.sendMint(owner.getSender(), {
            value: toNano('0.05'),
            to: owner.address,
            amount: toNano(totalAmount),
        });
        const afterData = await jettonMinter.getJettonData();
        expect(afterData.totalSupply).toBe(toNano(totalAmount));

        let burnAmount = 100;
        let burnResult = await jettonWallet.sendBurn(owner.getSender(), {
            value: toNano('0.05'),
            from: owner.address,
            amount: toNano(burnAmount)
        })
        expect(burnResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonWallet.address,
            success: true,
        });

        const burnJettonBalance = await jettonWallet.getBalance();
        console.log("after burn, owner jetton balance:", burnJettonBalance);
        expect(burnJettonBalance).toBe(toNano(totalAmount - burnAmount));
    });
});
