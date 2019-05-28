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

        const policyIdsRegex = /^[0-9a-f]{32}(,[0-9a-f]{32})*$/
        const releaseIds = ctx.checkQuery('releaseIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const policyIds = ctx.checkQuery('policyIds').exist().match(policyIdsRegex).toSplitArray().len(1, 100).value
        const nodeId = ctx.checkQuery('nodeId').optional().isInt().toInt().gt(0).value
        const isFilterSignedPolicy = ctx.checkQuery('isFilterSignedPolicy').optional().default(0).in([0, 1]).value

        //const policyKeyValuePairRegex = /^([0-9a-f]{24}-[0-9a-f]{32})(,([0-9a-f]{24}-[0-9a-f]{32}))*$/
        //const releasePolicies = ctx.checkQuery('releasePolicies').exist().match(policyKeyValuePairRegex).toSplitArray().len(1, 500).value
        ctx.validate()

        var nodeInfo = null, contractType = nodeId ? 2 : 1, partyTwo = nodeId || ctx.request.userId
        if (nodeId) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`).then(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
                msg: ctx.gettext('params-validate-failed', 'nodeId'),
                property: 'ownerUserId'
            }))
        }

        if (!lodash.isEmpty(policyIds) && policyIds.length !== releaseIds.length) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'releaseIds,policyIds'))
        }

        // const releaseInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${releaseIds.toString()}`)
        //     .then(list => new Map(list.map(x => [x.releaseId, x])))
        //
        // if (releaseInfoMap.size !== lodash.uniq(releaseIds).length) {
        //     throw new ArgumentError(ctx.gettext('params-validate-failed', 'releaseIds'))
        // }
        //
        // const policies = []
        // for (let i = 0, j = releaseIds.length; i < j; i++) {
        //     let releaseId = releaseIds[i]
        //     let releaseInfo = releaseInfoMap.get(releaseId)
        // }

        const policies = []
        if (!lodash.isEmpty(policyIds)) {
            for (let i = 0, j = releaseIds.length; i < j; i++) {
                policyIds.push({releaseId: releaseIds[i], policyId: policyIds[i]})
            }
        }
        
        await ctx.service.signAuthService.releasePolicyIdentityAuthentication(policies, contractType, nodeInfo, partyTwo, isFilterSignedPolicy)
            .then(ctx.success)
    }
}