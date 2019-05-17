'use strict'

const FreelogCommonJsonSchema = require('egg-freelog-base/app/extend/json-schema/common-json-schema')

module.exports = class PolicyIdentitySignAuthValidator extends FreelogCommonJsonSchema {

    constructor() {
        super()
        this.__registerValidators__()
    }

    /**
     * 方案的策略身份授权和签约授权校验
     * @param resolveReleases
     * @returns {ValidatorResult}
     */
    resolvePolicyIdentityAndSignAuthValidate(releasePolicies) {
        return super.validate(releasePolicies, super.getSchema('/releasePolicySchemaArraySchema'))
    }

    /**
     * 注册所有的校验
     * @private
     */
    __registerValidators__() {

        super.addSchema({
            id: "/releasePolicySchemaArraySchema",
            type: "array",
            uniqueItems: true,
            maxItems: 50,
            items: {$ref: "/releasePolicySchema"}
        })

        super.addSchema({
            id: "/releasePolicySchema",
            type: "object",
            additionalProperties: false,
            properties: {
                releaseId: {required: true, type: "string", format: "mongoObjectId"},
                policies: {
                    required: true,
                    type: "array",
                    uniqueItems: true,
                    items: {
                        type: "object",
                        properties: {
                            policyId: {required: true, type: "string", format: "md5"}
                        }
                    }
                }
            }
        })
    }
}
