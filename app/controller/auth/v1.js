'use strict'

const Controller = require('egg').Controller
const ExtensionNames = ['data', 'js', 'css', 'html']
const authService = require('../../authorization-service/process-manager')

module.exports = class PresentableController extends Controller {

    /**
     * 请求获取presentable资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentable(ctx) {

        let nodeId = ctx.checkQuery('nodeId').toInt().value
        let presentableId = ctx.checkParams('presentableId').isMongoObjectId('presentableId格式错误').value
        let extName = ctx.checkParams('extName').optional().in(ExtensionNames).value
        let userContractId = ctx.checkQuery('userContractId').optional().isContractId().value
        //资源响应请求设置:https://help.aliyun.com/document_detail/31980.html?spm=5176.doc31855.2.9.kpDwZN
        let response = ctx.checkHeader('response').optional().toJson().default({}).value
        let userId = ctx.request.userId
        ctx.validate(false)  //validateIdentity:false 用户可以不用登陆

        if (userContractId && !userId) {
            ctx.error({msg: '参数userContractId错误,当前不存在登录用户'})
        }

        let authResult = await ctx.service.presentableAuthService.authProcessHandler({
            userId,
            nodeId,
            presentableId,
            userContractId
        })

        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authErrCode, data: authResult.toObject()})
        }

        let authToken = authResult.data.authToken
        ctx.set('freelog-contract-id', authToken.nodeContractId)

        let resourceInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/auth/getResource`, {
            headers: response
                ? {authorization: "bearer " + authToken.signature, response: JSON.stringify(response)}
                : {authorization: "bearer " + authToken.signature}
        })

        if (!extName) {
            Reflect.deleteProperty(resourceInfo, 'resourceUrl')
            ctx.success(resourceInfo)
            return
        }

        if (extName === 'data') {
            const result = await ctx.curl(resourceInfo.resourceUrl, {streaming: true})
            if (!/^2[\d]{2}$/.test(result.status)) {
                ctx.error({msg: '文件丢失,未能获取到资源源文件信息', data: {['http-status']: result.status}})
            }
            ctx.attachment(presentableId)
            ctx.set('content-type', 'application/octet-stream')
            //ctx.set('content-length', result.headers['content-length'])
            ctx.set('freelog-resource-type', resourceInfo.resourceType)
            ctx.set('freelog-meta', JSON.stringify(resourceInfo.meta))
            ctx.set('freelog-system-meta', JSON.stringify(resourceInfo.systemMeta))
            ctx.body = result.res
            return
        }
        if (resourceInfo.mimeType === 'application/json') {
            await ctx.curl(resourceInfo.resourceUrl).then(res => {
                return res.data.toString()
            }).then(JSON.parse).then(data => {
                ctx.success(data[extName])
            }).catch(err => {
                ctx.error(err)
            })
            return
        }
        ctx.success(null)
    }


    /**
     * 直接请求获取资源数据(为类似于license资源服务)
     * @param ctx
     * @returns {Promise<void>}
     */
    async resource(ctx) {
        let resourceId = ctx.checkParams("resourceId").isResourceId().value
        ctx.validate(false)

        let resourcePolicy = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/v1/resources/policies/${resourceId}`)

        /**
         * TODO:如果policy是public initial-terminat模式,则直接调用授权服务,申请发放签名.然后去资源服务申请获取资源URL地址
         */
    }
}