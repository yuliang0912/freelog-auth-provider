/**
 * 检测合同授权
 * 合同授权包含两个部分(A:合同本身处在激活态  B:乙方依然满足合同策略中规定的用户对象范围)
 * @type {module.contractAuthorization}
 */

'use strict'

const Patrun = require('patrun')
const nodeContractAuth = require('./node-contract-auth')
const userContractAuth = require('./user-contract-auth')
const resourceContractAuth = require('./resource-contract-auth')
const resourcePresentableSignAuth = require('./resource-presentable-sign-auth')
const resourceReContractableSignAuth = require('./resource-recontractable-sign-auth')
const policyIdentityAuthentication = require('../identity-authentication/index')
const contractType = require('egg-freelog-base/app/enum/contract_type')
const {ApplicationError} = require('egg-freelog-base/error')

class ContractAuthorization {

    constructor() {
        this.certificationRules = this.__registerCertificationRules__()
    }

    /**
     * 合同授权检查(step1:检查合同本身的状态  step2:检查用户对象是否依然符合策略)
     * @param contract
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     */
    async main(ctx, {contract, partyTwoInfo, partyTwoUserInfo}) {

        const contractAuthHandler = this.certificationRules.find({contractType: contract.contractType})
        if (!contractAuthHandler) {
            throw new ApplicationError('contract-authorization Error: 不被支持的合同')
        }

        const contractAuthResult = contractAuthHandler(ctx, {contract})
        if (!contractAuthResult.isAuth) {
            return contractAuthResult
        }

        const identityAuthResult = await policyIdentityAuthentication.main(ctx, {
            policySegment: contract.contractClause,
            contractType: contract.contractType,
            partyOneUserId: contract.partyOneUserId,
            partyTwoInfo, partyTwoUserInfo
        })

        return identityAuthResult.isAuth ? contractAuthResult : identityAuthResult
    }

    /**
     * 资源转签授权
     * @param contract
     * @returns {module.CommonAuthResult|*|commonAuthResult}
     */
    resourceReContractableSignAuth(ctx, contract) {
        return resourceReContractableSignAuth(ctx, {contract})
    }

    /**
     * 资源presentable签约授权
     * @param contract
     * @returns {module.CommonAuthResult|*|commonAuthResult}
     */
    resourcePresentableSignAuth(ctx, contract) {
        return resourcePresentableSignAuth(ctx, {contract})
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
     * 注册认证规则
     * @private
     */
    __registerCertificationRules__() {

        const patrun = Patrun()

        //节点合同校验
        patrun.add({contractType: contractType.ResourceToNode}, nodeContractAuth)

        //用户合同校验
        patrun.add({contractType: contractType.PresentableToUser}, userContractAuth)

        //资源合同校验
        patrun.add({contractType: contractType.ResourceToResource}, resourceContractAuth)

        return patrun
    }
}

module.exports = new ContractAuthorization()