'use strict'

const authCodeEnum = require('../enum/auth-code')
const commonAuthResult = require('./common-auth-result')
const {ApplicationError} = require('egg-freelog-base/error')
const freelogContractType = require('egg-freelog-base/app/enum/contract_type')
//身份认证
const IdentityAuthentication = require('./identity-authentication/index')
//合同授权(包含了身份认证)
const ContractAuthorization = require('./contract-authorization/index')
//策略授权(包含了身份认证)
const PolicyAuthorization = require('./policy-authorization/index')

const AuthProcessManager = class AuthProcessManager {

    /**
     * presentable授权树授权状态检查(先循环遍历去异步授权)
     * 后续优化可以分批次加入队列中执行.
     * @param presentableAuthTree 需要在构建的数据中完善合同信息,主要是partyTwoUserInfo,contractInfo,nodeInfo
     * @param nodeInfo
     * @returns {Promise<void>}
     */
    async presentableAuthTreeAuthorization(presentableAuthTree) {

        if (!Reflect.has(presentableAuthTree, 'nodeInfo')) {
            throw new ApplicationError('presentableAuthTreeAuthorization Error:参数信息不完整')
        }
        const {authTree, nodeInfo} = presentableAuthTree
        const authResult = new commonAuthResult(authCodeEnum.BasedOnNodeContract)
        const unActivatedNodeContracts = [], unActivatedResourceContracts = [], resourceContracts = [],
            nodeContracts = []

        authTree.forEach(current => {

            let {contractInfo} = current
            let contractIsActivated = ContractAuthorization.isActivated(contractInfo)

            if (contractInfo.contractType === freelogContractType.ResourceToNode) {
                nodeContracts.push(contractInfo)
                !contractIsActivated && unActivatedNodeContracts.push(contractInfo)
            }
            if (contractInfo.contractType === freelogContractType.ResourceToResource) {
                resourceContracts.push(contractInfo)
                !contractIsActivated && unActivatedResourceContracts.push(contractInfo)
            }
        })

        authResult.data.presentableAuthTree = presentableAuthTree
        if (unActivatedNodeContracts.length) {
            authResult.authCode = authCodeEnum.NodeContractNotActive
            authResult.data.unActivatedNodeContracts = unActivatedNodeContracts
            return authResult
        }
        if (unActivatedResourceContracts.length) {
            authResult.authCode = authCodeEnum.ResourceContractNotActive
            authResult.data.unActivatedResourceContracts = unActivatedResourceContracts
            return authResult
        }

        //节点身份认证异步任务集
        const nodeContractIdentityAuthTasks = nodeContracts.map(contract => {
            let params = {
                policySegment: contract.contractClause,
                contractType: contract.contractType,
                partyOneUserId: contract.partyOneUserId,
                partyTwoInfo: nodeInfo,
                partyTwoUserInfo: contract.partyTwoUserInfo
            }
            return IdentityAuthentication.main(params)
        })
        const nodeContractIdentityAuthResults = await Promise.all(nodeContractIdentityAuthTasks)
        const identityAuthFailedNodeContract = nodeContractIdentityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFailedNodeContract.length) {
            authResult.authCode = authCodeEnum.NodeContractIdentityAuthenticationFailed
            authResult.data.identityAuthFaildNodeContracts = identityAuthFailedNodeContract
            return authResult
        }

        //节点作者身份认证异步任务集
        const resourceContractIdentityAuthTasks = resourceContracts.map(contract => {
            let params = {
                policySegment: contract.contractClause,
                contractType: contract.contractType,
                partyOneUserId: contract.partyOneUserId,
                partyTwoInfo: null,
                partyTwoUserInfo: contract.partyTwoUserInfo
            }
            return IdentityAuthentication.main(params)
        })
        const resourceContractIdentityAuthResults = await Promise.all(resourceContractIdentityAuthTasks)
        const identityAuthFailedResourceContract = resourceContractIdentityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFailedResourceContract.length) {
            authResult.authCode = authCodeEnum.ResourceContractIdentityAuthenticationFailed
            authResult.data.identityAuthFailedResourceContracts = identityAuthFailedResourceContract
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
        return ContractAuthorization.main(...arguments)
    }

    /***
     * 针对策略段尝试获取授权(用户对象满足,策略满足initial-terminate模式)
     * @param policySegment
     * @param contractType 此处为虚拟的授权甲乙方关系.参考合同类型的设定
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入nodeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyAuthorization({policySegments, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const result = new commonAuthResult(authCodeEnum.BasedOnResourcePolicy)
        const params = {contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}

        for (let i = 0, j = policySegments.length; i < j; i++) {
            const policySegment = policySegments[i]
            if (policySegment.status !== 1) {
                continue
            }
            const policyAuthResult = await PolicyAuthorization.main(Object.assign({}, params, {policySegment}))
            if (!policyAuthResult.isAuth) {
                continue
            }
            result.data.policySegment = policySegment
            break
        }

        if (!result.data.policySegment) {
            result.authCode = contractType === freelogContractType.ResourceToResource ? authCodeEnum.NotFoundResourceContract
                : contractType === freelogContractType.ResourceToNode ? authCodeEnum.NotFoundNodeContract : authCodeEnum.NotFoundUserPresentableContract
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
        return IdentityAuthentication.main(...arguments)
    }

    /**
     * 资源转签授权
     * @param contract
     * @returns {module.CommonAuthResult|*|commonAuthResult}
     */
    async resourceReContractableSignAuth(contract) {
        return ContractAuthorization.resourceReContractableSignAuth(contract)
    }

    /**
     * 资源presentable签约授权
     * @param contract
     * @returns {module.CommonAuthResult|*|commonAuthResult}
     */
    async resourcePresentableSignAuth(contract) {
        return ContractAuthorization.resourcePresentableSignAuth(contract)
    }

}

module.exports = new AuthProcessManager()