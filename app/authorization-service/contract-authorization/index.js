'use strict'

const Patrun = require('patrun')
const {ApplicationError} = require('egg-freelog-base/error')
const NodeContractAuthHandler = require('./node-contract-auth')
const UserContractAuthHandler = require('./user-contract-auth')
const ReleaseContractAuthHandler = require('./release-contract-auth')
const {ResourceToNode, PresentableToUser, ResourceToResource} = require('egg-freelog-base/app/enum/contract_type')

/**
 * 合同授权包含两个部分(A:合同本身处在激活态  B:乙方依然满足合同策略中规定的用户对象范围)
 */
module.exports = class ContractAuthHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.__registerCertificationRules__()
    }

    /**
     * 合同授权检查(step1:检查合同本身的状态  step2:检查用户对象是否依然符合策略)
     * @param contract
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     */
    async contractAuth({contract, partyTwoInfo, partyTwoUserInfo}) {

        const {contractType} = contract
        const contractAuthHandler = this.patrun.find({contractType})
        if (!contractAuthHandler) {
            throw new ApplicationError('contract-authorization Error: 不被支持的合同')
        }

        return contractAuthHandler.handle({contract, partyTwoInfo, partyTwoUserInfo})
    }


    /**
     * 合同测试授权
     * @param ctx
     * @param contract
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     * @returns {Promise<void>}
     */
    async contractTestAuth({contract, partyTwoInfo, partyTwoUserInfo}) {

        const {contractType} = contract
        const contractAuthHandler = this.patrun.find({contractType, authType: 'testAuth'})
        if (!contractAuthHandler) {
            throw new ApplicationError('contract-authorization Error: 不被支持的合同')
        }

        return contractAuthHandler.contractTestAuthHandle({contract, partyTwoInfo, partyTwoUserInfo})
    }

    /**
     * 合同激活状态检查
     * @param contract
     */
    isActivated(ctx, contract) {

        const contractAuthHandler = this.certificationRules.find({contractType: contract.contractType})
        if (!contractAuthHandler) {
            throw new ApplicationError('contract-authorization Error: 不被支持的合同')
        }

        return contractAuthHandler(ctx, {contract}).isAuth
    }

    /**
     * 是否激活测试授权
     * @param contract
     */
    isActivateTestAuthorization(contract) {

        const contractClause = contract.contractClause || {}

        const currentStateInfo = contractClause.fsmStates[contractClause.currentFsmState]

        return currentStateInfo && currentStateInfo.authorization.some(x => x.toLocaleLowerCase() === 'test-active')
    }


    /**
     * 注册认证规则
     * @private
     */
    __registerCertificationRules__() {

        const {app, patrun} = this
        const nodeContractAuthHandler = new NodeContractAuthHandler(app)
        const userContractAuthHandler = new UserContractAuthHandler(app)
        const releaseContractAuthHandler = new ReleaseContractAuthHandler(app)

        patrun.add({contractType: ResourceToNode}, nodeContractAuthHandler)
        patrun.add({contractType: PresentableToUser}, userContractAuthHandler)
        patrun.add({contractType: ResourceToResource}, releaseContractAuthHandler)
        patrun.add({contractType: ResourceToNode, authType: 'testAuth'}, nodeContractAuthHandler)
        patrun.add({contractType: ResourceToResource, authType: 'testAuth'}, releaseContractAuthHandler)
    }
}