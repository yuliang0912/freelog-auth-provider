/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

const {type, validator} = require('egg-freelog-base/app/extend/application')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')
const JsonSchemaValidator = require('jsonschema').Validator

let jsonSchemaValidator = new JsonSchemaValidator();

let pbContractSchema = {
    id: "/pbContractSchema",
    type: "object",
    properties: {
        resourceId: {type: "string", format: 'resourceId'},
        segmentId: {type: "string", format: 'md5'},
        serialNumber: {type: "string", format: 'mongoObjectId'},
    }
}

let pbContractListSchema = {
    id: "/pbContractListSchema",
    type: "array",
    items: {$ref: "/pbContractSchema"}
}

/**
 * resourceId
 * @param input
 * @returns {*|boolean}
 */
JsonSchemaValidator.prototype.customFormats.resourceId = function (input) {
    return commonRegex.resourceId.test(input)
}

/**
 * mongoObjectId
 * @param input
 * @returns {*|boolean}
 */
JsonSchemaValidator.prototype.customFormats.mongoObjectId = function (input) {
    return commonRegex.mongoObjectId.test(input)
}

/**
 * mongoObjectId
 * @param input
 * @returns {*|boolean}
 */
JsonSchemaValidator.prototype.customFormats.md5 = function (input) {
    return type.string(input) && validator.isMD5(input)
}


jsonSchemaValidator.addSchema(pbContractSchema, '/pbContractSchema')
jsonSchemaValidator.addSchema(pbContractListSchema, '/pbContractListSchema')

module.exports = {
    jsonSchemaValidator,
    pbContractSchema,
    pbContractListSchema
}


