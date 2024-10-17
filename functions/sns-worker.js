import getUserOnchainData from '../data/getUserOnchainData.js';
import saveUserPositionHealthChange from '../data/saveUserPositionHealthChange.js';
import { shortAddress } from '../utils/String.js';
import { bot, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';

export const handler = async (event) => {
  const { telegramUserId, newAddress } = JSON.parse(event.Records[0].Sns.Message);

  const { [newAddress]: addressOnchainData } = await getUserOnchainData([newAddress]);
  const onchainPositions = Object.values(addressOnchainData);

  const foundPositions = onchainPositions.map(({
    isInHardLiq,
    isInSoftLiq,
    textPositionRepresentation,
    vaultData,
  }) => {
    const currentState = (
      isInHardLiq ? 'HARD' :
        isInSoftLiq ? 'SOFT' :
          'HEALTHY'
    );

    return {
      address: vaultData.address,
      currentState,
      textPositionRepresentation,
    };
  });

  await saveUserPositionHealthChange({
    telegramUserId,
    changedAddressesPositions: [{
      address: newAddress,
      changedPositions: foundPositions,
    }],
  });

  const unhealthyPositions = foundPositions.filter(({ currentState }) => currentState !== 'HEALTHY');
  if (unhealthyPositions.length > 0) {
    const text = `
      *Found ${unhealthyPositions.length > 1 ? 'positions' : 'position'} with a health status deserving your attention on the address you’ve just started monitoring \\(\`${shortAddress(newAddress)}\`\\):*
      ${Object.values(unhealthyPositions).map(({ textPositionRepresentation }) => textPositionRepresentation)}
      `;
    bot.telegram.sendMessage(telegramUserId, text, TELEGRAM_MESSAGE_OPTIONS);
  }
};
