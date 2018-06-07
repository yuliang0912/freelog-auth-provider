'use strict'

const authCodeEnum = require('../enum/auth_code')
const errAuthCodeEnum = require('../enum/auth_err_code')
const commonAuthResult = require('./common-auth-result')
const globalInfo = require('egg-freelog-base/globalInfo')
const IdentityAuthentication = require('./identity-authentication/index')
const ContractAuthorization = require('./contract-authorization/index')
const PolicyAuthorization = require('./policy-authorization/index')

const AuthProcessManager = class AuthProcessManager {

    constructor() {
        this.app = globalInfo.app
    }

    /**
     * presentable授权树授权状态检查(先循环遍历去异步授权)
     * 后续优化可以分批次加入队列中执行.
     * @param presentableAuthTree 需要在构建的数据中完善合同信息,主要是partyTwoUserInfo,contractInfo,nodeInfo
     * @param nodeInfo
     * @returns {Promise<void>}
     */
    async presentableAuthTreeAuthorization(presentableAuthTree) {

        if (!Reflect.has(presentableAuthTree, 'nodeInfo')) {
            throw new Error('presentableAuthTreeAuthorization Error:参数信息不完整')
        }
        const authResult = new commonAuthResult(authCodeEnum.BasedOnNodeContract)
        const unActivatedContracts = [], resourceContracts = [], nodeContracts = []

        presentableAuthTree.authTree.forEach(current => {
            let currentContract = current.contractInfo
            if (!ContractAuthorization.isActivated(currentContract)) {
                unActivatedContracts.push(currentContract)
            }
            if (currentContract.contractType === this.app.contractType.ResourceToNode) {
                nodeContracts.push(currentContract)
            }
            if (currentContract.contractType === this.app.contractType.ResourceToResource) {
                resourceContracts.push(currentContract)
            }
        })

        if (unActivatedContracts.length) {
            authResult.authCode = authCodeEnum.ContractUngratified
            authResult.authErrCode = errAuthCodeEnum.contractNotActivate
            authResult.data.unActivatedContracts = unActivatedContracts
            return authResult
        }

        //节点身份认证异步任务集
        const nodeContractIdentityAuthTasks = nodeContracts.map(contract => {
            let params = {
                policySegment: contract.policySegment,
                contractType: contract.contractType,
                partyOneUserId: contract.partyOneUserId,
                partyTwoInfo: presentableAuthTree.nodeInfo,
                partyTwoUserInfo: contract.partyTwoUserInfo
            }
            return IdentityAuthentication.main(params)
        })
        const nodeContractIdentityAuthResults = await Promise.all(nodeContractIdentityAuthTasks)
        const identityAuthFaildNodeContract = nodeContractIdentityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFaildNodeContract.length) {
            authResult.authCode = authCodeEnum.NodePolicyUngratified
            authResult.authErrCode = errAuthCodeEnum.identityAuthenticationRefuse
            authResult.data.identityAuthFaildNodeContract = identityAuthFaildNodeContract
            return authResult
        }

        //节点作者身份认证异步任务集
        const resourceContractIdentityAuthTasks = resourceContracts.map(contract => {
            let params = {
                policySegment: contract.policySegment,
                contractType: contract.contractType,
                partyOneUserId: contract.partyOneUserId,
                partyTwoInfo: null,
                partyTwoUserInfo: contract.partyTwoUserInfo
            }
            return IdentityAuthentication.main(params)
        })
        const resourceContractIdentityAuthResults = await Promise.all(resourceContractIdentityAuthTasks)
        const identityAuthFaildResourceContract = resourceContractIdentityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFaildResourceContract.length) {
            authResult.authCode = authCodeEnum.ResourcePolicyUngratified
            authResult.authErrCode = errAuthCodeEnum.identityAuthenticationRefuse
            authResult.data.identityAuthFaildResourceContract = identityAuthFaildResourceContract
            return authResult
        }

        return authResult
    }

    /**
     * 获取合同授权结果
     * @param contract
     * @param partyTwoInfo 如果是节点合同,则需要传入nodeInfo,其他类型合同可以不穿此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async contractAuthorization({contract, partyTwoInfo, partyTwoUserInfo}) {
        return ContractAuthorization.main({contract, partyTwoInfo, partyTwoUserInfo})
    }

    /***
     * 针对策略段尝试获取授权(用户对象满足,策略满足initital-terminate模式)
     * @param policySegment
     * @param contractType 此处为虚拟的授权甲乙方关系.参考合同类型的设定
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入noedeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyAuthorization({policySegments, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const result = new commonAuthResult(authCodeEnum.BasedOnResourcePolicy)
        const params = {contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}

        for (let i = 0, j = policySegments.length; i < j; i++) {
            const policySegment = policySegments[i]
            const policyAuthResult = await PolicyAuthorization.main(Object.assign({}, params, {policySegment}))
            if (!policyAuthResult.isAuth) {
                continue
            }
            result.data.policySegment = policySegment
            break
        }

        if (!result.data.policySegment) {
            result.authCode = authCodeEnum.ResourcePolicyUngratified
            result.authErrCode = result.authErrCode || errAuthCodeEnum.resourcePolicyRefuse
            result.addError('未能通过资源策略授权')
        }

        return result
    }

    /**
     * 针对策略尝试对目标对象做认证
     * @param policySegment
     * @param contractType 此处为虚拟的授权甲乙方关系.参考合同类型的设定
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入noedeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyIdentityAuthentication({policySegment, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {
        return IdentityAuthentication.main({
            policySegment,
            contractType,
            partyOneUserId,
            partyTwoInfo,
            partyTwoUserInfo
        })
    }

}

module.exports = new AuthProcessManager()