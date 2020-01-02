'use strict'

const uuid = require('uuid')
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')

module.exports = class EscrowTransferService {

    constructor(app) {
        this.app = app
        this.privateKey = app.config.rasSha256Key.resourceAuth.privateKey
        this.contractTradeRecordProvider = app.dal.contractTradeRecordProvider
    }

    /**
     * 保证金转账(赎回和没收)
     */
    async escrowTransfer({contractInfo, eventId, fromAccountId, toAccountId, userInfo, transferType = 2}) {

        const signObject = {accountId: fromAccountId, transferType, userId: userInfo.userId, tradeType: 2}
        const signString = Object.keys(signObject).sort().map(x => `${x}=${signObject[x]}`).join('&')
        const authCode = cryptoHelper.rsaSha256Sign(signString, this.privateKey)

        const {contractId, contractName, contractType} = contractInfo
        const fsmState = contractInfo.contractClause.currentFsmState


        const model = {
            tradeRecordId: uuid.v4().replace(/-/g, ''),
            contractId, contractName, contractType, fsmState, fromAccountId, toAccountId, eventId,
            tradeType: 2, userId: userInfo.userId, amount: 0,
        }

        const contractTradeRecord = await this.contractTradeRecordProvider.create(model)

        const {transferId, amount, tradeStatus} = await this._transfer({
            fromAccountId, refParam: model.tradeRecordId,
            toAccountId, userInfo, transferType, authCode
        })

        await contractTradeRecord.updateOne({amount, paymentOrderId: transferId})

        return {tradeRecordId: model.tradeRecordId, tradeStatus, amount}
    }

    /**
     * 调用支付接口
     */
    async _transfer({fromAccountId, toAccountId, userInfo, transferType, authCode, refParam, remark}) {

        const {app} = this
        return app.curlIntranetApi(`${app.webApi.pay}/inquireTransfer`, {
            type: 'post',
            contentType: 'json',
            data: {fromAccountId, toAccountId, authCode, amount: 1, transferType, refParam, remark}
        }, {userInfo})
    }
}

