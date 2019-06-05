'use strict'

const uuid = require('uuid')
const lodash = require('lodash')
const contractStatusEnum = require('../../enum/contract-status-enum')
const {ApplicationError} = require('egg-freelog-base/error')

module.exports = class GenerateContract {

    constructor(app) {
        this.app = app
    }

    /**
     * 根据策略生成合同
     */
    async generateContract(contractInfo) {

        const {contractId, policySegment, partyTwoUserId, isDynamicAuthentication} = contractInfo

        // const declarationKeys = Object.keys(policySegment.fsmDeclarations || {})
        // for (let i = 0, j = declarationKeys.length; i < j; i++) {
        //     const declaration = policySegment.fsmDeclarations[declarationKeys[i]]
        //     if (declaration.declareType === 'contractAccount' && /^escrowAccount$/i.test(declaration.type)) {
        //         //测试.目前声明区域没有货币类型参数
        //         declaration.currencyType = 1
        //         let accountInfo = await this.createContractAccount(contractId, declaration.currencyType, partyTwoUserId)
        //         declaration.accountId = accountInfo.accountId
        //     }
        // }

        for (let [key, declaration] of Object.entries(policySegment.fsmDeclarations)) {
            if (declaration.declareType === 'contractAccount' && /^escrowAccount$/i.test(declaration.type)) {
                //测试.目前声明区域没有货币类型参数
                declaration.currencyType = 1
                let accountInfo = await this.createContractAccount(contractId, declaration.currencyType, partyTwoUserId)
                declaration.accountId = accountInfo.accountId
            }
        }

        lodash.forIn(policySegment.fsmStates, (stateDescription) => lodash.forIn(stateDescription.transition, (eventInfo) => {
            if (eventInfo) {
                eventInfo.eventId = uuid.v4().replace(/-/g, '')
            }
        }))

        contractInfo.contractClause = {
            authorizedObjects: policySegment.authorizedObjects || [],
            isDynamicAuthentication: isDynamicAuthentication ? 1 : 0,
            policyText: policySegment.policyText,
            policySegmentId: policySegment.segmentId,
            fsmDeclarations: policySegment.fsmDeclarations,
            fsmStates: policySegment.fsmStates,
            currentFsmState: 'none'
        }

        contractInfo.isTerminate = 0
        contractInfo.status = contractStatusEnum.uninitialized

        return contractInfo
    }

    /**
     * 创建合同账户
     * @returns {Promise<void>}
     */
    async createContractAccount(contractId, currencyType, userId) {

        return this.app.curlIntranetApi(`${this.app.webApi.accountInfo}/createContractAccount`, {
            type: 'post',
            dataType: 'json',
            contentType: 'json',
            data: {contractId, currencyType, accountName: '合同账户'}
        }, {userInfo: {userId}}).catch(error => {
            throw new ApplicationError('创建合同账户失败', {error: error.message})
        })
    }
}