export function groupByDate(records) {
  return Object.values(
    records.reduce((accumulator, record) => {
      if (!accumulator[record.date]) {
        accumulator[record.date] = {
          date: record.date,
          investors: 0,
          walletsConnected: 0,
          incomingAmount: 0,
          planAmount: 0,
          cyclePayouts: 0,
          referralPayouts: 0,
          platformFee: 0,
          operatorNet: 0,
          gap: 0,
          claimableNow: 0,
          accruedLater: 0,
          activeWallets: 0,
          transactions: 0,
          failedTransactions: 0,
          transactionVolume: 0,
        };
      }

      accumulator[record.date].investors += record.investors;
      accumulator[record.date].walletsConnected += record.walletsConnected;
      accumulator[record.date].incomingAmount += record.incomingAmount;
      accumulator[record.date].planAmount += record.planAmount;
      accumulator[record.date].cyclePayouts += record.cyclePayouts;
      accumulator[record.date].referralPayouts += record.referralPayouts;
      accumulator[record.date].platformFee += record.platformFee;
      accumulator[record.date].operatorNet += record.operatorNet;
      accumulator[record.date].gap += record.gap;
      accumulator[record.date].claimableNow += record.claimableNow;
      accumulator[record.date].accruedLater += record.accruedLater;
      accumulator[record.date].activeWallets += record.activeWallets;
      accumulator[record.date].transactions += record.transactions;
      accumulator[record.date].failedTransactions += record.failedTransactions;
      accumulator[record.date].transactionVolume += record.transactionVolume;

      return accumulator;
    }, {}),
  ).sort((left, right) => left.date.localeCompare(right.date));
}

export function groupBySource(records) {
  return Object.values(
    records.reduce((accumulator, record) => {
      if (!accumulator[record.source]) {
        accumulator[record.source] = {
          source: record.source,
          investors: 0,
          walletsConnected: 0,
          incomingAmount: 0,
          planAmount: 0,
          cyclePayouts: 0,
          referralPayouts: 0,
          platformFee: 0,
          operatorNet: 0,
          gap: 0,
          claimableNow: 0,
          accruedLater: 0,
          activeWallets: 0,
          transactions: 0,
        };
      }

      accumulator[record.source].investors += record.investors;
      accumulator[record.source].walletsConnected += record.walletsConnected;
      accumulator[record.source].incomingAmount += record.incomingAmount;
      accumulator[record.source].planAmount += record.planAmount;
      accumulator[record.source].cyclePayouts += record.cyclePayouts;
      accumulator[record.source].referralPayouts += record.referralPayouts;
      accumulator[record.source].platformFee += record.platformFee;
      accumulator[record.source].operatorNet += record.operatorNet;
      accumulator[record.source].gap += record.gap;
      accumulator[record.source].claimableNow += record.claimableNow;
      accumulator[record.source].accruedLater += record.accruedLater;
      accumulator[record.source].activeWallets += record.activeWallets;
      accumulator[record.source].transactions += record.transactions;

      return accumulator;
    }, {}),
  );
}

export function groupNetworkStats(records) {
  const networks = records.reduce((accumulator, record) => {
    Object.entries(record.networks).forEach(([network, value]) => {
      accumulator[network] = (accumulator[network] || 0) + value;
    });

    return accumulator;
  }, {});

  return Object.entries(networks).map(([network, value]) => ({
    network,
    value,
  }));
}
