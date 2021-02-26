// @flow

import {create} from "../../common/utils/EntityUtils"
import {TypeRef} from "../../common/utils/TypeRef"

import type {InternalGroupData} from "./InternalGroupData"

export const TemplateGroupPostDataTypeRef: TypeRef<TemplateGroupPostData> = new TypeRef("tutanota", "TemplateGroupPostData")
export const _TypeModel: TypeModel = {
	"name": "TemplateGroupPostData",
	"since": 45,
	"type": "DATA_TRANSFER_TYPE",
	"id": 1189,
	"rootId": "CHR1dGFub3RhAASl",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 1190,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"groupInfoEncName": {
			"id": 1191,
			"type": "Bytes",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"ownerEncTemplateGroupRootSessionKey": {
			"id": 1193,
			"type": "Bytes",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"userEncGroupKey": {
			"id": 1192,
			"type": "Bytes",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"groupData": {
			"id": 1194,
			"type": "AGGREGATION",
			"cardinality": "One",
			"final": false,
			"refType": "InternalGroupData"
		}
	},
	"app": "tutanota",
	"version": "45"
}

export function createTemplateGroupPostData(values?: $Shape<$Exact<TemplateGroupPostData>>): TemplateGroupPostData {
	return Object.assign(create(_TypeModel, TemplateGroupPostDataTypeRef), values)
}

export type TemplateGroupPostData = {
	_type: TypeRef<TemplateGroupPostData>;

	_format: NumberString;
	groupInfoEncName: Uint8Array;
	ownerEncTemplateGroupRootSessionKey: Uint8Array;
	userEncGroupKey: Uint8Array;

	groupData: InternalGroupData;
}