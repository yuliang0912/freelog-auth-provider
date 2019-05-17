/**
 * 保证金没收事件
 */

'use strict'

const EscrowTransferService = require('../lib/escrow-transfer-service')

module.exports = class EscrowConfiscatedHandler {

    constructor(app) {
        this.app = app
        this.escrowTransferService = new EscrowTransferService(app)
    }

    /**
     * 保证金没收处理
     */
    async handler(ctx, {contractInfo, eventInfo, userInfo, toAccountId}) {

        this.authorization(contractInfo, userInfo)

        const {contractAccountName} = eventInfo.params
        const contractAccountDeclaration = contractInfo.contractClause.fsmDeclarations[contractAccountName]
        const contractAccountId = contractAccountDeclaration && contractAccountDeclaration.declareType === 'contractAccount'
            ? contractAccountDeclaration.accountId : contractAccountName

        return this.escrowTransferService.escrowTransfer({
            contractInfo, userInfo, toAccountId,
            fromAccountId: contractAccountId, eventId: eventInfo.eventId
        })
    }

    /**
     * 检查授权
     */
    authorization(contractInfo, userInfo) {
        return contractInfo.partyOneUserId === userInfo.userId
    }
}