'use strict'

const FreelogCommonJsonSchema = require('egg-freelog-base/app/extend/json-schema/common-json-schema')

module.exports = class SignReleaseValidator extends FreelogCommonJsonSchema {

    constructor() {
        super()
        this.__registerValidators__()
    }

    /**
     * 签约的发行参数校验
     * @param signReleases
     * @returns {ValidatorResult}
     */
    signReleaseValidate(signReleases) {
        return super.validate(signReleases, super.getSchema('/signReleaseArraySchema'))
    }

    /**
     * 注册所有的校验
     * @private
     */
    __registerValidators__() {

        super.addSchema({
            id: "/signReleaseArraySchema",
            type: "array",
            uniqueItems: true,
            maxItems: 200,
            items: {$ref: "/signReleaseSchema"}
        })

        super.addSchema({
            id: "/signReleaseSchema",
            type: "object",
            additionalProperties: false,
            properties: {
                releaseId: {required: true, type: "string", format: "mongoObjectId"},
                policyIds: {
                    type: "array",
                    uniqueItems: true,
                    maxItems: 5,
                    items: {type: "string", required: true, format: "md5"}
                }
            }
        })
    }
}
