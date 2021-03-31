// @flow

import {create} from "../../common/utils/EntityUtils"
import {TypeRef} from "../../common/utils/TypeRef"


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
		"groupEncGroupRootSessionKey": {
			"id": 1192,
			"type": "Bytes",
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
		"ownerEncGroupInfoSessionKey": {
			"id": 1193,
			"type": "Bytes",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"userEncGroupKey": {
			"id": 1194,
			"type": "Bytes",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"adminGroup": {
			"id": 1195,
			"type": "ELEMENT_ASSOCIATION",
			"cardinality": "ZeroOrOne",
			"final": true,
			"refType": "Group"
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
	groupEncGroupRootSessionKey: Uint8Array;
	groupInfoEncName: Uint8Array;
	ownerEncGroupInfoSessionKey: Uint8Array;
	userEncGroupKey: Uint8Array;

	adminGroup: ?Id;
}