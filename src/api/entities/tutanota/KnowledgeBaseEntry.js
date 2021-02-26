// @flow

import {create} from "../../common/utils/EntityUtils"
import {TypeRef} from "../../common/utils/TypeRef"

import type {KnowledgeBaseEntryKeywords} from "./KnowledgeBaseEntryKeywords"

export const KnowledgeBaseEntryTypeRef: TypeRef<KnowledgeBaseEntry> = new TypeRef("tutanota", "KnowledgeBaseEntry")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseEntry",
	"since": 45,
	"type": "LIST_ELEMENT_TYPE",
	"id": 1170,
	"rootId": "CHR1dGFub3RhAASS",
	"versioned": false,
	"encrypted": true,
	"values": {
		"_format": {
			"id": 1174,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"_id": {
			"id": 1172,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"_ownerEncSessionKey": {
			"id": 1176,
			"type": "Bytes",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_ownerGroup": {
			"id": 1175,
			"type": "GeneratedId",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_permissions": {
			"id": 1173,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"description": {
			"id": 1178,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"title": {
			"id": 1177,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"keywords": {
			"id": 1179,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "KnowledgeBaseEntryKeywords"
		}
	},
	"app": "tutanota",
	"version": "45"
}

export function createKnowledgeBaseEntry(values?: $Shape<$Exact<KnowledgeBaseEntry>>): KnowledgeBaseEntry {
	return Object.assign(create(_TypeModel, KnowledgeBaseEntryTypeRef), values)
}

export type KnowledgeBaseEntry = {
	_type: TypeRef<KnowledgeBaseEntry>;
	_errors: Object;

	_format: NumberString;
	_id: IdTuple;
	_ownerEncSessionKey: ?Uint8Array;
	_ownerGroup: ?Id;
	_permissions: Id;
	description: string;
	title: string;

	keywords: KnowledgeBaseEntryKeywords[];
}