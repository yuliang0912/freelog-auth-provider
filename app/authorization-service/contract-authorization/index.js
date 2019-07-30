'use strict'

const Patrun = require('patrun')
const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const nodeContractAuth = require('./node-contract-auth')
const userContractAuth = require('./user-contract-auth')
const resourceContractAuth = require('./resource-contract-auth')
const {ApplicationError} = require('egg-freelog-base/error')
const policyIdentityAuthentication = require('../identity-authentication/index')
const {ResourceToNode, PresentableToUser, ResourceToResource} = require('egg-freelog-base/app/enum/contract_type')
const {terminate} = require('../../enum/contract-status-enum')

/**
 * 合同授权包含两个部分(A:合同本身处在激活态  B:乙方依然满足合同策略中规定的用户对象范围)
 */
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

        const {contractType, contractClause, partyOneUserId} = contract
        const contractAuthHandler = this.certificationRules.find({contractType})
        if (!contractAuthHandler) {
            throw new ApplicationError('contract-authorization Error: 不被支持的合同')
        }
        //如果合同已经终止,则直接返回对应的错误码
        if (contract.status === terminate) {
            let authCode = contractType === ResourceToResource ? authCodeEnum.ReleaseContractTerminated :
                contractType === ResourceToNode ? authCodeEnum.NodeContractTerminated : authCodeEnum.UserContractTerminated
            return new AuthResult(authCode)
        }

        const contractAuthResult = contractAuthHandler(ctx, {contract})
        //如果合同中的授权对象是固定的(非动态,例如分组),则不再需要后续进行身份认证
        if (!contractAuthResult.isAuth || !contract.contractClause.isDynamicAuthentication) {
            return contractAuthResult
        }

        const identityAuthResult = await policyIdentityAuthentication.main(ctx, {
            policySegment: contractClause, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo
        })

        if (identityAuthResult.authCode === authCodeEnum.PolicyIdentityAuthenticationFailed) {
            identityAuthResult.authCode =
                contractType === ResourceToResource ? authCodeEnum.ReleaseContractIdentityAuthenticationFailed :
                    contractType === ResourceToNode ? authCodeEnum.NodeContractIdentityAuthenticationFailed :
                        contractType === PresentableToUser ? authCodeEnum.UserContractIdentityAuthenticationFailed :
                            authCodeEnum.PolicyIdentityAuthenticationFailed
        }

        return identityAuthResult.isAuth ? contractAuthResult : identityAuthResult
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
        patrun.add({contractType: ResourceToNode}, nodeContractAuth)

        //用户合同校验
        patrun.add({contractType: PresentableToUser}, userContractAuth)

        //资源合同校验
        patrun.add({contractType: ResourceToResource}, resourceContractAuth)

        return patrun
    }
}

module.exports = new ContractAuthorization()