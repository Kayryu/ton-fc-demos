import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Tmp } from '../wrappers/Tmp';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Tmp', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Tmp');
    });

    let blockchain: Blockchain;
    let tmp: SandboxContract<Tmp>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        tmp = blockchain.openContract(
            Tmp.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await tmp.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tmp.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tmp are ready to use
    });

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await tmp.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await tmp.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: tmp.address,
                success: true,
            });

            const counterAfter = await tmp.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });

    it('should double counter', async () => {
        {
            const increaser = await blockchain.treasury('increaser' + 1);

            const counterBefore = await tmp.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await tmp.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: tmp.address,
                success: true,
            });

            const counterAfter = await tmp.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
        

        const doubler = await blockchain.treasury('doubler');

        const counterBefore = await tmp.getCounter();

        console.log('counter before double', counterBefore);

        const doubleResult = await tmp.sendDouble(doubler.getSender(), {
            value: toNano('0.05'),
        });

        expect(doubleResult.transactions).toHaveTransaction({
            from: doubler.address,
            to: tmp.address,
            success: true,
        });

        const counterAfter = await tmp.getCounter();

        console.log('counter after double', counterAfter);

        expect(counterAfter).toBe(counterBefore*2);
    });
});
