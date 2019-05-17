'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller
const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('../../authorization-service/common-auth-result')
const authProcessManager = require('../../authorization-service/process-manager')
const {ApplicationError, ArgumentError} = require('egg-freelog-base/error')
const PolicyIdentitySignAuthValidator = require('../../extend/json-schema/policy-identity-sign-auth-validator')

module.exports = class PresentableOrResourceAuthController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 指定策略的授权对象检查
     * @param ctx
     * @returns {Promise<void>}
     */
    async releasePolicyIdentityAuthentication(ctx) {

        //对象-策略字符匹配规则 releaseId-policyId,多个用逗号分隔
        const policyKeyValuePairRegex = /^([0-9a-f]{24}-[0-9a-f]{32})(,([0-9a-f]{24}-[0-9a-f]{32}))*$/
        const nodeId = ctx.checkQuery('nodeId').optional().isInt().toInt().gt(0).value
        const isFilterSignedPolicy = ctx.checkQuery('isFilterSignedPolicy').optional().default(0).in([0, 1]).value
        const releasePolicies = ctx.checkQuery('releasePolicies').exist().match(policyKeyValuePairRegex).toSplitArray().len(1, 500).value
        ctx.validate()

        var nodeInfo = null, contractType = 1, partyTwo = nodeId || ctx.request.userId
        if (nodeId) {
            contractType = 2
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
            ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
                msg: ctx.gettext('params-validate-failed', 'nodeId'),
                data: {nodeId},
                property: 'ownerUserId'
            })
        }
        let policies = releasePolicies.map(item => {
            const [releaseId, policyId] = item.split('-')
            return {releaseId, policyId}
        })

        await ctx.service.signAuthService.releasePolicyIdentityAuthentication(policies, contractType, nodeInfo, partyTwo, isFilterSignedPolicy)
            .then(ctx.success)
    }
}