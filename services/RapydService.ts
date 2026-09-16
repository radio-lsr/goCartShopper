// services/RapydService.ts
// Simulation – À remplacer par les vrais appels API Rapyd

export async function createCorporateWallet(
  shopperId: string,
): Promise<{ walletId: string; cardId: string }> {
  // Appel API Rapyd pour créer un sous-wallet ou une carte virtuelle liée au wallet principal de l'entreprise
  console.log(`Création wallet/carte pour shopper ${shopperId}`);
  return {
    walletId: `corp_wallet_${shopperId.slice(-8)}`,
    cardId: `corp_card_${shopperId.slice(-8)}`,
  };
}

export async function getCardBalance(cardId: string): Promise<number> {
  // Appel API Rapyd pour obtenir le solde de la carte
  // Retour 0 par défaut
  return 0;
}
