'use strict'

const Service = require('egg').Service
const authCodeEnum = require('../enum/auth_code')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')
const JsonWebToken = require('egg-freelog-base/app/extend/helper/jwt_helper')

class ResourceAuthService extends Service {

    /**
     * 基于资源策略直接授权
     * @param resourceId
     * @returns {Promise<void>}
     * @constructor
     */
    async resourceAuth({resourceId, nodeId}) {

        const {ctx, app} = this
        const userId = ctx.request.userId

        const authResultCache = await ctx.service.authTokenService.getAuthToken({
            targetId: resourceId,
            partyTwo: nodeId || userId,
            partyTwoUserId: userId
        })
        if (authResultCache) {
            return authResultCache
        }

        const userInfo = ctx.request.identityInfo.userInfo || null
        const nodeInfo = nodeId ? await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`) : null
        if (nodeInfo && nodeInfo.userId !== userId) {
            ctx.error({msg: '节点信息与登录用户不匹配', data: {nodeInfo, userInfo}})
        }

        const params = {
            contractType: nodeInfo ? app.contractType.ResourceToNode : 4,
            partyTwoInfo: nodeInfo,
            partyTwoUserInfo: userId
        }

        //如果资源授权方案策略授权通过,则直接返回,否则返回策略拒绝
        const resourceAuthSchemes = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?resourceIds=${resourceId}`)
        for (let i = 0, j = resourceAuthSchemes.length; i < j; i++) {
            let authScheme = resourceAuthSchemes[i]
            if (!authScheme.policy.length) {
                continue
            }
            const authSchemeAuthResult = await authService.policyAuthorization(Object.assign(params, {
                policySegments: authScheme.policy,
                partyOneUserId: authScheme.userId
            }))
            if (authSchemeAuthResult.isAuth) {
                ctx.service.authTokenService.saveResourceAuthResult({
                    resourceId, userInfo, nodeInfo,
                    authResult: authSchemeAuthResult,
                    authSchemeId: authScheme.authSchemeId
                })
                return authSchemeAuthResult
            }
        }

        return new commonAuthResult(authCodeEnum.ResourcePolicyUngratified)
    }


    /***
     * 获取资源授权jwt签名信息
     * @param resourceId
     * @param payLoad 签名载体
     * @param expire 默认172800秒(2天)
     */
    getAuthResourceInfo({resourceId, payLoad = {}, expire = 172800}) {

        const {ctx, config} = this
        const {publicKey, privateKey} = config.rasSha256Key.resourceAuth
        const resourceAuthJwt = new JsonWebToken(publicKey, privateKey)

        const signature = resourceAuthJwt.createJwt(Object.assign({}, payLoad, {resourceId}), expire)

        return ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/auth/getResource`, {headers: {authorization: `bearer ${signature}`}})
    }
}

module.exports = ResourceAuthService