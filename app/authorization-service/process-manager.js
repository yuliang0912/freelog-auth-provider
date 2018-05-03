'use strict'

const authCodeEnum = require('../enum/auth_code')
const errAuthCodeEnum = require('../enum/auth_err_code')
const commonAuthResult = require('./common-auth-result')
const globalInfo = require('egg-freelog-base/globalInfo')
const identityAuthentication = require('./identity-authentication/index')
const userContractAuthorization = require('./contract-authorization/user-contract-auth')
const nodeContractAuthorization = require('./contract-authorization/node-contract-auth')
const resourcePolicyAuthorization = require('./policy-authentication/resource-policy-auth')
const presentablePolicyAuthorization = require('./policy-authentication/presentable-policy-auth')
const JsonWebToken = require('egg-freelog-base/app/extend/helper/jwt_helper')
const resourceAuthJwt = new JsonWebToken()

const AuthProcessManager = class AuthProcessManager {

    constructor() {
        this.app = globalInfo.app
        this.dataProvider = globalInfo.app.dataProvider
        resourceAuthJwt.publicKey = globalInfo.app.config.rasSha256Key.resourceAuth.publicKey
        resourceAuthJwt.privateKey = globalInfo.app.config.rasSha256Key.resourceAuth.privateKey
    }

    /**
     * presentable授权
     * @param presentableInfo
     * @param userInfo
     * @param nodeInfo
     * @param userContractInfo
     * @returns {Promise<void>}
     */
    async presentableAuthorization({presentableInfo, userInfo, nodeInfo, userContract}) {

        try {
            if (!presentableInfo || !nodeInfo) {
                throw new Error('授权服务接口presentable接收到的参数错误')
            }

            //如果有登陆用户,则使用用户的合同,否则尝试使用虚拟合同授权
            let userContractAuthorizationResult = userInfo
                ? await this.userContractAuthorization({userContract, userInfo, nodeInfo})
                : await this.virtualContractAuthorization({presentableInfo, userInfo, nodeInfo})

            userContractAuthorizationResult.data.presentableId = presentableInfo.presentableId

            if (userInfo && userContractAuthorizationResult.authErrCode === errAuthCodeEnum.notFoundUserContract) {
                let tasks = presentableInfo.policy.map(policySegment => {
                    return this.presentablePolicyIdentityAuthentication({
                        policySegment, userInfo, nodeInfo
                    }).then(authResult => {
                        policySegment.identityAuthenticationResult = authResult.isAuth
                    })
                })
                await Promise.all(tasks)
                userContractAuthorizationResult.data.presentableInfo = presentableInfo
            }

            if (!userContractAuthorizationResult.isAuth) {
                return userContractAuthorizationResult
            }

            let nodeContract = await this.dataProvider.contractProvider.getContractById(presentableInfo.contractId)
            let nodeContractAuthorizationResult = await this.nodeContractAuthorization({
                nodeContract,
                nodeInfo,
                userInfo
            })

            if (!nodeContractAuthorizationResult.isAuth) {
                return nodeContractAuthorizationResult
            }

            userContractAuthorizationResult.data.authToken = {
                userId: userInfo ? userInfo.userId : 0,
                nodeId: nodeInfo.nodeId,
                presentableId: presentableInfo.presentableId,
                nodeContractId: presentableInfo.contractId,
                userContractId: userContract ? userContract.contractId : null,
                resourceId: presentableInfo.resourceId
            }
            userContractAuthorizationResult.data.authToken.expire = Math.round(new Date().getTime() / 1000) + 1296000
            userContractAuthorizationResult.data.authToken.signature = resourceAuthJwt.createJwt(userContractAuthorizationResult.data.authToken, 1296000)

            return userContractAuthorizationResult
        } catch (e) {
            let result = new commonAuthResult(authCodeEnum.Exception)
            result.authErrCode = errAuthCodeEnum.exception
            e.data && Object.assign(result.data, e.data)
            result.addError(e.toString())
            return result
        }
    }

    /**
     * 用户合同身份认证与授权
     * @param policy
     * @param userInfo
     */
    async userContractAuthorization({userContract, userInfo, nodeInfo}) {

        let userContractAuthorizationResult = await userContractAuthorization.auth({userContract})

        if (!userContractAuthorizationResult.isAuth) {
            return userContractAuthorizationResult
        }

        if (!userInfo || userContract.partyTwo !== userInfo.userId || userContract.contractType !== this.app.contractType.PresentableToUer) {
            throw new Error('参数错误,数据不匹配')
        }

        let identityAuthenticationResult = await identityAuthentication.presentablePolicyIdentityAuth({
            userInfo, nodeInfo,
            policy: userContract.policySegment
        })

        if (!identityAuthenticationResult.isAuth) {
            return identityAuthenticationResult
        }

        return userContractAuthorizationResult
    }

    /**
     * 节点合同身份认证与授权
     * @param nodeContract
     * @param nodeInfo
     */
    async nodeContractAuthorization({nodeContract, userInfo, nodeInfo}) {

        let nodeContractAuthorizationResult = await nodeContractAuthorization.auth({nodeContract})

        if (!nodeContractAuthorizationResult.isAuth) {
            return nodeContractAuthorizationResult
        }

        if (!nodeInfo || nodeContract.partyTwo !== nodeInfo.nodeId || nodeContract.contractType !== this.app.contractType.ResourceToNode) {
            throw new Error('参数错误,数据不匹配')
        }

        let nodeIdentityAuthenticationResult = await identityAuthentication.resourcePolicyIdentityAuth({
            nodeInfo, userInfo,
            policyOwnerId: nodeContract.partyOne,
            policy: nodeContract.policySegment
        })

        if (!nodeIdentityAuthenticationResult.isAuth) {
            return nodeIdentityAuthenticationResult
        }

        return nodeContractAuthorizationResult
    }

    /**
     * 基于虚拟合同授权,即满足initial-terminate模式
     * @param presentableInfo
     * @param userInfo
     * @param nodeInfo
     */
    async virtualContractAuthorization({presentableInfo, userInfo, nodeInfo}) {

        let result = new commonAuthResult(authCodeEnum.BasedOnNodePolicy)


        let authPolicySegment = null

        for (let i = 0, j = presentableInfo.policy.length; i < j; i++) {
            let policySegment = presentableInfo.policy[i]

            let presentablePolicyAuthorizationResult = await presentablePolicyAuthorization.auth({policySegment})
            if (!presentablePolicyAuthorizationResult.isAuth) {
                continue
            }

            let identityAuthenticationResult = await identityAuthentication.presentablePolicyIdentityAuth({
                userInfo, nodeInfo, policy: policySegment
            })
            if (!identityAuthenticationResult.isAuth) {
                continue
            }

            authPolicySegment = policySegment
            result.data.policySegment = policySegment
            break
        }


        if (!authPolicySegment) {
            result.authCode = authCodeEnum.NodePolicyUngratified
            result.authErrCode = result.authErrCode || errAuthCodeEnum.presentablePolicyRefuse
            result.addError('未能通过presentable策略授权')
        }

        return result
    }

    /**
     * 基于资源策略对资源进行直接授权(非presentable模式)
     * 用户资源预览或者类似于license的资源
     * @param presentableInfo
     * @param userInfo
     */
    async resourcePolicyAuthorization({resourcePolicy, nodeInfo, userInfo}) {

        let result = new commonAuthResult(authCodeEnum.BasedOnResourcePolicy)

        let authPolicySegment = null
        for (let i = 0, j = resourcePolicy.policy.length; i < j; i++) {

            let policySegment = resourcePolicy.policy[i]
            let resourcePolicyAuthorizationResult = await resourcePolicyAuthorization.auth({policySegment})
            if (!resourcePolicyAuthorizationResult.isAuth) {
                continue
            }

            let identityAuthenticationResult = await identityAuthentication.resourcePolicyIdentityAuth({
                userInfo, nodeInfo, policyOwnerId: resourcePolicy.userId, policy: policySegment
            })
            if (!identityAuthenticationResult.isAuth) {
                continue
            }

            authPolicySegment = policySegment
            result.data.policySegment = policySegment
            break
        }

        if (!authPolicySegment) {
            result.authCode = authCodeEnum.ResourcePolicyUngratified
            result.authErrCode = result.authErrCode || errAuthCodeEnum.resourcePolicyRefuse
            result.addError('未能通过资源策略授权')
            return result
        }

        result.data.authToken = {
            userId: userInfo ? userInfo.userId : 0,
            nodeId: nodeInfo ? nodeInfo.nodeId : 0,
            resourceId: resourcePolicy.resourceId,
            segmentId: result.data.policySegment.segmentId
        }

        result.data.authToken.signature = resourceAuthJwt.createJwt(result.data.authToken, 1296000)

        return result
    }

    /**
     * 资源策略身份认证
     * @param policySegment
     * @param userInfo
     * @param nodeInfo
     */
    async resourcePolicyIdentityAuthentication({policyOwnerId, policySegment, nodeInfo, userInfo}) {
        return identityAuthentication.resourcePolicyIdentityAuth({
            nodeInfo, userInfo, policyOwnerId, policy: policySegment
        })
    }

    /**
     * presentable策略身份认证
     * @param policySegment
     * @param userInfo
     */
    async presentablePolicyIdentityAuthentication({policySegment, userInfo, nodeInfo}) {
        return identityAuthentication.presentablePolicyIdentityAuth({
            userInfo, nodeInfo, policy: policySegment
        })
    }
}

module.exports = new AuthProcessManager()