/**
 * Created by yuliang on 2017/8/30.
 */
'use strict'

const JsonWebToken = require('egg-freelog-base/app/extend/helper/jwt_helper')

module.exports = app => {

    const dataProvider = app.dataProvider
    const resourceAuthJwt = new JsonWebToken(app.config.rasSha256Key.resourceAuth.publicKey, app.config.rasSha256Key.resourceAuth.privateKey)

    return class HomeController extends app.Controller {

        /**
         * presentable授权检测
         * @returns {Promise.<void>}
         */
        async presentableAuthorization(ctx) {

            let userId = ctx.request.userId
            let nodeId = ctx.checkQuery('nodeId').exist().toInt().gt(0).value
            let presentableId = ctx.checkQuery('presentableId').exist().isMongoObjectId().value
            let userContractId = ctx.checkQuery('userContractId').optional().isMongoObjectId().value

            ctx.validate()

            let presentableInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/presentables/${presentableId}`).catch(err => {
                ctx.error(err)
            })

            if (!presentableInfo || presentableInfo.nodeId != nodeId || presentableInfo.status != 0) {
                ctx.error({msg: '未找到有效的presentable', data: presentableInfo})
            }

            /**
             * TODO:presentableInfo-policy需要校验策略是否真的需要用户签约,如果不需要签约,则user-contract不进行授权请求
             * TODO:目前阶段presentable-policy还未定义,暂定为都需要签约才可用
             */

            let nodeContractAuthTask = app.authService.nodeContractAuth.authorization(presentableInfo.contractId, nodeId)
            let userContractAuthTask = app.authService.userContractAuth.authorization(presentableId, nodeId, userId, userContractId)

            await Promise.all([nodeContractAuthTask, userContractAuthTask]).then(([nodeContractAuthResult, userContractAuthResult]) => {

                if (!userContractAuthResult.isAuth) {
                    return Promise.reject({
                        msg: '用户与节点之间的合约授权失败',
                        errCode: userContractAuthResult.authErrCode,
                        data: {
                            authResult: {
                                isAuth: userContractAuthResult.isAuth,
                                authCode: userContractAuthResult.authCode,
                                authErrorCode: userContractAuthResult.authErrCode
                            },
                            data: userContractAuthResult.data,
                            errors: userContractAuthResult.errors
                        }
                    })
                }

                if (!nodeContractAuthResult.isAuth) {
                    return Promise.reject({
                        msg: '节点与资源之间的合约授权失败',
                        errCode: nodeContractAuthResult.authErrCode,
                        data: {
                            authResult: {
                                isAuth: nodeContractAuthResult.isAuth,
                                authCode: nodeContractAuthResult.authCode,
                                authErrorCode: nodeContractAuthResult.authErrCode
                            },
                            data: nodeContractAuthResult.data,
                            errors: nodeContractAuthResult.errors
                        }
                    })
                }

                return {
                    userId, nodeId, presentableId,
                    nodeContractId: presentableInfo.contractId,
                    userContractId: userContractAuthResult.data.contract ? userContractAuthResult.data.contract.contractId : null,
                    resourceId: presentableInfo.resourceId
                }
            }).then(token => {
                token.signature = resourceAuthJwt.createJwt(token, 1296000)
                ctx.success(token)
            }).catch(err => ctx.error(err))
        }

        /**
         * 针对资源直接授权
         * @param ctx
         * @returns {Promise<void>}
         */
        async resourceAuthorization(ctx) {

        }
    }
}