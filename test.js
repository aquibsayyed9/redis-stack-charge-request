const chai = require('chai');
const sinon = require('sinon');
const redis = require("redis");
const { chargeRequestRedis, resetRedis } = require('./index'); // Import your functions here

const { expect } = chai;
chai.use(require('sinon-chai'));

describe('Redis operations', () => {
  let sandbox;
  let redisClient;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock redis client
    redisClient = {
      get: sandbox.stub(),
      set: sandbox.stub(),
      decrby: sandbox.stub(),
      quit: sandbox.stub().yields(null, 'OK') // Add a stub for the quit method
    };

    sandbox.stub(redis, 'RedisClient').returns(redisClient);
    redisClient.on = sandbox.stub().callsFake((event, callback) => {
      if (event === 'ready') {
        callback();
      }
    });
  });


  afterEach(() => {
    // Restore the default sandbox
    sandbox.restore();
  });

  it('should reset balance correctly', (done) => {
    redisClient.set.yields(null, 'OK');
    console.log('outside log');

    resetRedis()
      .then((balance) => {
        expect(balance).to.equal(100);
        expect(redisClient.set).to.have.been.calledWith('account1/balance', '100');
        console.log('reached till reset balance corr');
        done();
      })
      .catch(done);
  });

  it('should handle an error during reset', (done) => {
    redisClient.set.yields(new Error('Oops!'));
    resetRedis()
      .then(() => {
        done(new Error('should have thrown an error'));
      })
      .catch((err) => {
        expect(err.message).to.equal('Oops!');
        done();
      });
  });

  it('should charge correctly', (done) => {
    redisClient.get.yields(null, '100');
    redisClient.decrby.yields(null, 95);
    chargeRequestRedis()
      .then((result) => {
        expect(result.isAuthorized).to.be.true;
        expect(result.remainingBalance).to.equal(95);
        expect(result.charges).to.equal(5);
        done();
      })
      .catch(done);
  });

  it('should not authorize if balance is too low', (done) => {
    redisClient.get.yields(null, '2');
    chargeRequestRedis()
      .then((result) => {
        expect(result.isAuthorized).to.be.false;
        expect(result.remainingBalance).to.equal(2);
        expect(result.charges).to.equal(0);
        done();
      })
      .catch(done);
  });
});
