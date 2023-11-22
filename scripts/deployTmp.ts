import { toNano } from 'ton-core';
import { Tmp } from '../wrappers/Tmp';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const tmp = provider.open(
        Tmp.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Tmp')
        )
    );

    await tmp.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tmp.address);

    console.log('ID', await tmp.getID());
}
