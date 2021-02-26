// @flow

import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import {createKnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {remove} from "../api/common/utils/ArrayUtils"
import {EntityClient} from "../api/common/EntityClient"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {clone, neverNull, noOp} from "../api/common/utils/Utils"
import {createKnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {LazyLoaded} from "../api/common/utils/LazyLoaded"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {NotFoundError} from "../api/common/error/RestError"
import {UserError} from "../api/main/UserError"

/**
 *  Model, which includes the logic of the editor
 */

export class KnowledgeBaseEditorModel {
	title: Stream<string>
	_enterTitleAttrs: TextFieldAttrs
	_entityClient: EntityClient
	_templateGroupRoot: TemplateGroupRoot
	+entry: KnowledgeBaseEntry
	availableTemplates: LazyLoaded<Array<EmailTemplate>>
	_descriptionProvider: ?() => string

	constructor(entry: ?KnowledgeBaseEntry, templateGroupInstances: TemplateGroupRoot, entityClient: EntityClient) {
		this.title = stream("")
		this._entityClient = entityClient
		this._templateGroupRoot = templateGroupInstances
		this.entry = entry ? clone(entry) : createKnowledgeBaseEntry()
		this._descriptionProvider = null

		this.availableTemplates = new LazyLoaded(() => {
			return this._entityClient.loadAll(EmailTemplateTypeRef, this._templateGroupRoot.templates)
		}, [])
	}

	isUpdate(): boolean {
		return this.entry._id != null
	}

	addKeyword(keywordInput: string) {
		let keyword
		const keywordString = keywordInput.toLowerCase().replace(/\s/g, "")
		if (keywordString !== "") {
			keyword = createKnowledgeBaseEntryKeywords({keyword: keywordString})
			if (!this.hasKeyword(keyword)) {
				this.entry.keywords.push(keyword)
			}
		}
	}

	removeKeyword(keyword: KnowledgeBaseEntryKeywords) {
		remove(this.entry.keywords, keyword)
	}

	hasKeyword(currentKeyword: KnowledgeBaseEntryKeywords): boolean {
		return this.entry.keywords.some(keyword => {
			return currentKeyword.keyword === keyword.keyword
		})
	}

	save(): Promise<*> {
		// check for empty content
		if (!this.title()) {
			return Promise.reject(new UserError("emptyTitle_msg"))
		}
		this.entry.title = this.title()
		// keywords are already set
		if (this._descriptionProvider) {
			this.entry.description = this._descriptionProvider()
		}
		if (this.entry._id) {
			return this._entityClient.update(this.entry)
			           .catch(NotFoundError, noOp)
		} else {
			this.entry._ownerGroup = this._templateGroupRoot._id
			return this._entityClient.setup(this._templateGroupRoot.knowledgeBase, this.entry)
		}
	}

	setDescriptionProvider(provider: () => string) {
		this._descriptionProvider = provider
	}

}