'use strict'

const Controller = require('egg').Controller
const ExtensionNames = ['data', 'js', 'css', 'html']
const authService = require('../../authorization-service/process-manager')
const crypto = require('egg-freelog-base/app/extend/helper/crypto_helper')

module.exports = class PresentableController extends Controller {

    /**
     * 请求获取presentable资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentable(ctx) {

        let nodeId = ctx.checkQuery('nodeId').toInt().value
        let presentableId = ctx.checkParams('presentableId').isMongoObjectId('presentableId格式错误').value
        let resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value
        let extName = ctx.checkParams('extName').optional().in(ExtensionNames).value
        let userContractId = ctx.checkQuery('userContractId').optional().isContractId().value
        let userId = ctx.request.userId
        ctx.validate(false)  //validateIdentity:false  用户可以不用登陆

        if (userContractId && !userId) {
            ctx.error({msg: '参数userContractId错误,当前不存在登录用户'})
        }
        
    }
}