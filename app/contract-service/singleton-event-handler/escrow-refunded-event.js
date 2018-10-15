/**
 * 保证金找回事件
 */

'use strict'

const EscrowTransferService = require('../lib/escrow-transfer-service')

module.exports = class SignLicenseHandler {

    constructor(app) {
        this.app = app
        this.escrowTransferService = new EscrowTransferService(app)
    }

    /**
     * 保证金赎回
     */
    async handler({contractInfo, eventInfo, userInfo, toAccountId}) {

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
        return contractInfo.partyTwoUserId === userInfo.userId
    }
}