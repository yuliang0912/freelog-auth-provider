'use strict'

const groupAuth = require('./authentication/group-auth')
const individualsAuth = require('./authentication/individuals-auth')
const userContractAuth = require('./authentication/user-contract-auth')
const nodeContractAuth = require('./authentication/node-contract-auth')

class AuthProcessManager {

    constructor(app) {
        this.app = app
        this.dataProvider = app.dataProvider
    }

    /**
     * 授权接口
     * @param resourceId 资源ID
     * @param presentableId 展示方案ID
     * @param userId 登录用户ID
     * @param nodeId  节点ID
     * @param userContractId 用户主动选择执行的合同ID
     */
    async authorization(ctx, {resourceId, presentableId, userId, nodeId, userContractId}) {

        let result = new commonAuthResult(authCodeEnum.Default)

        try {
            let presentableInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/presentables/${presentableId}`)

            if (!presentableInfo) {
                throw new Error('presentable is not found')
            }

            let userInfo = userId ?
                await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/userinfos/${userId}`) : undefined

        } catch (exception) {
            result.authCode = authCodeEnum.Exception
            result.addError(exception)
            return result
        }
    }

    /**
     * 用户认证
     * @param policyAuthUserObject 策略规定的授权用户对象
     * @param userInfo
     */
    userAuthentication(policyAuthUsers, userInfo) {

        let authResult1 = individualsAuth.auth(policyAuthUsers, userInfo)
        if (!authResult1.isAuth) {
            return authResult1
        }

        let authResult2 = groupAuth.auth(policyAuthUsers, userInfo)
        if (!authResult2.isAuth) {
            return authResult2
        }

        return new commonAuthResult(authCodeEnum.BasedOnUserObjectAuth)
    }

    /**
     * 节点-资源合同认证
     * @param policy
     * @param resourcePolicy
     */
    async nodeToResourceContractAuthentication(contractId, nodeInfo, userInfo) {

        let result = new commonAuthResult(authCodeEnum.NodeContractUngratified)

        let contractInfo = await this.dataProvider.contractProvider.getContract({
            _id: contractId,
            partyTwo: nodeInfo.nodeId,
            contractType: this.app.contractType.ResourceToNode,
        }).catch(err => {
            result.authErrCode = authErrorCodeEnum.nodeContractAuthException
            result.addError(err.toString())
            return result
        })

        if (result.errors.length) {
            return result
        }
        if (!contractInfo) {
            result.authErrCode = authErrorCodeEnum.notFoundNodeContract
            result.addError('未找到节点的合同数据')
        }
        else if (contractInfo.status === 3) {
            result.authCode = authCodeEnum.BasedOnNodeContract
        }
        else {
            result.authErrCode = authErrorCodeEnum.nodeContractNotActivate
            result.addError(`资源与节点的合同未生效,当前合同状态:${contractInfo.status}`)
        }

        if (contractInfo) {
            let nodeInfoAuthResult = this.userAuthentication(contractInfo.policySegment.users, nodeInfo)
            if (!nodeInfoAuthResult.isAuth) {
                return nodeInfoAuthResult
            }
        }

        result.data.contract = contractInfo

        return result
    }

    /**
     * 用户-节点合同认证
     * @param presentablePolicy
     * @param userInfo
     * @param userContractId
     */
    async userToNodeContractAuthentication(presentableId, nodeInfo, userInfo, userContractId) {

        let result = new commonAuthResult(authCodeEnum.UserContractUngratified)

        let allUserContracts = await dataProvider.contractProvider.getContracts({
            targetId: presentableId,
            partyOne: nodeInfo.nodeId,
            partyTwo: userInfo.userId,
            contractType: this.app.contractType.PresentableToUer,
            status: {$in: [1, 2, 3]}
        }).catch(err => {
            result.addError(err.toString())
            result.authErrCode = authErrorCodeEnum.userContractAuthException
            return result
        })

        if (result.errors.length) {
            return result
        }

        if (!allUserContracts.length) {
            result.addError('未找到有效的用户合同')
            result.authErrCode = authErrorCodeEnum.notFoundUserContract
            result.data = {presentableId, contracts: allUserContracts}
            return result
        }

        if (allUserContracts.length > 1 && !userContractId) {
            result.addError('请选择需要执行的合同')
            result.authErrCode = authErrorCodeEnum.chooseUserContract
            result.data = {presentableId, contracts: allUserContracts}
            return result
        }

        let contractInfo = userContractId ? allUserContracts.find(x => x.contractId === userContractId) : allUserContracts[0]
        if (!contractInfo) {
            result.addError('参数userContractId错误,未能找到有效的用户合同')
            result.authErrCode = authErrorCodeEnum.userContractIdError
            result.data = {userContractId, contracts: allUserContracts}
            return result
        }

        result.data.contract = contractInfo

        //用户对象认证检查(先检查用户身份,再检查合同状态)
        let userAuth = this.userAuthentication(contractInfo.policySegment.users, userInfo)
        if (!userAuth.isAuth) {
            return userAuth
        }

        if (contractInfo.status !== 3) {
            result.addError(`用户合同未生效,当前合同状态:${contractInfo.status}`)
            result.authErrCode = authErrorCodeEnum.userContractNotActivate
            return result
        }

        //授权通过[基于用户合同授权]
        result.authCode = authCodeEnum.BasedOnUserContract

        return result
    }
}

module.exports = app => new AuthProcessManager(app)