// @flow

import {create} from "../../common/utils/EntityUtils"
import {TypeRef} from "../../common/utils/TypeRef"


export const TemplateGroupDeleteDataTypeRef: TypeRef<TemplateGroupDeleteData> = new TypeRef("tutanota", "TemplateGroupDeleteData")
export const _TypeModel: TypeModel = {
	"name": "TemplateGroupDeleteData",
	"since": 45,
	"type": "DATA_TRANSFER_TYPE",
	"id": 1197,
	"rootId": "CHR1dGFub3RhAASt",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 1198,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"group": {
			"id": 1199,
			"type": "ELEMENT_ASSOCIATION",
			"cardinality": "One",
			"final": false,
			"refType": "Group"
		}
	},
	"app": "tutanota",
	"version": "45"
}

export function createTemplateGroupDeleteData(values?: $Shape<$Exact<TemplateGroupDeleteData>>): TemplateGroupDeleteData {
	return Object.assign(create(_TypeModel, TemplateGroupDeleteDataTypeRef), values)
}

export type TemplateGroupDeleteData = {
	_type: TypeRef<TemplateGroupDeleteData>;

	_format: NumberString;

	group: Id;
}