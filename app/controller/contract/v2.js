/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const SignReleaseValidator = require('../../extend/json-schema/batch-sign-release-validator')


module.exports = class ContractController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 合同记录
     * @param ctx
     * @returns {Promise<void>}
     */
    async contractRecords(ctx) {

        const partyOnes = ctx.checkQuery('partyOnes').optional().isSplitMongoObjectId().toSplitArray().value
        const contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().value
        const contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().value

        ctx.validate()

        if (partyOnes && partyTwo === undefined) {
            ctx.error({msg: ctx.gettext('参数%s必须与%s组合使用', 'resourceIds', 'partyTwo')})
        }

        const condition = {}
        if (partyOnes) {
            condition.partyOne = {$in: partyOnes}
        }
        if (contractIds) {
            condition._id = {$in: contractIds}
        }
        if (partyTwo !== undefined) {
            condition.partyTwo = partyTwo
        }
        if (contractType) {
            condition.contractType = contractType
        }
        if (!Object.keys(condition).length) {
            ctx.error({msg: ctx.gettext('缺少必要参数')})
        }

        var projectionStr = null
        if (projection && projection.length) {
            projectionStr = projection.join(' ')
        }

        await this.contractProvider.find(condition, projectionStr).then(ctx.success)
    }

    /**
     * 批量创建授权方案的合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchCreateReleaseContracts(ctx) {

        const partyTwoId = ctx.checkBody("partyTwoId").exist().notEmpty().value
        const targetId = ctx.checkBody("targetId").exist().isMongoObjectId().value
        const signReleases = ctx.checkBody("signReleases").isArray().len(1, 200).value
        const contractType = ctx.checkBody("contractType").toInt().in([1, 2]).value

        ctx.allowContentType({type: 'json'}).validate()

        const validateResult = new SignReleaseValidator().signReleaseValidate(signReleases)
        if (validateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'signReleases'), {
                errors: validateResult.errors
            })
        }

        var nodeInfo = null
        if (contractType === ctx.app.contractType.ResourceToNode) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${partyTwoId}`)
            ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
                msg: ctx.gettext('params-validate-failed', 'nodeId'),
                data: {nodeId: partyTwoId},
                property: 'ownerUserId'
            })
        }

        await ctx.service.contractService.batchCreateReleaseContracts({
            signReleases, contractType, partyTwoId, targetId
        }).then(ctx.success)
    }
}

