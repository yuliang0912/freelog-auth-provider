/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

const pbContractSchema = require('./json-schema/pb-contract-schema')


module.exports = {

    /**
     * 校验presnetableList schema
     * @param data
     * @returns {exports}
     */
    validatePbContractList(data) {

        let result =
            pbContractSchema.jsonSchemaValidator.validate(data, pbContractSchema.pbContractListSchema)

        if (result.errors.length) {
            this.error({msg: "body-json-schema校验失败", data: result, errCode: this.app.errCodeEnum.paramValidateError})
        }

        return this
    },

    get webApi() {
        return this.app.webApi
    }
}