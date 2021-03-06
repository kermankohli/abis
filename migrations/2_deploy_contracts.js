const MathLib = artifacts.require(
  '@marketprotocol/marketprotocol/MathLib.sol'
);
const OrderLib = artifacts.require(
  '@marketprotocol/marketprotocol/OrderLib.sol'
);
const QueryTest = artifacts.require(
  '@marketprotocol/marketprotocol/OraclizeQueryTest.sol'
);
const MarketContractOraclize = artifacts.require(
  '@marketprotocol/marketprotocol/MarketContractOraclize.sol'
);
const MarketContractFactory = artifacts.require(
  '@marketprotocol/marketprotocol/MarketContractFactoryOraclize.sol'
);
const MarketCollateralPoolFactory = artifacts.require(
  '@marketprotocol/marketprotocol/MarketCollateralPoolFactory.sol'
);
const MarketContractRegistry = artifacts.require(
  '@marketprotocol/marketprotocol/MarketContractRegistry.sol'
);
const MarketToken = artifacts.require(
  '@marketprotocol/marketprotocol/MarketToken.sol'
);

module.exports = function(deployer, network) {
  if (network !== 'live') {
    deployer.deploy(MathLib);
    deployer.deploy(OrderLib);
    deployer.deploy(MarketContractRegistry).then(function() {

      deployer.link(
        MathLib,
        QueryTest,
        MarketContractOraclize,
        MarketContractFactory
      );

      deployer.link(
        MathLib,
        MarketCollateralPoolFactory
      );

      deployer.link(OrderLib, MarketContractFactory, MarketContractOraclize);
      // deploy our quest test contract
      deployer.deploy(QueryTest).then(function(queryTestInstance) {
        // by forcing the first query when we deploy we can make sure all the prices are accurate since
        // the first query is free with oraclize.
        return queryTestInstance.testOracleQuery(
          'URL',
          'json(https://api.kraken.com/0/public/Ticker?pair=BCHUSD).result.BCHUSD.c.0',
        );
      });

      // deploy MKT token
      const marketTokenToLockForTrading = 0; // for testing purposes, require no lock
      const marketTokenAmountForContractCreation = 0; //for testing purposes require no balance
      return deployer
        .deploy(
          MarketToken,
          marketTokenToLockForTrading,
          marketTokenAmountForContractCreation
        )
        .then(function() {
          // deploy collateral token and a fake wrapped ETH

          const daysToExpiration = 28;
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + daysToExpiration);

          // deploy and set up main factory to create MARKET Protocol smart contracts.
          return MarketContractRegistry.deployed().then(function(
            marketContractRegistry
          ) {

            return deployer.deploy(
              MarketCollateralPoolFactory,
              marketContractRegistry.address
            ).then(function(collateralPoolFactory)
            {
              return deployer
                .deploy(
                  MarketContractFactory,
                  marketContractRegistry.address,
                  MarketToken.address,
                  collateralPoolFactory.address,
                  {
                    gas: 7000000
                  }
                )
                .then(function(factory) {
                  // white list the factory
                  return marketContractRegistry
                    .addFactoryAddress(factory.address)
                });
            });
          });
        });
    });
  }
};
